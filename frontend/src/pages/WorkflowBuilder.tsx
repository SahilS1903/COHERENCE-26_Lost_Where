import { useState, useCallback, useRef } from "react";
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
import { Save, Play, Pause, LayoutGrid, X, Upload, Sparkles, Send, Clock, MessageSquareReply, GitFork, CircleStop, GripVertical, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

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

const initialNodes: Node[] = [
  { id: "1", type: "workflowNode", position: { x: 300, y: 50 }, data: { type: "importLeads", label: "Import Leads" } },
  { id: "2", type: "workflowNode", position: { x: 300, y: 170 }, data: { type: "aiGenerate", label: "AI Generate" } },
  { id: "3", type: "workflowNode", position: { x: 300, y: 290 }, data: { type: "sendMessage", label: "Send Email" } },
  { id: "4", type: "workflowNode", position: { x: 300, y: 410 }, data: { type: "waitDelay", label: "Wait 24h" } },
  { id: "5", type: "workflowNode", position: { x: 300, y: 530 }, data: { type: "checkReply", label: "Check Reply" } },
  { id: "6", type: "workflowNode", position: { x: 150, y: 650 }, data: { type: "condition", label: "Replied?" } },
  { id: "7", type: "workflowNode", position: { x: 450, y: 650 }, data: { type: "end", label: "End" } },
];

const initialEdges: Edge[] = [
  { id: "e1-2", source: "1", target: "2", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } },
  { id: "e2-3", source: "2", target: "3", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } },
  { id: "e3-4", source: "3", target: "4", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } },
  { id: "e4-5", source: "4", target: "5", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } },
  { id: "e5-6", source: "5", target: "6", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } },
  { id: "e5-7", source: "5", target: "7", animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } },
];

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
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const idCounter = useRef(8);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

      // Create the workflow first
      const workflow = await api.workflows.create({
        name: workflowName.trim(),
        description: workflowDescription.trim() || undefined,
      });

      // Then create nodes and edges
      const nodePromises = nodes.map((node) =>
        api.nodes.create(workflow.id, {
          type: mapNodeTypeToBackend(node.data.type),
          label: node.data.label,
          config: node.data.config || {},
          positionX: node.position.x,
          positionY: node.position.y,
        })
      );

      const createdNodes = await Promise.all(nodePromises);
      
      // Map old node IDs to new node IDs
      const nodeIdMap = new Map();
      nodes.forEach((node, index) => {
        nodeIdMap.set(node.id, createdNodes[index].id);
      });

      // Create edges with mapped node IDs
      const edgePromises = edges.map((edge) => {
        const edgeData: any = {
          sourceNodeId: nodeIdMap.get(edge.source),
          targetNodeId: nodeIdMap.get(edge.target),
        };
        // Only add conditionLabel if it exists
        if (edge.data?.conditionLabel) {
          edgeData.conditionLabel = edge.data.conditionLabel;
        }
        return api.edges.create(workflow.id, edgeData);
      });

      await Promise.all(edgePromises);

      return workflow;
    },
    onSuccess: (workflow) => {
      toast({
        title: "✅ Workflow Saved",
        description: `"${workflow.name}" has been saved successfully!`,
      });
      setSaveDialogOpen(false);
      setWorkflowName("");
      setWorkflowDescription("");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      // Optionally navigate to leads page
      // navigate("/leads");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "Failed to save workflow",
      });
    },
  });

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) =>
      addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(190,100%,50%)" }, style: { stroke: "hsl(190,100%,50%)", strokeWidth: 2 } }, eds)
    );
  }, [setEdges]);

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
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="font-mono text-xs" onClick={() => setSaveDialogOpen(true)}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant={isActive ? "default" : "secondary"}
              className={`font-mono text-xs ${isActive ? "bg-success text-success-foreground hover:bg-success/90" : ""}`}
              onClick={() => setIsActive(!isActive)}
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

              {selectedNode.data.type === "waitDelay" && (
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Duration</Label>
                  <div className="flex gap-2">
                    <Input type="number" defaultValue={24} className="bg-secondary border-border" />
                    <Select defaultValue="hours">
                      <SelectTrigger className="w-28 bg-secondary border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Save Workflow</DialogTitle>
            <DialogDescription>Give your workflow a name to save it and start importing leads.</DialogDescription>
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Workflow
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
