import { useState } from "react";
import { mockLeads, mockLeadTimeline } from "@/data/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Upload, X, Eye, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  "in-progress": "bg-primary/20 text-primary",
  replied: "bg-success/20 text-success",
  exhausted: "bg-destructive/20 text-destructive",
  completed: "bg-teal-500/20 text-teal-400",
};

export default function LeadTracker() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const filtered = mockLeads.filter((l) => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-heading font-bold text-2xl text-foreground">Lead Tracker</h1>
        <Button size="sm" variant="secondary" className="font-mono text-xs">
          <Upload className="h-3.5 w-3.5 mr-1" /> Import CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="replied">Replied</SelectItem>
            <SelectItem value="exhausted">Exhausted</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-4">
        {/* Table */}
        <div className="flex-1 glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Email</th>
                  <th className="text-left px-4 py-2 hidden lg:table-cell">Company</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Current Node</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2 hidden lg:table-cell">Retries</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">Last Contacted</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{lead.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lead.email}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{lead.company}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{lead.currentNode}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs font-mono border-0 ${statusStyles[lead.status]}`}>{lead.status}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{lead.retryCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{lead.lastContacted}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setSelectedLead(lead.id === selectedLead ? null : lead.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timeline Panel */}
        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass-card overflow-hidden flex-shrink-0"
            >
              <div className="p-4 w-80">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading font-semibold text-sm text-foreground">FSM History</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLead(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-0">
                  {mockLeadTimeline.map((entry, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-3 w-3 rounded-full border-2 ${entry.status === "active" ? "border-primary bg-primary/30" : "border-success bg-success/30"}`} />
                        {i < mockLeadTimeline.length - 1 && <div className="w-px h-10 bg-border" />}
                      </div>
                      <div className="pb-4">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-medium text-foreground">{entry.node}</p>
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">{entry.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
