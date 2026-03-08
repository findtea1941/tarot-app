"use client";

import { memo, useMemo } from "react";
import {
  Background,
  Handle,
  MarkerType,
  ReactFlow,
  type NodeProps,
  Position,
  type Edge,
  type Node,
} from "@xyflow/react";
import type { FlyChainRow, PathStep, SlotCardEntry } from "@/lib/flyingPalace";
import { getSlotName as getFlySlotName } from "@/lib/flyingPalace";

type AnnualFlyChainGraphProps = {
  rows: FlyChainRow[];
  slotCards: Map<string, SlotCardEntry>;
};

type TreeNode = {
  id: string;
  key: string;
  label: string;
  children: TreeNode[];
  isTurningPoint?: boolean;
  isRed?: boolean;
  isStop?: boolean;
  isRoot?: boolean;
};

const NODE_WIDTH = 78;
const X_GAP = 104;
const Y_GAP = 68;

type AnnualFlyData = {
  label: string;
  isTurningPoint?: boolean;
  isRed?: boolean;
  isStop?: boolean;
  isRoot?: boolean;
};

function AnnualFlyNode({
  data,
}: NodeProps) {
  const nodeData = data as AnnualFlyData;
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <div
        className="rounded-xl px-2 py-1.5 text-center text-xs leading-4 text-slate-800"
        style={{
          width: NODE_WIDTH,
          whiteSpace: "pre-line",
          border: nodeData.isRed
            ? "2.5px solid #10b981"
            : nodeData.isTurningPoint
              ? "1.5px solid #10b981"
              : "1px solid #cfe7dc",
          background: nodeData.isRed
            ? "#ffffff"
            : nodeData.isTurningPoint
              ? "#b7f0d0"
              : nodeData.isRoot
                ? "#f5fbf8"
                : "#ffffff",
          fontWeight: nodeData.isRoot || nodeData.isStop ? 600 : 500,
          boxShadow: nodeData.isRed
            ? "0 5px 12px rgba(16,185,129,0.18)"
            : nodeData.isTurningPoint
              ? "0 5px 12px rgba(16,185,129,0.18)"
              : nodeData.isRoot
                ? "0 4px 10px rgba(5,150,105,0.10)"
                : "0 3px 8px rgba(15,23,42,0.05)",
        }}
      >
        {nodeData.label}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </>
  );
}

const NODE_TYPES = { annualFly: AnnualFlyNode };

function buildNodeLabel(step: PathStep, slotCards: Map<string, SlotCardEntry>): string {
  const pos = getFlySlotName(step.node);
  const entry = slotCards.get(step.node);
  const name = entry ? `${entry.card.name}${entry.reversed ? "-" : ""}` : "—";
  return `${pos}\n${name}`;
}

function buildTree(row: FlyChainRow, slotCards: Map<string, SlotCardEntry>): TreeNode {
  const spaceIdx = row.startLabel.indexOf(" ");
  const rootLabel =
    spaceIdx >= 0
      ? `${row.startLabel.slice(0, spaceIdx)}\n${row.startLabel.slice(spaceIdx + 1)}`
      : row.startLabel;
  const root: TreeNode = {
    id: `${row.startSlotId}-root`,
    key: row.startSlotId,
    label: rootLabel,
    children: [],
    isRoot: true,
  };

  row.branches.forEach((branch, branchIndex) => {
    let current = root;
    branch.path.forEach((step, stepIndex) => {
      const key = `${step.node}|${step.isTurningPoint ? 1 : 0}|${step.isRed ? 1 : 0}|${
        branch.stopNode === step.node && stepIndex === branch.path.length - 1 ? 1 : 0
      }`;
      let child = current.children.find((node) => node.key === key);
      if (!child) {
        child = {
          id: `${row.startSlotId}-${branchIndex}-${stepIndex}-${step.node}-${current.children.length}`,
          key,
          label: buildNodeLabel(step, slotCards),
          children: [],
          isTurningPoint: step.isTurningPoint,
          isRed: step.isRed,
          isStop: branch.stopNode === step.node && stepIndex === branch.path.length - 1,
        };
        current.children.push(child);
      }
      current = child;
    });
  });

  return root;
}

function getLeafCount(node: TreeNode): number {
  if (node.children.length === 0) return 1;
  return node.children.reduce((sum, child) => sum + getLeafCount(child), 0);
}

function buildFlow(tree: TreeNode, yOffset: number): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const place = (node: TreeNode, depth: number, topLeaf: number) => {
    const leafCount = getLeafCount(node);
    const y = yOffset + (topLeaf + (leafCount - 1) / 2) * Y_GAP;
    nodes.push({
      id: node.id,
      type: "annualFly",
      position: { x: depth * X_GAP, y },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      draggable: false,
      selectable: false,
      data: {
        label: node.label,
        isTurningPoint: node.isTurningPoint,
        isRed: node.isRed,
        isStop: node.isStop,
        isRoot: node.isRoot,
      },
    });

    let cursor = topLeaf;
    const isBranch = node.children.length > 1;
    node.children.forEach((child) => {
      const childLeafCount = getLeafCount(child);
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: isBranch ? "straight" : "step",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#0f766e" },
        style: {
          stroke: child.isTurningPoint ? "#059669" : "#0f766e",
          strokeWidth: 1.7,
        },
      });
      place(child, depth + 1, cursor);
      cursor += childLeafCount;
    });
  };

  place(tree, 0, 0);
  return { nodes, edges };
}

function AnnualFlyChainGraphInner({ rows, slotCards }: AnnualFlyChainGraphProps) {
  const { nodes, edges } = useMemo(() => {
    let nextYOffset = 0;
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    rows.forEach((row) => {
      const tree = buildTree(row, slotCards);
      const flow = buildFlow(tree, nextYOffset);
      allNodes.push(...flow.nodes);
      allEdges.push(...flow.edges);
      const treeHeight = Math.max(getLeafCount(tree) * Y_GAP, 1 * Y_GAP);
      nextYOffset += treeHeight + 52;
    });

    return { nodes: allNodes, edges: allEdges };
  }, [rows, slotCards]);

  const graphHeight = useMemo(() => {
    if (nodes.length === 0) return 160;
    const maxY = Math.max(...nodes.map((node) => node.position.y));
    return Math.max(234, maxY + 78);
  }, [nodes]);

  const graphWidth = useMemo(() => {
    if (nodes.length === 0) return 546;
    const maxX = Math.max(...nodes.map((node) => node.position.x));
    return Math.max(546, maxX + NODE_WIDTH + 104);
  }, [nodes]);

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">全部飞宫链路图</p>
        </div>
        <span className="rounded-full bg-[#e5f3f0] px-3 py-1 text-xs font-medium text-tarot-green">
          起点数 {rows.length}
        </span>
      </div>
      <div className="border-t border-[#e7f3ee] py-2 text-xs text-slate-500">
        绿色节点表示转折点，加粗绿框表示触发停止点。
      </div>
      <div className="border-t border-[#e7f3ee] pt-2">
        <div className="overflow-x-auto overflow-y-hidden">
          <div style={{ width: graphWidth, height: graphHeight }} className="bg-[#fbfdfc]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              nodesConnectable={false}
              nodesDraggable={false}
              elementsSelectable={false}
              panOnDrag={true}
              zoomOnDoubleClick={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              preventScrolling={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e5efeb" gap={8} size={0.8} />
            </ReactFlow>
          </div>
        </div>
      </div>
    </div>
  );
}

export const AnnualFlyChainGraph = memo(AnnualFlyChainGraphInner);
