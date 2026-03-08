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
  houseDates?: Record<string, string>;
  /** 星运牌阵时传入，用于七星位等 slot 名称 */
  getSlotName?: (slotId: string) => string;
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

const NODE_WIDTH = 72;
const NODE_HEIGHT = 48;
const X_GAP = 96;
const ROW_GAP = 38;
const BRANCH_GAP = 16;

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
        className="rounded-xl px-2 py-1 text-center text-[11px] leading-[14px] text-slate-800 flex items-center justify-center"
        style={{
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          minHeight: NODE_HEIGHT,
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

function buildNodeLabel(
  step: PathStep,
  slotCards: Map<string, SlotCardEntry>,
  houseDates?: Record<string, string>,
  getSlotNameFn?: (slotId: string) => string
): string {
  const getName = getSlotNameFn ?? getFlySlotName;
  const pos = getName(step.node);
  const entry = slotCards.get(step.node);
  const name = entry ? `${entry.card.name}${entry.reversed ? "-" : ""}` : "—";
  const raw = houseDates && /^\d+$/.test(step.node) ? houseDates[step.node] : "";
  const date = raw.length >= 7 ? `${raw.slice(2, 4)}-${raw.slice(5, 7)}` : raw;
  return date ? `${pos}\n${name}\n${date}` : `${pos}\n${name}`;
}

function buildTree(
  row: FlyChainRow,
  slotCards: Map<string, SlotCardEntry>,
  houseDates?: Record<string, string>,
  getSlotNameFn?: (slotId: string) => string
): TreeNode {
  const spaceIdx = row.startLabel.indexOf(" ");
  let rootLabel =
    spaceIdx >= 0
      ? `${row.startLabel.slice(0, spaceIdx)}\n${row.startLabel.slice(spaceIdx + 1)}`
      : row.startLabel;
  const rawStart = houseDates && /^\d+$/.test(row.startSlotId) ? houseDates[row.startSlotId] : "";
  const startDate = rawStart.length >= 7 ? `${rawStart.slice(2, 4)}-${rawStart.slice(5, 7)}` : rawStart;
  if (startDate) rootLabel += `\n${startDate}`;
  const getName = getSlotNameFn ?? getFlySlotName;
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
          label: buildNodeLabel(step, slotCards, houseDates, getName),
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

function buildFlow(tree: TreeNode, rowTopY: number): { nodes: Node[]; edges: Edge[]; height: number } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const leafGap = NODE_HEIGHT + BRANCH_GAP;
  const totalLeaves = getLeafCount(tree);
  const height = Math.max(NODE_HEIGHT, (totalLeaves - 1) * leafGap + NODE_HEIGHT);

  const place = (node: TreeNode, depth: number, startLeafIndex: number): number => {
    let centerLeafIndex = startLeafIndex;
    if (node.children.length > 0) {
      let cursor = startLeafIndex;
      const childCenters: number[] = [];
      node.children.forEach((child) => {
        const childLeaves = getLeafCount(child);
        childCenters.push(place(child, depth + 1, cursor));
        cursor += childLeaves;
      });
      centerLeafIndex = (childCenters[0] + childCenters[childCenters.length - 1]) / 2;
    }

    nodes.push({
      id: node.id,
      type: "annualFly",
      position: { x: 16 + depth * X_GAP, y: rowTopY + centerLeafIndex * leafGap },
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

    node.children.forEach((child) => {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
        type: "straight",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#0f766e" },
        style: {
          stroke: child.isTurningPoint ? "#059669" : "#0f766e",
          strokeWidth: 1.7,
        },
      });
    });
    return centerLeafIndex;
  };

  place(tree, 0, 0);
  return { nodes, edges, height };
}

function AnnualFlyChainGraphInner({ rows, slotCards, houseDates, getSlotName }: AnnualFlyChainGraphProps) {
  const { nodes, edges } = useMemo(() => {
    let rowTopY = 20; // 顶部留白 20px，直接烘焙进节点坐标
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];

    rows.forEach((row) => {
      const tree = buildTree(row, slotCards, houseDates, getSlotName);
      const flow = buildFlow(tree, rowTopY);
      allNodes.push(...flow.nodes);
      allEdges.push(...flow.edges);
      rowTopY += flow.height + ROW_GAP;
    });

    return { nodes: allNodes, edges: allEdges };
  }, [rows, slotCards, houseDates, getSlotName]);

  const graphHeight = useMemo(() => {
    if (nodes.length === 0) return 160;
    const maxY = Math.max(...nodes.map((node) => node.position.y));
    return Math.max(234, maxY + NODE_HEIGHT + 24 + 2); /* 上下各扩大 1 */
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
        <div className="mt-0 overflow-x-auto overflow-y-hidden">
          <div style={{ width: graphWidth, height: graphHeight }} className="bg-[#fbfdfc]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              defaultViewport={{ x: 8, y: 0, zoom: 1 }}
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
