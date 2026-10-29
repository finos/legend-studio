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

const RANK_SEPARATION = 56;
const NODE_SEPARATION = 32;

/** A node's top-left corner on the canvas */
export interface CubeCanvasPosition {
  readonly x: number;
  readonly y: number;
}

/** Where the canvas draws the query's nodes and edges */
export interface CubeCanvasLayout {
  /** Each node's top-left corner, by node id */
  readonly positions: ReadonlyMap<string, CubeCanvasPosition>;
  /**
   * For each connection that skips columns, by its id (`toString()`), one
   * lane for each column it skips, left to right: the column's left edge,
   * and the height dagre keeps clear of that column's nodes for it
   */
  readonly lanes: ReadonlyMap<string, readonly CubeCanvasPosition[]>;
}

// by code unit, so the order never depends on the locale
const compareText = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const compareConnections = (a: Connection, b: Connection): number =>
  compareText(a.port, b.port) ||
  compareText(a.source, b.source) ||
  compareText(a.target, b.target);

/**
 * Each node's column: the first for a node with no input, else the one after
 * its furthest input's (the longest path from a source). So every source
 * starts in the first column (feedback, 2026-10-29), where dagre alone would
 * put a short branch's source next to the step it feeds.
 */
const getColumns = (query: Query): ((id: string) => number) => {
  const inputs = new Map<string, string[]>();
  query.connections.forEach(({ source, target }) =>
    inputs.set(target, [...(inputs.get(target) ?? []), source]),
  );
  const columns = new Map<string, number>();
  const getColumn = (id: string): number => {
    let column = columns.get(id);
    if (column === undefined) {
      // a query has no cycle, so this ends
      column = Math.max(-1, ...(inputs.get(id) ?? []).map(getColumn)) + 1;
      columns.set(id, column);
    }
    return column;
  };
  return getColumn;
};

/** The height at `x` of the line through the points, which go left to right */
const getHeightAt = (
  points: readonly CubeCanvasPosition[],
  x: number,
): number | undefined => {
  const index = points.findIndex((point) => point.x >= x);
  const after = points[index];
  const before = points[index - 1] ?? after;
  if (!after || !before) {
    return undefined;
  }
  return after.x === before.x
    ? after.y
    : before.y + ((after.y - before.y) * (x - before.x)) / (after.x - before.x);
};

/**
 * Where each node goes, laid out left to right (spec §17.3): a pure function
 * of the query, recomputed on every change, so undo, import and every edit
 * need no layout state. Nodes go in sorted by id and connections by port,
 * source and target, so an edit that only reorders them moves nothing.
 *
 * Each node goes in its column (`getColumns`): every connection is at least
 * as long as its columns are apart, and dagre's ranking keeps it that long.
 * A connection that skips columns gets a lane through each: dagre routes it
 * there, clear of the nodes, so its edge can follow it (`CubeCanvasEdge`).
 */
export const layoutCubeQuery = (query: Query): CubeCanvasLayout => {
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
  const getColumn = getColumns(query);
  [...query.connections].sort(compareConnections).forEach((connection) =>
    graph.setEdge(
      connection.source,
      connection.target,
      {
        minlen: getColumn(connection.target) - getColumn(connection.source),
      },
      connection.port,
    ),
  );
  dagre.layout(graph);
  const positions = new Map(
    query.nodes.map((node): [string, CubeCanvasPosition] => {
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
  // every node of a column has the same left edge
  const columnLefts = new Map(
    [...positions].map(([id, { x }]): [number, number] => [getColumn(id), x]),
  );
  const lanes = new Map<string, CubeCanvasPosition[]>();
  query.connections.forEach((connection) => {
    const connectionLanes: CubeCanvasPosition[] = [];
    const { points } = graph.edge(
      connection.source,
      connection.target,
      connection.port,
    );
    for (
      let column = getColumn(connection.source) + 1;
      column < getColumn(connection.target);
      column++
    ) {
      const x = columnLefts.get(column);
      // dagre's route crosses the middle of a column at its lane's height
      const y =
        x === undefined
          ? undefined
          : getHeightAt(points, x + CUBE_CANVAS_NODE_WIDTH / 2);
      if (x === undefined || y === undefined) {
        // no lane to follow: the edge is drawn as any other
        return;
      }
      connectionLanes.push({ x, y });
    }
    if (connectionLanes.length) {
      lanes.set(connection.toString(), connectionLanes);
    }
  });
  return { positions, lanes };
};
