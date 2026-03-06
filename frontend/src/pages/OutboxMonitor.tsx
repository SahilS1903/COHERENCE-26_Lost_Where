import { useState, useEffect } from "react";
import { mockOutbox, mockOutboxStats } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Mail, Linkedin, RotateCcw } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-blue-500/20 text-blue-400",
  sent: "bg-primary/20 text-primary",
  failed: "bg-destructive/20 text-destructive",
  "rate-limited": "bg-warning/20 text-warning",
};

export default function OutboxMonitor() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Pending", value: mockOutboxStats.pending, color: "text-muted-foreground" },
    { label: "Sent Today", value: mockOutboxStats.sentToday, color: "text-primary" },
    { label: "Failed", value: mockOutboxStats.failed, color: "text-destructive" },
    { label: "Rate Limited", value: mockOutboxStats.rateLimited, color: "text-warning" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl text-foreground">Outbox Monitor</h1>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${pulse ? "bg-success animate-pulse" : "bg-success/50"}`} />
          <span className="text-xs font-mono text-muted-foreground">Auto-refresh</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className="text-xs font-mono text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs font-mono text-muted-foreground border-b border-border">
                <th className="text-left px-4 py-2">Lead</th>
                <th className="text-left px-4 py-2">Channel</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Subject</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2 hidden lg:table-cell">Scheduled</th>
                <th className="text-left px-4 py-2 hidden lg:table-cell">Sent</th>
                <th className="text-left px-4 py-2 hidden md:table-cell">Attempts</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockOutbox.map((item) => (
                <tr key={item.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{item.leadName}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs font-mono border-border">
                      {item.channel === "email" ? <Mail className="h-3 w-3 mr-1" /> : <Linkedin className="h-3 w-3 mr-1" />}
                      {item.channel}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px] hidden md:table-cell">{item.subject}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs font-mono border-0 ${statusStyles[item.status]}`}>{item.status}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{item.scheduledAt}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{item.sentAt}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{item.attempts}</td>
                  <td className="px-4 py-3 text-right">
                    {item.status === "failed" && (
                      <Button variant="ghost" size="sm" className="h-7 font-mono text-xs text-warning hover:text-warning">
                        <RotateCcw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    )}
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
