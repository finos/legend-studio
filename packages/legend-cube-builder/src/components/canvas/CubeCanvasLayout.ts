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

import dagre from '@dagrejs/dagre';
import type { Connection, Query } from '@finos/legend-cube';

/** Every node is drawn this size, so edges need no DOM measurement (PLAN §7.2) */
export const CUBE_CANVAS_NODE_WIDTH = 200;
export const CUBE_CANVAS_NODE_HEIGHT = 72;

const RANK_SEPARATION = 80;
const NODE_SEPARATION = 32;

/** A node's top-left corner on the canvas */
export interface CubeCanvasPosition {
  readonly x: number;
  readonly y: number;
}

// by code unit, so the order never depends on the locale
const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const compareConnections = (a: Connection, b: Connection): number =>
  compareText(a.port, b.port) ||
  compareText(a.source, b.source) ||
  compareText(a.target, b.target);

/**
 * Where each node goes, laid out left to right (spec §17.3): a pure function
 * of the query, recomputed on every change, so undo, import and every edit
 * need no layout state. Nodes go in sorted by id and connections by port,
 * source and target, so an edit that only reorders them moves nothing.
 */
export const layoutCubeQuery = (
  query: Query,
): Map<string, CubeCanvasPosition> => {
  const graph = new dagre.graphlib.Graph<{
    width: number;
    height: number;
  }>({ multigraph: true });
  graph.setGraph({
    rankdir: 'LR',
    ranksep: RANK_SEPARATION,
    nodesep: NODE_SEPARATION,
  });
  graph.setDefaultEdgeLabel(() => ({}));
  [...query.nodes]
    .sort((a, b) => compareText(a.id, b.id))
    .forEach((node) =>
      graph.setNode(node.id, {
        width: CUBE_CANVAS_NODE_WIDTH,
        height: CUBE_CANVAS_NODE_HEIGHT,
      }),
    );
  [...query.connections]
    .sort(compareConnections)
    .forEach((connection) =>
      graph.setEdge(connection.source, connection.target, {}, connection.port),
    );
  dagre.layout(graph);
  return new Map(
    query.nodes.map((node) => {
      // dagre gives each node's centre
      const { x, y } = graph.node(node.id);
      return [
        node.id,
        {
          x: x - CUBE_CANVAS_NODE_WIDTH / 2,
          y: y - CUBE_CANVAS_NODE_HEIGHT / 2,
        },
      ];
    }),
  );
};
