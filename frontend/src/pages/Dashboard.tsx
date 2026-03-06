import { mockStats, mockSparklines, mockWorkflows, mockActivity } from "@/data/mockData";
import { TrendingUp, Send, MessageSquare, GitBranch, Pause, Play, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function SparklineBar({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-full transition-all"
          style={{ height: `${(v / max) * 100}%`, backgroundColor: color, opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

const statCards = [
  { label: "Total Leads", value: mockStats.totalLeads.toLocaleString(), data: mockSparklines.totalLeads, color: "hsl(190, 100%, 50%)", icon: TrendingUp },
  { label: "Sent Today", value: mockStats.sentToday.toString(), data: mockSparklines.sentToday, color: "hsl(142, 70%, 45%)", icon: Send },
  { label: "Reply Rate", value: `${mockStats.replyRate}%`, data: mockSparklines.replyRate, color: "hsl(40, 100%, 50%)", icon: MessageSquare },
  { label: "Active Workflows", value: mockStats.activeWorkflows.toString(), data: mockSparklines.activeWorkflows, color: "hsl(270, 60%, 55%)", icon: GitBranch },
];

const statusColor: Record<string, string> = {
  active: "bg-success/20 text-success border-success/30",
  paused: "bg-warning/20 text-warning border-warning/30",
  completed: "bg-muted text-muted-foreground border-border",
};

export default function Dashboard() {
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
                  <th className="text-left px-4 py-2">Last Active</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockWorkflows.map((wf) => (
                  <tr key={wf.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{wf.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs font-mono ${statusColor[wf.status]}`}>
                        {wf.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{wf.leadCount}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{wf.lastActive}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-warning">
                          {wf.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
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

        {/* Activity Feed */}
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-heading font-semibold text-sm text-foreground">Activity Feed</h3>
          </div>
          <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
            {mockActivity.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                <div className={`h-2 w-2 rounded-full mt-1.5 flex-shrink-0 ${
                  item.type === "reply" ? "bg-success" : item.type === "error" ? "bg-destructive" : "bg-primary"
                }`} />
                <div className="min-w-0">
                  <p className="text-xs text-foreground truncate">{item.message}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
