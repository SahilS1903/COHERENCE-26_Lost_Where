import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { TrendingUp, Send, MessageSquare, GitBranch, Pause, Play, Trash2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  totalLeads: number;
  messagesSentToday: number;
  replyRate: number;
  activeWorkflows: number;
}

interface WorkflowItem {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  _count: { leads: number };
}

function SparklineBar({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full transition-all"
          style={{ height: `${Math.max(10, (v / max) * 100)}%`, backgroundColor: color, opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

const statusColor: Record<string, string> = {
  ACTIVE: "bg-success/20 text-success border-success/30",
  PAUSED: "bg-warning/20 text-warning border-warning/30",
  COMPLETED: "bg-muted text-muted-foreground border-border",
};

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const res: any = await api.dashboard.stats();
      return {
        totalLeads: res.totalLeads ?? 0,
        messagesSentToday: res.messagesSentToday ?? 0,
        replyRate: res.replyRate ?? 0,
        activeWorkflows: res.activeWorkflows ?? 0,
      };
    },
    refetchInterval: 10000,
  });

  const { data: workflows, isLoading: workflowsLoading } = useQuery<WorkflowItem[]>({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await api.workflows.list();
      return res as WorkflowItem[];
    },
  });

  if (statsLoading || workflowsLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Fallback data if no real stats yet (for sparklines)
  const sparklineFallback = [12, 18, 15, 25, 22, 35, 30];

  const statCards = [
    { label: "Total Leads", value: stats?.totalLeads?.toLocaleString() || "0", data: sparklineFallback, color: "hsl(190, 100%, 50%)", icon: TrendingUp },
    { label: "Sent Today", value: stats?.messagesSentToday?.toString() || "0", data: sparklineFallback, color: "hsl(142, 70%, 45%)", icon: Send },
    { label: "Reply Rate", value: `${stats?.replyRate || "0"}%`, data: sparklineFallback, color: "hsl(40, 100%, 50%)", icon: MessageSquare },
    { label: "Active Workflows", value: stats?.activeWorkflows?.toString() || "0", data: sparklineFallback, color: "hsl(270, 60%, 55%)", icon: GitBranch },
  ];

  const toggleStatus = async (wf: WorkflowItem) => {
    try {
      if (wf.status === "ACTIVE") {
        await api.workflows.deactivate(wf.id);
      } else {
        await api.workflows.activate(wf.id);
      }
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to update workflow status",
      });
    }
  };

  const deleteWorkflow = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow and all associated data?")) return;
    try {
      await api.workflows.remove(id);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast({ title: "Workflow deleted" });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete workflow",
      });
    }
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 animate-fade-in">
      <h1 className="font-heading font-bold text-2xl text-foreground">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="glass-card-hover p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1">{stat.value}</p>
            </div>
            <SparklineBar data={stat.data} color={stat.color} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflows Table */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-heading font-semibold text-sm text-foreground">Recent Workflows</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Leads</th>
                  <th className="text-left px-4 py-2">Created</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workflows?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-muted-foreground text-sm font-mono">
                      No workflows found. Create one to get started.
                    </td>
                  </tr>
                ) : null}
                {workflows?.slice(0, 5).map((wf) => (
                  <tr key={wf.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{wf.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs font-mono ${statusColor[wf.status] || "bg-muted text-muted-foreground"}`}>
                        {wf.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{wf._count?.leads || 0}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDistanceToNow(new Date(wf.createdAt), { addSuffix: true })}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-warning"
                          onClick={() => toggleStatus(wf)}
                        >
                          {wf.status === "ACTIVE" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                           onClick={() => deleteWorkflow(wf.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Feed (Placeholder for real data hooks) */}
        <div className="glass-card overflow-hidden flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-semibold text-foreground">Activity Feed</p>
          <p className="text-xs text-muted-foreground font-mono mt-1 max-w-[200px]">
            Live event feed integration coming soon. Use Outbox Monitor to track exact status.
          </p>
        </div>
      </div>
    </div>
  );
}
