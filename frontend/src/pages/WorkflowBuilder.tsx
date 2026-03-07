import { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Handle,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Save, Play, Pause, LayoutGrid, X, Upload, Sparkles, Send, Clock, MessageSquareReply, GitFork, CircleStop, GripVertical, Loader2, Mail, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { EmailConfigDialog } from "@/components/EmailConfigDialog";

const nodeTypeConfig = {
  importLeads: { label: "Import Leads", icon: Upload, color: "var(--node-purple)", hsl: "hsl(270, 60%, 55%)" },
  aiGenerate: { label: "AI Generate", icon: Sparkles, color: "var(--node-blue)", hsl: "hsl(190, 100%, 50%)" },
  sendMessage: { label: "Send Message", icon: Send, color: "var(--node-green)", hsl: "hsl(142, 70%, 45%)" },
  waitDelay: { label: "Wait / Delay", icon: Clock, color: "var(--node-amber)", hsl: "hsl(40, 100%, 50%)" },
  checkReply: { label: "Check Reply", icon: MessageSquareReply, color: "var(--node-orange)", hsl: "hsl(25, 95%, 53%)" },
  condition: { label: "Condition", icon: GitFork, color: "var(--node-pink)", hsl: "hsl(330, 80%, 60%)" },
  end: { label: "End", icon: CircleStop, color: "var(--node-red)", hsl: "hsl(0, 72%, 51%)" },
};

type NodeTypeKey = keyof typeof nodeTypeConfig;

function WorkflowNode({ data, selected }: { data: { type: NodeTypeKey; label: string; config?: any }; selected: boolean }) {
  const config = nodeTypeConfig[data.type];
  const Icon = config.icon;
  
  // Check if AI Generate node is configured
  const isAiConfigured = data.type === 'aiGenerate' && data.config && (data.config.goal || data.config.product);
  
  return (
    <div
      className={`glass-card px-4 py-3 min-w-[160px] cursor-pointer transition-all ${selected ? "ring-1 ring-primary" : ""}`}
      style={{ borderTop: `3px solid ${config.hsl}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: config.hsl }} />
        <span className="font-mono text-xs text-foreground">{data.label}</span>
        {isAiConfigured && (
          <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" title="Configured" />
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2 !border-0" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  workflowNode: WorkflowNode,
};

// Start with empty canvas - users can drag nodes from the palette
const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const paletteItems: { type: NodeTypeKey; label: string }[] = [
  { type: "importLeads", label: "Import Leads" },
  { type: "aiGenerate", label: "AI Generate" },
  { type: "sendMessage", label: "Send Message" },
  { type: "waitDelay", label: "Wait / Delay" },
  { type: "checkReply", label: "Check Reply" },
  { type: "condition", label: "Condition" },
  { type: "end", label: "End" },
];

export default function WorkflowBuilder() {
  const { id: workflowId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [emailConfigOpen, setEmailConfigOpen] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [conditionLabel, setConditionLabel] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const idCounter = useRef(1); // Start from 1 for empty canvas
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch all workflows for the selector dropdown
  const { data: workflows } = useQuery<any[]>({
    queryKey: ["workflows"],
    queryFn: async () => {
      return await api.workflows.list();
    },
  });

  // Auto-redirect to latest workflow when visiting /workflows/new
  // Unless user explicitly wants a blank canvas (?blank=true)
  useEffect(() => {
    const wantsBlank = searchParams.get('blank') === 'true';
    
    if (!workflowId && workflows && workflows.length > 0 && !wantsBlank) {
      // Sort by updatedAt descending to get the most recently modified workflow
      const sortedWorkflows = [...workflows].sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      const latestWorkflow = sortedWorkflows[0];
      console.log('🔀 Auto-redirecting to latest workflow:', latestWorkflow.name, latestWorkflow.id);
      navigate(`/workflows/${latestWorkflow.id}`, { replace: true });
    }
  }, [workflows, workflowId, navigate, searchParams]);

  // Load existing workflow if editing
  useEffect(() => {
    console.log('🔄 useEffect triggered, workflowId:', workflowId);
    if (workflowId) {
      loadWorkflow(workflowId);
    } else {
      // Reset to empty canvas for new workflow
      console.log('🆕 Resetting to empty canvas');
      setNodes([]);
      setEdges([]);
      setWorkflowName("");
      setWorkflowDescription("");
      setIsActive(true);
      idCounter.current = 1;
    }
  }, [workflowId]);

  const loadWorkflow = async (id: string) => {
    setLoading(true);
    try {
      console.log('🔄 Loading workflow:', id);
      const workflow: any = await api.workflows.get(id);
      console.log('✅ Workflow loaded:', workflow);
      
      // Set workflow metadata
      setWorkflowName(workflow.name);
      setWorkflowDescription(workflow.description || "");
      setIsActive(workflow.status === "ACTIVE");

      // Map backend node types to frontend types
      const backendToFrontendType: Record<string, NodeTypeKey> = {
        IMPORT_LEADS: 'importLeads',
        AI_GENERATE: 'aiGenerate',
        SEND_MESSAGE: 'sendMessage',
        WAIT: 'waitDelay',
        CHECK_REPLY: 'checkReply',
        CONDITION: 'condition',
        END: 'end',
      };

      // Convert backend nodes to ReactFlow nodes
      const loadedNodes: Node[] = (workflow.nodes || []).map((node: any) => ({
        id: node.id,
        type: 'workflowNode',
        position: { x: node.positionX || 0, y: node.positionY || 0 },
        data: {
          type: backendToFrontendType[node.type] || 'end',
          label: node.label,
          config: node.config || {},
        },
      }));

      // Convert backend edges to ReactFlow edges
      const loadedEdges: Edge[] = (workflow.edges || []).map((edge: any) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" },
        style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 },
        data: edge.conditionLabel ? { conditionLabel: edge.conditionLabel } : undefined,
      }));

      console.log('📦 Loaded nodes:', loadedNodes.length, 'edges:', loadedEdges.length);
      
      setNodes(loadedNodes);
      setEdges(loadedEdges);

      // Update idCounter to avoid conflicts with existing nodes
      const maxId = loadedNodes.reduce((max, node) => {
        const numId = parseInt(node.id);
        return isNaN(numId) ? max : Math.max(max, numId);
      }, 0);
      idCounter.current = maxId + 1;
      
      console.log('✅ Workflow loaded successfully');

      toast({
        title: "✅ Workflow Loaded",
        description: `"${workflow.name}" loaded successfully`,
      });
    } catch (error: any) {
      console.error('❌ Load workflow error:', error);
      toast({
        variant: "destructive",
        title: "Load Failed",
        description: error.message || "Failed to load workflow",
      });
      navigate("/workflows/new?blank=true");
    } finally {
      setLoading(false);
    }
  };

  // Map frontend node types to backend enum values
  const mapNodeTypeToBackend = (type: NodeTypeKey): string => {
    const typeMap: Record<NodeTypeKey, string> = {
      importLeads: 'IMPORT_LEADS',
      aiGenerate: 'AI_GENERATE',
      sendMessage: 'SEND_MESSAGE',
      waitDelay: 'WAIT',
      checkReply: 'CHECK_REPLY',
      condition: 'CONDITION',
      end: 'END',
    };
    return typeMap[type] || type.toUpperCase();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!workflowName.trim()) {
        throw new Error("Workflow name is required");
      }

      console.log('💾 Saving workflow... workflowId:', workflowId, 'nodes:', nodes.length, 'edges:', edges.length);

      // Build the serialised graph using a local temp-id for each node so that
      // edges can reference nodes before the backend has assigned real ids.
      const serialisedNodes = nodes.map((node) => ({
        tempId: node.id,
        type: mapNodeTypeToBackend(node.data.type),
        label: node.data.label,
        config: node.data.config || {},
        positionX: node.position.x,
        positionY: node.position.y,
      }));

      const serialisedEdges = edges.map((edge) => ({
        sourceTempId: edge.source,
        targetTempId: edge.target,
        conditionLabel: edge.data?.conditionLabel || null,
      }));

      let workflow;

      if (workflowId) {
        // Atomically replace the entire graph on the server
        console.log('📝 Replacing graph for existing workflow');
        workflow = await api.workflows.replaceGraph(workflowId, {
          name: workflowName.trim(),
          description: workflowDescription.trim() || undefined,
          nodes: serialisedNodes,
          edges: serialisedEdges,
        });
      } else {
        // Create a new workflow then populate its graph
        console.log('✨ Creating new workflow');
        workflow = await api.workflows.create({
          name: workflowName.trim(),
          description: workflowDescription.trim() || undefined,
        });
        console.log('✅ Workflow created:', workflow.id);

        // Use replaceGraph so the same code path handles node/edge creation
        await api.workflows.replaceGraph(workflow.id, {
          nodes: serialisedNodes,
          edges: serialisedEdges,
        });
        console.log('✅ Nodes and edges created successfully');
      }

      console.log('✅ Save complete, returning workflow:', workflow.id);
      return workflow;
    },
    onSuccess: (workflow) => {
      console.log('🎉 Save success! Workflow:', workflow.id, 'Current workflowId:', workflowId);
      toast({
        title: "✅ Workflow Saved",
        description: `"${workflow.name}" has been saved successfully!`,
      });
      setSaveDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      
      // Navigate to edit URL so reloading shows the saved workflow
      if (!workflowId) {
        console.log('🚀 Navigating to /workflows/' + workflow.id);
        navigate(`/workflows/${workflow.id}`, { replace: true });
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save workflow",
      });
    },
  });

  const buildEdge = useCallback((params: Connection, label?: string) => {
    const edgeStyle = { animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } };
    const extra = label ? { data: { conditionLabel: label }, label, labelStyle: { fill: 'hsl(40,100%,60%)', fontFamily: 'monospace', fontSize: 10 }, labelBgStyle: { fill: 'hsl(220,20%,12%)', fillOpacity: 0.9 } } : {};
    return { ...params, ...edgeStyle, ...extra };
  }, []);

  const onConnect = useCallback((params: Connection) => {
    // If connecting FROM a checkReply node, ask for condition label
    const sourceNode = nodes.find(n => n.id === params.source);
    if (sourceNode?.data?.type === 'checkReply') {
      setPendingConnection(params);
      setConditionLabel('');
      setConditionDialogOpen(true);
      return;
    }
    setEdges((eds) => addEdge(buildEdge(params), eds));
  }, [setEdges, nodes, buildEdge]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNode(null), []);

  const onDragStart = (event: React.DragEvent, type: NodeTypeKey, label: string) => {
    event.dataTransfer.setData("application/reactflow-type", type);
    event.dataTransfer.setData("application/reactflow-label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow-type") as NodeTypeKey;
      const label = event.dataTransfer.getData("application/reactflow-label");
      if (!type) return;

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = { x: event.clientX - bounds.left - 80, y: event.clientY - bounds.top - 20 };
      const newNode: Node = {
        id: String(idCounter.current++),
        type: "workflowNode",
        position,
        data: { type, label },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const deleteNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const duplicateNode = () => {
    if (!selectedNode) return;
    const newNode: Node = {
      id: String(idCounter.current++),
      type: "workflowNode",
      position: { x: selectedNode.position.x + 30, y: selectedNode.position.y + 30 },
      data: { ...selectedNode.data },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config: { ...node.data.config, ...config } } }
          : node
      )
    );
  };

  // Show loading spinner while loading workflow
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Loading workflow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] animate-fade-in">
      {/* Left Palette */}
      <div className="w-56 border-r border-border bg-card/50 p-3 flex flex-col gap-2 overflow-y-auto flex-shrink-0">
        <h3 className="font-heading font-semibold text-sm text-foreground mb-2">Node Palette</h3>
        {paletteItems.map((item) => {
          const config = nodeTypeConfig[item.type];
          const Icon = config.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type, item.label)}
              className="glass-card-hover px-3 py-2.5 flex items-center gap-2 cursor-grab active:cursor-grabbing"
              style={{ borderLeft: `3px solid ${config.hsl}` }}
            >
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <Icon className="h-4 w-4" style={{ color: config.hsl }} />
              <span className="font-mono text-xs text-foreground">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {/* Toolbar */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
          <div className="flex gap-2 items-center">
            {/* Workflow Selector */}
            <Select
              value={workflowId || "new"}
              onValueChange={(value) => {
                if (value === "new") {
                  navigate("/workflows/new?blank=true");
                } else {
                  navigate(`/workflows/${value}`);
                }
              }}
            >
              <SelectTrigger className="w-[250px] bg-card border-border">
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <span className="font-semibold">➕ New Workflow</span>
                </SelectItem>
                {workflows && workflows.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                      Your Workflows
                    </div>
                    {workflows.map((wf: any) => (
                      <SelectItem key={wf.id} value={wf.id}>
                        <div className="flex items-center gap-2">
                          <span>{wf.name}</span>
                          {wf.status === "ACTIVE" && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 bg-success/20 text-success border-success/30">
                              ACTIVE
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            
            <Button size="sm" variant="secondary" className="font-mono text-xs" onClick={() => setSaveDialogOpen(true)}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="secondary" className="font-mono text-xs" onClick={() => setEmailConfigOpen(true)}>
              <Mail className="h-3.5 w-3.5 mr-1" /> Email Settings
            </Button>
            <Button
              size="sm"
              variant={isActive ? "default" : "secondary"}
              className={`font-mono text-xs ${isActive ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={async () => {
                if (!workflowId) { toast({ title: 'Save first', description: 'Save the workflow before activating it.' }); return; }
                try {
                  isActive ? await api.workflows.deactivate(workflowId) : await api.workflows.activate(workflowId);
                  setIsActive(!isActive);
                  toast({ title: isActive ? '⏸ Workflow Paused' : '▶ Workflow Activated' });
                  queryClient.invalidateQueries({ queryKey: ['workflows'] });
                } catch (e: any) { toast({ variant: 'destructive', title: 'Failed', description: e.message }); }
              }}
            >
              {isActive ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              {isActive ? "Pause" : "Activate"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="font-mono text-xs">
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Auto-layout
            </Button>
            <Badge variant="outline" className={`font-mono text-xs ${isActive ? "border-success/50 text-success" : "border-warning/50 text-warning"}`}>
              {isActive ? "● ACTIVE" : "◯ PAUSED"}
            </Badge>
          </div>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-background"
        >
          <Background color="hsl(220, 20%, 18%)" gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={() => "hsl(190, 100%, 50%)"}
            maskColor="rgba(10, 10, 15, 0.8)"
          />
        </ReactFlow>
      </div>

      {/* Right Config Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-80 border-l border-border bg-card/80 backdrop-blur-sm p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-semibold text-sm text-foreground">Configure Node</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedNode(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-mono text-muted-foreground">Node Type</Label>
                <p className="text-sm text-foreground font-medium">{nodeTypeConfig[selectedNode.data.type as NodeTypeKey]?.label}</p>
              </div>

              {selectedNode.data.type === "importLeads" && (
                <div className="space-y-3">
                  <div className="bg-muted/50 p-3 rounded-md border border-border">
                    <p className="text-xs text-muted-foreground">
                      📁 Import leads from CSV or Excel files. You can upload contact lists with custom fields.
                    </p>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => navigate('/leads')}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Go to Lead Import Page
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Tip:</strong> Your CSV should include columns like:</p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>email (required)</li>
                      <li>name, company, title</li>
                      <li>Any custom fields</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedNode.data.type === "waitDelay" && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      key={`${selectedNode.id}-${selectedNode.data.config?._unit || 'minutes'}`}
                      type="number"
                      min={1}
                      defaultValue={(() => {
                        const ms = selectedNode.data.config?.durationMs;
                        if (!ms) return '';
                        const unit = selectedNode.data.config?._unit || 'minutes';
                        if (unit === 'minutes') return ms / 60000;
                        if (unit === 'days') return ms / 86400000;
                        return ms / 3600000;
                      })()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val <= 0) return;
                        const unit = selectedNode.data.config?._unit || 'minutes';
                        const ms = unit === 'minutes' ? val * 60000 : unit === 'days' ? val * 86400000 : val * 3600000;
                        updateNodeConfig(selectedNode.id, { durationMs: ms, _unit: unit });
                      }}
                      className="bg-secondary border-border"
                    />
                    <Select
                      value={selectedNode.data.config?._unit || 'minutes'}
                      onValueChange={(unit) => {
                        const ms = selectedNode.data.config?.durationMs || 0;
                        const prevUnit = selectedNode.data.config?._unit || 'minutes';
                        const prevVal = prevUnit === 'minutes' ? ms / 60000 : prevUnit === 'days' ? ms / 86400000 : ms / 3600000;
                        const newMs = unit === 'minutes' ? prevVal * 60000 : unit === 'days' ? prevVal * 86400000 : prevVal * 3600000;
                        updateNodeConfig(selectedNode.id, { durationMs: newMs, _unit: unit });
                      }}
                    >
                      <SelectTrigger className="w-28 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedNode.data.config?.durationMs > 0 && (
                    <p className="text-xs text-muted-foreground font-mono">= {(selectedNode.data.config.durationMs / 60000).toFixed(1)} min ({selectedNode.data.config.durationMs}ms)</p>
                  )}
                </div>
              )}

              {selectedNode.data.type === "aiGenerate" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Campaign Goal</Label>
                    <Input
                      placeholder="e.g., Schedule a discovery call"
                      value={selectedNode.data.config?.goal || ''}
                      onChange={(e) => updateNodeConfig(selectedNode.id, { goal: e.target.value })}
                      className="bg-secondary border-border text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Product/Service</Label>
                    <Input
                      placeholder="What are you selling?"
                      value={selectedNode.data.config?.product || ''}
                      onChange={(e) => updateNodeConfig(selectedNode.id, { product: e.target.value })}
                      className="bg-secondary border-border text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Tone</Label>
                    <Select 
                      value={selectedNode.data.config?.tone || 'professional'}
                      onValueChange={(value) => updateNodeConfig(selectedNode.id, { tone: value })}
                    >
                      <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-mono text-muted-foreground">Sender Name</Label>
                      <Input
                        placeholder="Your name"
                        value={selectedNode.data.config?.senderName || ''}
                        onChange={(e) => updateNodeConfig(selectedNode.id, { senderName: e.target.value })}
                        className="bg-secondary border-border text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-mono text-muted-foreground">Sender Company</Label>
                      <Input
                        placeholder="Your company"
                        value={selectedNode.data.config?.senderCompany || ''}
                        onChange={(e) => updateNodeConfig(selectedNode.id, { senderCompany: e.target.value })}
                        className="bg-secondary border-border text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Additional Instructions (Optional)</Label>
                    <Textarea 
                      placeholder="Any specific instructions for the AI...\ne.g., 'Mention our recent Series B funding' or 'Keep it under 100 words'"
                      value={selectedNode.data.config?.additionalInstructions || ''}
                      onChange={(e) => updateNodeConfig(selectedNode.id, { additionalInstructions: e.target.value })}
                      className="bg-secondary border-border min-h-[80px] text-xs" 
                    />
                  </div>

                  <div className="bg-muted/50 p-3 rounded-md border border-border">
                    <p className="text-xs text-muted-foreground">
                      💡 The AI will use lead data (name, company, custom fields) to create personalized messages. Configure the tone and context above.
                    </p>
                  </div>
                </div>
              )}

              {selectedNode.data.type === "sendMessage" && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Channel</Label>
                  <Select defaultValue="email">
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs font-mono text-muted-foreground">Fallback Template</Label>
                  <Textarea defaultValue="Hi {{first_name}}, I wanted to reach out..." className="bg-secondary border-border min-h-[80px] text-xs font-mono" />
                </div>
              )}

              {selectedNode.data.type === "condition" && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Branch Labels</Label>
                  <Input defaultValue="Replied" className="bg-secondary border-border" placeholder="True branch" />
                  <Input defaultValue="No Reply" className="bg-secondary border-border" placeholder="False branch" />
                </div>
              )}

              {selectedNode.data.type === "end" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-mono text-muted-foreground">Custom Label (Optional)</Label>
                    <Input
                      placeholder="e.g., End (Replied), End (No Reply), Complete"
                      value={selectedNode.data.label || ''}
                      onChange={(e) => {
                        setNodes((nds) =>
                          nds.map((node) =>
                            node.id === selectedNode.id
                              ? { ...node, data: { ...node.data, label: e.target.value || 'End' } }
                              : node
                          )
                        );
                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: e.target.value || 'End' } });
                      }}
                      className="bg-secondary border-border text-xs"
                    />
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md border border-border">
                    <p className="text-xs text-muted-foreground">
                      🏁 Use custom labels to differentiate multiple end nodes:
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5 text-xs text-muted-foreground mt-2">
                      <li><strong>End (Replied)</strong> - When lead responds</li>
                      <li><strong>End (No Reply)</strong> - When lead doesn't respond</li>
                      <li><strong>End (Unsubscribe)</strong> - When lead opts out</li>
                    </ul>
                  </div>
                </div>
              )}

              {selectedNode.data.type === "checkReply" && (
                <div className="space-y-3">
                  <div className="bg-muted/50 p-3 rounded-md border border-border">
                    <p className="text-xs text-muted-foreground">
                      📨 Checks if the lead has replied to any previous email in this workflow via IMAP.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>How it works:</strong></p>
                    <ul className="list-disc list-inside ml-2 space-y-0.5">
                      <li>Monitors your inbox every 60 seconds</li>
                      <li>Matches replies using Message-ID tracking</li>
                      <li>Routes to different paths based on reply status</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto flex gap-2 pt-4 border-t border-border">
              <Button variant="secondary" size="sm" className="flex-1 font-mono text-xs" onClick={duplicateNode}>
                Duplicate
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 font-mono text-xs" onClick={deleteNode}>
                Delete
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Condition Label Dialog — appears when drawing an edge from CHECK_REPLY */}
      <Dialog open={conditionDialogOpen} onOpenChange={setConditionDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Set Branch Condition</DialogTitle>
            <DialogDescription>
              Choose what condition this edge represents from the Check Reply node.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button className="w-full" variant="outline"
              onClick={() => {
                if (pendingConnection) setEdges(eds => addEdge(buildEdge(pendingConnection, 'replied'), eds));
                setConditionDialogOpen(false); setPendingConnection(null);
              }}>
              ✅ replied — lead responded to the email
            </Button>
            <Button className="w-full" variant="outline"
              onClick={() => {
                if (pendingConnection) setEdges(eds => addEdge(buildEdge(pendingConnection, 'no_reply'), eds));
                setConditionDialogOpen(false); setPendingConnection(null);
              }}>
              ❌ no_reply — lead did not respond
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="custom label..."
                value={conditionLabel}
                onChange={e => setConditionLabel(e.target.value)}
                className="bg-secondary border-border text-xs"
              />
              <Button onClick={() => {
                if (pendingConnection && conditionLabel.trim()) setEdges(eds => addEdge(buildEdge(pendingConnection, conditionLabel.trim()), eds));
                setConditionDialogOpen(false); setPendingConnection(null);
              }} disabled={!conditionLabel.trim()}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Configuration Dialog */}
      <EmailConfigDialog
        open={emailConfigOpen}
        onOpenChange={setEmailConfigOpen}
        onConfigured={() => {
          toast({
            title: "✅ Email Configured",
            description: "Your email settings are ready. You can now send workflow emails.",
          });
        }}
      />

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{workflowId ? "Update Workflow" : "Save Workflow"}</DialogTitle>
            <DialogDescription>
              {workflowId 
                ? "Update your workflow name and description." 
                : "Give your workflow a name to save it and start importing leads."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="workflow-name">Workflow Name *</Label>
              <Input
                id="workflow-name"
                placeholder="e.g., Sales Outreach Campaign"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-description">Description (Optional)</Label>
              <Textarea
                id="workflow-description"
                placeholder="Describe what this workflow does..."
                value={workflowDescription}
                onChange={(e) => setWorkflowDescription(e.target.value)}
                className="bg-secondary border-border min-h-[100px]"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              This workflow has {nodes.length} nodes and {edges.length} connections.
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !workflowName.trim()}
              className="w-full"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {workflowId ? "Updating..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {workflowId ? "Update Workflow" : "Save Workflow"}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
