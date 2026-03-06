import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Mail, Linkedin, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// Add OutboxItem type definition
interface OutboxItem {
  id: string;
  lead?: { firstName: string; lastName: string; email: string };
  channel: string;
  subject: string;
  status: string;
  scheduledAt?: string;
  sentAt?: string;
  attemptCount: number;
  errorMessage?: string;
}

const statusStyles: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  SCHEDULED: "bg-blue-500/20 text-blue-400",
  SENT: "bg-success/20 text-success",
  FAILED: "bg-destructive/20 text-destructive",
};

export default function OutboxMonitor() {
  const [pulse, setPulse] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: outboxData, isLoading, refetch } = useQuery<{ items: OutboxItem[] }>({
    queryKey: ["outbox", statusFilter],
    queryFn: async () => {
       const res: any = await api.outbox.list({ 
         status: statusFilter !== "all" ? statusFilter : undefined 
       });
       return { items: (res.items || []) as OutboxItem[] };
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const items: OutboxItem[] = outboxData?.items || [];
  
  // Calculate stats from the current fetched view (in a real app, you might have a dedicated /outbox/stats endpoint)
  const stats = {
    pending: items.filter((i) => i.status === "PENDING" || i.status === "SCHEDULED").length,
    sentToday: items.filter((i) => i.status === "SENT").length, // Simplification for demo
    failed: items.filter((i) => i.status === "FAILED").length,
  };

  const statCards = [
    { label: "Pending/Scheduled", value: stats.pending, color: "text-muted-foreground" },
    { label: "Sent (Recent)", value: stats.sentToday, color: "text-success" },
    { label: "Failed", value: stats.failed, color: "text-destructive" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-heading font-bold text-2xl text-foreground">Outbox Monitor</h1>
        
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SCHEDULED">Scheduled</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${pulse ? "bg-success animate-pulse" : "bg-success/50"}`} />
            <span className="text-xs font-mono text-muted-foreground hidden sm:inline">Auto-refresh (10s)</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-xs font-mono text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto flex-1 h-full">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card/90 backdrop-blur z-10">
              <tr className="text-xs font-mono text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-3">Lead</th>
                <th className="text-left px-4 py-3">Channel</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Subject</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Scheduled</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Sent</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Attempts</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Error</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                   <td colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                   <td colSpan={8} className="text-center py-8 text-muted-foreground font-mono text-sm">Outbox is empty.</td>
                </tr>
              ) : null}

              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {item.lead?.firstName} {item.lead?.lastName || ""}
                    <div className="text-[10px] font-mono text-muted-foreground">{item.lead?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] font-mono border-border uppercase">
                      {item.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <Linkedin className="h-3 w-3 mr-1" />}
                      {item.channel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px] hidden md:table-cell" title={item.subject}>{item.subject}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-[10px] font-mono border-0 ${statusStyles[item.status] || "bg-muted"}`}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">
                     {item.sentAt ? new Date(item.sentAt).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{item.attemptCount}</td>
                  <td className="px-4 py-3 text-xs text-destructive hidden md:table-cell max-w-[200px] truncate" title={item.errorMessage}>
                    {item.errorMessage || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
