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
    useNodesState,
    useEdgesState,
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

const VERTICAL_SPACING = 75;
const NODE_WIDTH = "400px"; // Global default width for all cells
const FONT_SIZE = "16px"; // Global font size for node labels

// Horizontal positions for each column
const COMMAND_X = 100;
const EVENT_X = 600;
const POLICY_X = 1100;

// Generate distinct colors based on event name
const generateColorForEvent = (eventName: string): string => {
    // Predefined colors that are visually distinct
    const colors = [
        "#ef4444", // red
        "#06b6d4", // cyan
        "#8b5cf6", // violet
        "#ec4899", // pink
        "#14b8a6", // teal
        "#f97316", // orange
        "#6366f1", // indigo
        "#84cc16", // lime
        "#f59e0b", // amber
        "#22c55e", // green
    ];

    // Simple hash function to convert event name to a number
    let hash = 0;
    for (let i = 0; i < eventName.length; i++) {
        hash = (hash << 5) - hash + eventName.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }

    return colors[Math.abs(hash) % colors.length];
};

const CommandFlowVisualizer = () => {
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [_copiedText, setCopiedText] = useState<string | null>(null);

    const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
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
        const eventColors = new Map<string, string>();

        // First pass: assign colors to unique events that have policies
        flowData.policyCommands.forEach((policy) => {
            if (!eventColors.has(policy.fromEvent)) {
                eventColors.set(policy.fromEvent, generateColorForEvent(policy.fromEvent));
            }
        });

        // Second pass: create event nodes for external events (events not from commands)
        flowData.policyCommands.forEach((policy) => {
            const eventId = `event-${policy.fromEvent}`;

            // If event doesn't exist, it's an external event (e.g., from another microservice)
            if (!nodeMap.has(eventId)) {
                const eventY = yOffset;
                yOffset += VERTICAL_SPACING;

                nodeMap.set(eventId, {
                    id: eventId,
                    type: "default",
                    data: { label: policy.fromEvent },
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
        });

        flowData.policyCommands.forEach((policy, _index) => {
            const policyId = `policy-${policy.policy}`;
            const eventId = `event-${policy.fromEvent}`;
            const commandId = `command-${policy.toCommand}`;
            const eventColor = eventColors.get(policy.fromEvent)!;

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
                        background: eventColor,
                        color: "#fff",
                        border: `2px solid ${eventColor}`,
                        borderRadius: "8px",
                        padding: "10px",
                        fontSize: FONT_SIZE,
                        width: NODE_WIDTH,
                    },
                    sourcePosition: Position.Right,
                    targetPosition: Position.Left,
                });
            }

            // Connect event to policy with event color
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
                        style: { stroke: eventColor, strokeWidth: 2 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: eventColor,
                        },
                    });
                }
            }

            // Connect policy to command with the same event color
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
                        style: { stroke: eventColor, strokeWidth: 2 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: eventColor,
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

    const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setSelectedNode(selectedNode === node.id ? null : node.id);

            // Copy node label to clipboard
            const label = node.data.label as string;
            navigator.clipboard
                .writeText(label)
                .then(() => {
                    setCopiedText(label);
                    setTimeout(() => setCopiedText(null), 2000);
                })
                .catch((err) => {
                    console.error("Failed to copy text: ", err);
                });
        },
        [selectedNode]
    );

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
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
                nodesDraggable={true}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
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
        </div>
    );
};

export default CommandFlowVisualizer;
