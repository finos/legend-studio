/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  isIncompleteError,
  isSchemasError,
  type Query,
  type QueryNode,
} from '@finos/legend-cube';
import { type Edge, MarkerType, type Node, Position } from '@xyflow/react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasPosition,
} from './CubeCanvasLayout.js';

// The query as React Flow draws it: one node per query node, one edge per
// connection. Rebuilt from the query on every change; React Flow keeps no
// state of its own that matters (PLAN §7.2)

export const CUBE_CANVAS_NODE_TYPE = 'cube';
export const CUBE_CANVAS_EDGE_TYPE = 'cube';
/** The one output of every node; its inputs are named by its ports */
export const CUBE_OUTPUT_HANDLE_ID = 'output';

/** Shown when a node has no validity entry at all, which inference never leaves out */
export const MISSING_VALIDITY_TOOLTIP =
  'This node depends on some invalid inputs.';

export type CubeCanvasNodeData = { readonly node: QueryNode };
export type CubeCanvasEdgeData = { readonly label: string | undefined };
export type CubeCanvasFlowNode = Node<CubeCanvasNodeData, 'cube'>;
export type CubeCanvasFlowEdge = Edge<CubeCanvasEdgeData, 'cube'>;
type CubeCanvasHandle = NonNullable<Node['handles']>[number];

/** How far down the node's left side each input handle sits: evenly spaced, in port order */
export const getInputHandleOffset = (index: number, count: number): number =>
  (CUBE_CANVAS_NODE_HEIGHT * (index + 1)) / (count + 1);

/**
 * Where the node's handles are, so edges are drawn without measuring the DOM:
 * its inputs down its left side in port order (a Join's Left above its
 * Right), its output in the middle of its right side. New objects each time:
 * React Flow writes into them.
 */
export const getCubeCanvasHandles = (node: QueryNode): CubeCanvasHandle[] => [
  ...node.ports.map((port, index) => ({
    id: port,
    type: 'target' as const,
    position: Position.Left,
    x: 0,
    y: getInputHandleOffset(index, node.ports.length),
  })),
  {
    id: CUBE_OUTPUT_HANDLE_ID,
    type: 'source' as const,
    position: Position.Right,
    x: CUBE_CANVAS_NODE_WIDTH,
    y: CUBE_CANVAS_NODE_HEIGHT / 2,
  },
];

export const buildCubeCanvasNodes = (
  query: Query,
  positions: ReadonlyMap<string, CubeCanvasPosition>,
): CubeCanvasFlowNode[] =>
  query.nodes.map((node) => ({
    id: node.id,
    type: CUBE_CANVAS_NODE_TYPE,
    position: { ...(positions.get(node.id) ?? { x: 0, y: 0 }) },
    width: CUBE_CANVAS_NODE_WIDTH,
    height: CUBE_CANVAS_NODE_HEIGHT,
    handles: getCubeCanvasHandles(node),
    data: { node },
  }));

/** Each connection, labelled with its port's label when the target has one, e.g. Left and Right on a Join */
export const buildCubeCanvasEdges = (query: Query): CubeCanvasFlowEdge[] =>
  query.connections.map((connection) => {
    const target = query.getNode(connection.target);
    const label = target?.portLabels[target.ports.indexOf(connection.port)];
    return {
      id: connection.toString(),
      type: CUBE_CANVAS_EDGE_TYPE,
      source: connection.source,
      target: connection.target,
      sourceHandle: CUBE_OUTPUT_HANDLE_ID,
      targetHandle: connection.port,
      markerEnd: { type: MarkerType.ArrowClosed },
      data: { label },
    };
  });

/** How a node looks on the canvas (spec §17.3): each state is its own class modifier */
export interface CubeCanvasNodeStatus {
  /** Execute runs the query up to this node */
  readonly isCapture: boolean;
  /** It has errors of its own */
  readonly isInvalid: boolean;
  /** An input is missing, or an input is invalid */
  readonly isIncomplete: boolean;
  /** The engine is typing its table */
  readonly isResolving: boolean;
  /** The last run failed on it */
  readonly hasEngineError: boolean;
  /** Its errors, then its warnings, its description and its id, one a line */
  readonly tooltip: string;
}

export const getCubeCanvasNodeStatus = (
  editorState: CubeEditorState,
  node: QueryNode,
): CubeCanvasNodeStatus => {
  const hasValidity = editorState.analysis.validity.has(node.id);
  const errors = editorState.getNodeErrors(node.id);
  const warnings = editorState.warnings.get(node.key) ?? [];
  return {
    isCapture: editorState.document.query.selected === node.id,
    isInvalid: errors.some(
      (error) => !isIncompleteError(error) && !isSchemasError(error),
    ),
    isIncomplete: errors.some(
      (error) => isIncompleteError(error) || isSchemasError(error),
    ),
    isResolving: editorState.isPendingSource(node),
    hasEngineError: editorState.hostIssues.has(node.id),
    tooltip: [
      ...(hasValidity ? [] : [MISSING_VALIDITY_TOOLTIP]),
      ...errors,
      ...warnings,
      node.describe(),
      node.id,
    ].join('\n'),
  };
};
