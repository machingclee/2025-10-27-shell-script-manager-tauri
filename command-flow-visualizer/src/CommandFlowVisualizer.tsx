import { useMemo, useState, useCallback } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    MarkerType,
    Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import data from "./data.json";

interface CommandEvent {
    from: string;
    to: string[];
}

interface PolicyCommand {
    policy: string;
    fromEvent: string;
    toCommand: string;
}

interface FlowData {
    commandEvents: CommandEvent[];
    policyCommands: PolicyCommand[];
}

const VERTICAL_SPACING = 60;
const NODE_WIDTH = "400px"; // Global default width for all cells
const FONT_SIZE = "16px"; // Global font size for node labels

// Horizontal positions for each column
const COMMAND_X = 100;
const EVENT_X = 600;
const POLICY_X = 1100;

const CommandFlowVisualizer = () => {
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setSelectedNode(selectedNode === node.id ? null : node.id);
        },
        [selectedNode]
    );

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const { nodes, edges } = useMemo(() => {
        const flowData: FlowData = data as FlowData;
        const nodeMap = new Map<string, Node>();
        const edgeList: Edge[] = [];
        const eventYPositions = new Map<string, number>();

        let yOffset = 0;

        // Create command nodes and their events
        flowData.commandEvents.forEach((item) => {
            const commandId = `command-${item.from}`;
            const eventCount = item.to.length;
            const totalEventHeight = (eventCount - 1) * 100;
            const commandY = yOffset + totalEventHeight / 2;

            // Add command node (centered vertically relative to its events)
            if (!nodeMap.has(commandId)) {
                nodeMap.set(commandId, {
                    id: commandId,
                    type: "default",
                    data: { label: item.from },
                    position: { x: COMMAND_X, y: commandY },
                    style: {
                        background: "#3b82f6",
                        color: "#fff",
                        border: "2px solid #2563eb",
                        borderRadius: "8px",
                        padding: "10px",
                        fontSize: FONT_SIZE,
                        width: NODE_WIDTH,
                    },
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                });
            }

            // Add event nodes - each gets unique position even if same event name
            item.to.forEach((eventName, eventIndex) => {
                const eventY = yOffset + eventIndex * 100;
                const eventId = `event-${eventName}`;

                // Check if this event already exists
                if (!nodeMap.has(eventId)) {
                    // First occurrence - create the node
                    eventYPositions.set(eventName, eventY);

                    nodeMap.set(eventId, {
                        id: eventId,
                        type: "default",
                        data: { label: eventName },
                        position: { x: EVENT_X, y: eventY },
                        style: {
                            background: "#10b981",
                            color: "#fff",
                            border: "2px solid #059669",
                            borderRadius: "8px",
                            padding: "10px",
                            fontSize: FONT_SIZE,
                            width: NODE_WIDTH,
                        },
                        sourcePosition: Position.Right,
                        targetPosition: Position.Left,
                    });
                }
                // If event already exists, don't move it - keep original position

                // Add edge from command to event
                edgeList.push({
                    id: `${commandId}-${eventId}`,
                    source: commandId,
                    target: eventId,
                    type: "smoothstep",
                    animated: true,
                    style: { stroke: "#64748b", strokeWidth: 2 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: "#64748b",
                    },
                });
            });

            yOffset += totalEventHeight + VERTICAL_SPACING;
        });

        // Add policy nodes and connections
        const policyPositions = new Map<string, number>();
        flowData.policyCommands.forEach((policy, _index) => {
            const policyId = `policy-${policy.policy}`;
            const eventId = `event-${policy.fromEvent}`;
            const commandId = `command-${policy.toCommand}`;

            // Add policy node (only once per unique policy name)
            if (!nodeMap.has(policyId)) {
                const policyY = policyPositions.size * VERTICAL_SPACING;
                policyPositions.set(policy.policy, policyY);

                nodeMap.set(policyId, {
                    id: policyId,
                    type: "default",
                    data: { label: policy.policy },
                    position: { x: POLICY_X, y: policyY },
                    style: {
                        background: "#f59e0b",
                        color: "#fff",
                        border: "2px solid #d97706",
                        borderRadius: "8px",
                        padding: "10px",
                        fontSize: FONT_SIZE,
                        width: NODE_WIDTH,
                    },
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                });
            }

            // Connect event to policy
            if (nodeMap.has(eventId)) {
                const edgeId = `${eventId}-${policyId}`;
                // Only add edge if it doesn't exist (avoid duplicate edges)
                if (!edgeList.find((e) => e.id === edgeId)) {
                    edgeList.push({
                        id: edgeId,
                        source: eventId,
                        target: policyId,
                        type: "smoothstep",
                        animated: true,
                        style: { stroke: "#f59e0b", strokeWidth: 2 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: "#f59e0b",
                        },
                    });
                }
            }

            // Connect policy to command
            if (nodeMap.has(commandId)) {
                const edgeId = `${policyId}-${commandId}`;
                // Only add edge if it doesn't exist (avoid duplicate edges)
                if (!edgeList.find((e) => e.id === edgeId)) {
                    edgeList.push({
                        id: edgeId,
                        source: policyId,
                        target: commandId,
                        type: "smoothstep",
                        animated: true,
                        style: { stroke: "#f59e0b", strokeWidth: 2 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: "#f59e0b",
                        },
                    });
                }
            }
        });

        return {
            nodes: Array.from(nodeMap.values()),
            edges: edgeList,
        };
    }, []);

    // Compute highlighted edges based on selected node
    const highlightedEdges = useMemo(() => {
        if (!selectedNode) return edges;

        return edges.map((edge) => {
            const isConnected = edge.source === selectedNode || edge.target === selectedNode;
            return {
                ...edge,
                style: {
                    ...edge.style,
                    opacity: isConnected ? 1 : 0.15,
                    strokeWidth: isConnected ? 3 : 2,
                },
                animated: isConnected,
            };
        });
    }, [edges, selectedNode]);

    // Compute highlighted nodes based on selected node
    const highlightedNodes = useMemo(() => {
        if (!selectedNode) return nodes;

        const connectedNodeIds = new Set<string>();
        connectedNodeIds.add(selectedNode);

        edges.forEach((edge) => {
            if (edge.source === selectedNode) {
                connectedNodeIds.add(edge.target);
            }
            if (edge.target === selectedNode) {
                connectedNodeIds.add(edge.source);
            }
        });

        return nodes.map((node) => {
            const isConnected = connectedNodeIds.has(node.id);
            return {
                ...node,
                style: {
                    ...node.style,
                    opacity: isConnected ? 1 : 0.3,
                },
            };
        });
    }, [nodes, edges, selectedNode]);

    return (
        <div className="w-screen h-screen">
            <ReactFlow
                nodes={highlightedNodes}
                edges={highlightedEdges}
                fitView
                attributionPosition="bottom-left"
                panOnScroll={true}
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={true}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
            >
                <Background />
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        if (node.id.startsWith("command-")) return "#3b82f6";
                        if (node.id.startsWith("event-")) return "#10b981";
                        if (node.id.startsWith("policy-")) return "#f59e0b";
                        return "#64748b";
                    }}
                />
            </ReactFlow>

            <div className="absolute top-5 left-5 bg-white p-4 rounded-lg shadow-lg z-10">
                <h3 className="m-0 mb-2.5 text-base font-semibold">Legend</h3>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-blue-500 rounded"></div>
                        <span className="text-xs">Command</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-emerald-500 rounded"></div>
                        <span className="text-xs">Event</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-amber-500 rounded"></div>
                        <span className="text-xs">Policy</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommandFlowVisualizer;
