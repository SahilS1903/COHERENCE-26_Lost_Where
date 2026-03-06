import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { Search, Upload, X, Eye, Loader2, RefreshCw, FileSpreadsheet, FileText, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// Add Lead type definition
interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  status: string;
  retryCount: number;
  currentNode?: { label: string; type: string };
  createdAt: string;
  updatedAt: string;
}

interface WorkflowItem {
  id: string;
  name: string;
}

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-primary/20 text-primary",
  PAUSED: "bg-warning/20 text-warning",
  DONE: "bg-success/20 text-success",
  BOUNCED: "bg-destructive/20 text-destructive",
};

export default function LeadTracker() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("all");
  
  const [importOpen, setImportOpen] = useState(false);
  const [importWorkflowId, setImportWorkflowId] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [textData, setTextData] = useState("");
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, selectedWorkflowId]);

  const { data: workflows } = useQuery<WorkflowItem[]>({
    queryKey: ["workflows"],
    queryFn: async () => {
      const wfs = await api.workflows.list();
      return wfs as WorkflowItem[];
    },
  });

  const { data: leadsData, isLoading } = useQuery<{ leads: Lead[] }>({
    queryKey: ["leads", selectedWorkflowId, statusFilter],
    queryFn: async () => {
      // If a specific workflow is selected, fetch its leads
      if (selectedWorkflowId && selectedWorkflowId !== "all") {
        const res: any = await api.leads.list(selectedWorkflowId, { status: statusFilter !== "all" ? statusFilter : undefined });
        return { leads: (res.leads || []) as Lead[] };
      }
      
      // If "all" is selected, we need to fetch leads for all workflows and combine them
      if (!workflows) return { leads: [] };
      const allProms = workflows.map((wf) => 
        api.leads.list(wf.id, { status: statusFilter !== "all" ? statusFilter : undefined })
      );
      const results = await Promise.all(allProms);
      const allLeads: Lead[] = results.flatMap((r: any) => r.leads || []);
      // Sort desc
      allLeads.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { leads: allLeads };
    },
    enabled: !!workflows,
  });

  const { data: leadHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["lead-history", selectedLead],
    queryFn: () => api.leads.history(selectedLead!),
    enabled: !!selectedLead,
  });

  // Handle file selection and preview
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setShowAllColumns(false); // Reset column view
    
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let parsed: any[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            parsed = results.data as any[];
            setPreviewData(parsed.slice(0, 5)); // Show first 5 rows
          }
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        parsed = XLSX.utils.sheet_to_json(sheet);
        setPreviewData(parsed.slice(0, 5)); // Show first 5 rows
      } else {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a CSV or Excel file" });
        setSelectedFile(null);
        setShowAllColumns(false);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Parse Error", description: "Failed to parse file" });
      setSelectedFile(null);
      setPreviewData([]);
      setShowAllColumns(false);
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importWorkflowId) throw new Error("Select a workflow first");
      
      if (uploadMode === "file" && selectedFile) {
        // Use FormData to upload the file
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const token = localStorage.getItem('auth_token');
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
        const response = await fetch(
          `${baseUrl}/workflows/${importWorkflowId}/leads/upload-file`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          }
        );
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }
        
        return response.json();
      } else if (uploadMode === "text" && textData) {
        // Parse text data (JSON or CSV)
        let parsed;
        try {
          parsed = JSON.parse(textData);
        } catch (e) {
          // Fallback to simple CSV parsing
          const lines = textData.split("\n").filter(Boolean);
          parsed = lines.map((line: string) => {
            const [email, firstName, lastName, company] = line.split(",").map((s: string) => s.trim());
            return { email, firstName, lastName, company };
          });
        }

        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid data format");
        return api.leads.import(importWorkflowId, { leads: parsed });
      }
      
      throw new Error("No data to import");
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "✅ Import Successful", 
        description: `Imported ${data.imported} leads successfully`
      });
      setImportOpen(false);
      setSelectedFile(null);
      setPreviewData([]);
      setTextData("");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: any) => {
      toast({ 
        variant: "destructive", 
        title: "Import Failed", 
        description: err.message 
      });
    }
  });

  const leads: Lead[] = leadsData?.leads || [];
  
  const filtered = leads.filter((l) => {
    const matchSearch = !search || 
      (l.firstName || "").toLowerCase().includes(search.toLowerCase()) || 
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // Reset to page 1 when filters change
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLeads = filtered.slice(startIndex, endIndex);

  // Reset to page 1 if current page exceeds total pages
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  return (
    <div className="p-4 lg:p-6 space-y-4 animate-fade-in flex flex-col h-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="font-heading font-bold text-2xl text-foreground">Lead Tracker</h1>
        
        <Dialog open={importOpen} onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setShowAllColumns(false);
            setPreviewData([]);
            setSelectedFile(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary" className="font-mono text-xs">
              <Upload className="h-3.5 w-3.5 mr-1" /> Import Leads
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Import Leads</DialogTitle>
              <DialogDescription>Upload a CSV or Excel file with lead data, or paste it directly</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              {/* Workflow Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Target Workflow</label>
                <Select value={importWorkflowId} onValueChange={setImportWorkflowId}>
                  <SelectTrigger><SelectValue placeholder="Select workflow..." /></SelectTrigger>
                  <SelectContent>
                    {workflows?.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Mode Toggle */}
              <div className="flex gap-2 p-1 bg-secondary rounded-lg">
                <button
                  onClick={() => setUploadMode("file")}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === "file" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4 inline mr-2" />
                  Upload File
                </button>
                <button
                  onClick={() => setUploadMode("text")}
                  className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    uploadMode === "text" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Paste Data
                </button>
              </div>

              {/* File Upload Mode */}
              {uploadMode === "file" && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {selectedFile ? (
                      <div className="space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto" />
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewData([]);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">Click to upload CSV or Excel file</p>
                        <p className="text-xs text-muted-foreground">
                          Supported formats: .csv, .xlsx, .xls (Max 10MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  {previewData.length > 0 && (() => {
                    const allColumns = Object.keys(previewData[0] || {});
                    const essentialColumns = ['email', 'firstName', 'first_name', 'lastname', 'last_name', 'company', 'phone', 'status'];
                    const displayColumns = showAllColumns 
                      ? allColumns 
                      : allColumns.filter(col => 
                          essentialColumns.some(essential => 
                            col.toLowerCase().includes(essential.toLowerCase())
                          )
                        ).slice(0, 6); // Limit to 6 essential columns
                    
                    // Fallback: if no essential columns found, show first 6
                    const columnsToShow = displayColumns.length > 0 ? displayColumns : allColumns.slice(0, 6);
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Preview (first 5 rows)</label>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {allColumns.length} columns detected
                            </Badge>
                            {allColumns.length > 6 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllColumns(!showAllColumns)}
                                className="h-7 text-xs"
                              >
                                {showAllColumns ? 'Show less' : 'Show all columns'}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden max-w-full">
                          <div className="overflow-x-auto max-h-64 overflow-y-auto">
                            <table className="text-xs border-collapse min-w-full">
                              <thead className="bg-secondary sticky top-0 z-10">
                                <tr>
                                  {columnsToShow.map((key) => (
                                    <th key={key} className="px-3 py-2 text-left font-medium whitespace-nowrap min-w-[100px] border-b border-border">
                                      {key}
                                    </th>
                                  ))}
                                  {!showAllColumns && columnsToShow.length < allColumns.length && (
                                    <th className="px-3 py-2 text-left font-medium whitespace-nowrap border-b border-border text-muted-foreground">
                                      +{allColumns.length - columnsToShow.length} more
                                    </th>
                                  )}
                                </tr>
                              </thead>
                              <tbody>
                                {previewData.map((row, i) => (
                                  <tr key={i} className="border-t border-border hover:bg-secondary/30">
                                    {columnsToShow.map((key) => (
                                      <td key={key} className="px-3 py-2 whitespace-nowrap min-w-[100px]">
                                        {String(row[key] || '')}
                                      </td>
                                    ))}
                                    {!showAllColumns && columnsToShow.length < allColumns.length && (
                                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                        •••
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                          <p>
                            📊 Showing {previewData.length} rows {!showAllColumns && columnsToShow.length < allColumns.length && `• ${columnsToShow.length} of ${allColumns.length} columns`}
                          </p>
                          <p className="text-right">
                            Required: email, firstName • Optional: lastName, company
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Text Mode */}
              {uploadMode === "text" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paste Data (JSON array or CSV)</label>
                  <div className="text-xs text-muted-foreground mb-2">
                    CSV format: email,firstName,lastName,company (one per line)
                  </div>
                  <Textarea 
                    placeholder="john@example.com,John,Doe,Acme Corp&#10;jane@example.com,Jane,Smith,Tech Inc"
                    className="min-h-[200px] font-mono text-xs"
                    value={textData}
                    onChange={e => setTextData(e.target.value)}
                  />
                </div>
              )}
            </div>

              {/* Import Button - Outside scrollable area */}
              <div className="border-t pt-4 pb-2 px-6 -mx-6">
              <Button 
                onClick={() => importMutation.mutate()} 
                disabled={
                  importMutation.isPending || 
                  !importWorkflowId || 
                  (uploadMode === "file" && !selectedFile) ||
                  (uploadMode === "text" && !textData)
                }
                className="w-full"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Leads
                  </>
                )}
              </Button>
              </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border" />
        </div>
        
        <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
          <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="All Workflows" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workflows</SelectItem>
            {workflows?.map((wf) => (
               <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
            <SelectItem value="BOUNCED">Bounced</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}>
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden min-h-0">
        {/* Table */}
        <div className="flex-1 glass-card overflow-hidden flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1 h-full">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card/90 backdrop-blur z-10">
                <tr className="text-xs font-mono text-muted-foreground border-b border-border">
                  <th className="text-left px-4 py-3">Name</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Company</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Current Node</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Retries</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Last Active</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                     <td colSpan={8} className="text-center py-8 text-muted-foreground font-mono text-sm">No leads found.</td>
                  </tr>
                ) : null}
                
                {paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{lead.firstName} {lead.lastName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{lead.email}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{lead.company || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">
                      {lead.currentNode?.label || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[10px] font-mono border-0 ${statusStyles[lead.status] || "bg-muted text-muted-foreground"}`}>
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{lead.retryCount}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className={`h-7 w-7 ${selectedLead === lead.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary"}`} onClick={() => setSelectedLead(lead.id === selectedLead ? null : lead.id)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, filtered.length)} of {filtered.length}
                </span>
                <Select value={String(itemsPerPage)} onValueChange={(val) => { setItemsPerPage(Number(val)); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(currentPage - 1); }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                    const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2);
                    
                    if (showEllipsis) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    
                    if (!showPage) return null;
                    
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (currentPage < totalPages) setCurrentPage(currentPage + 1); }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>

        {/* Timeline Panel */}
        <AnimatePresence>
          {selectedLead && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="glass-card overflow-hidden flex-shrink-0 flex flex-col min-h-0 h-full"
            >
              <div className="flex flex-col h-full w-80">
                <div className="p-4 flex items-center justify-between border-b border-border">
                  <h3 className="font-heading font-semibold text-sm text-foreground">FSM History</h3>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedLead(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-0">
                  {historyLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : (leadHistory as any[])?.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground font-mono">No history yet.</div>
                  ) : (
                    (leadHistory as any[])?.map((entry: any, i: number) => {
                      const isLast = i === (leadHistory as any[]).length - 1;
                      return (
                        <div key={entry.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`h-3 w-3 rounded-full border-2 ${isLast ? "border-primary bg-primary/30" : "border-muted-foreground bg-muted"}`} />
                            {!isLast && <div className="w-px h-12 bg-border my-1" />}
                          </div>
                          <div className="pb-4 pt-0">
                            <div className="flex items-center gap-1">
                              <p className="text-xs font-medium text-foreground">{entry.node.label} <span className="text-muted-foreground font-mono">({entry.node.type})</span></p>
                            </div>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                               {new Date(entry.transitionedAt).toLocaleString()}
                            </p>
                            {/* If there's metadata / condition result */}
                            {entry.metadata?.condition && (
                                <Badge variant="outline" className="mt-1 text-[10px] font-mono py-0 h-4">
                                  → {entry.metadata.condition}
                                </Badge>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
