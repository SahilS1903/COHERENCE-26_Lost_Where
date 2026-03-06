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
import { Save, Play, Pause, LayoutGrid, X, Upload, Sparkles, Send, Clock, MessageSquareReply, GitFork, CircleStop, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

function WorkflowNode({ data, selected }: { data: { type: NodeTypeKey; label: string }; selected: boolean }) {
  const config = nodeTypeConfig[data.type];
  const Icon = config.icon;
  return (
    <div
      className={`glass-card px-4 py-3 min-w-[160px] cursor-pointer transition-all ${selected ? "ring-1 ring-primary" : ""}`}
      style={{ borderTop: `3px solid ${config.hsl}` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 flex-shrink-0" style={{ color: config.hsl }} />
        <span className="font-mono text-xs text-foreground">{data.label}</span>
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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const idCounter = useRef(8);

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
            <Button size="sm" variant="secondary" className="font-mono text-xs">
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
                <div className="space-y-2">
                  <Label className="text-xs font-mono text-muted-foreground">Tone</Label>
                  <Select defaultValue="professional">
                    <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Label className="text-xs font-mono text-muted-foreground">Persona Instructions</Label>
                  <Textarea defaultValue="You are a helpful business development representative..." className="bg-secondary border-border min-h-[80px] text-xs" />
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
    </div>
  );
}
