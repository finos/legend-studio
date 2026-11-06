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
import {
  type Connection,
  getShownContainers,
  type Query,
  type StepContainer,
} from '@finos/legend-cube';

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

// ---------------------------------------- containers ----------------------------------------

/**
 * With a container, dagre's nesting graph puts three ranks between two
 * columns where there was one, so the columns keep their gap with a third of
 * the separation
 */
const CONTAINER_RANK_SEPARATION = RANK_SEPARATION / 3;
/**
 * dagre keeps half the node and edge separations round a container's steps,
 * across its columns: this leaves room above them for the frame's head
 */
const CONTAINER_EDGE_SEPARATION = 40;
/** The frame's room round its steps */
export const CUBE_CANVAS_FRAME_PADDING = 12;
/** The frame's head, its title and buttons, above its steps */
export const CUBE_CANVAS_FRAME_HEAD_HEIGHT = 28;

/**
 * Where the canvas draws a container: a frame round its steps or, folded,
 * one box, the size of a step's, in their place
 */
export interface CubeCanvasContainerPlace {
  readonly container: StepContainer;
  /** Its steps, sorted by id */
  readonly steps: readonly string[];
  /** The frame's or the box's top-left corner */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where the canvas draws the query's nodes and edges, and its containers */
export interface CubeCanvasContainerLayout extends CubeCanvasLayout {
  readonly containers: readonly CubeCanvasContainerPlace[];
}

// keys of the graph laid out that no step's id can be: a folded container's
// box and an open container's frame
const boxKey = (id: string): string => `\u0000box:${id}`;
const frameKey = (id: string): string => `\u0000frame:${id}`;

interface CubeCanvasLayoutEdge {
  readonly connection: Connection;
  readonly source: string;
  readonly target: string;
  /** Unique: a step feeds one other, and a port takes one input */
  readonly name: string;
}

/** Each key's column, as a step's (`getColumns`), in the graph laid out */
const getKeyColumns = (
  edges: readonly CubeCanvasLayoutEdge[],
): ((key: string) => number) => {
  const inputs = new Map<string, string[]>();
  edges.forEach(({ source, target }) =>
    inputs.set(target, [...(inputs.get(target) ?? []), source]),
  );
  const columns = new Map<string, number>();
  const getColumn = (key: string): number => {
    let column = columns.get(key);
    if (column === undefined) {
      // the graph laid out has no cycle (`layoutCubeCanvas`), so this ends
      column = Math.max(-1, ...(inputs.get(key) ?? []).map(getColumn)) + 1;
      columns.set(key, column);
    }
    return column;
  };
  return getColumn;
};

/**
 * The canvas laid out with its containers (PLAN §11.28): `layoutCubeQuery`'s
 * when none is drawn. An open container's steps are a cluster of dagre's
 * compound graph, so nothing else lands inside its frame; a folded one's are
 * one box, with the lines that come into them, or go out of them, coming to
 * or going from it: the graph laid out is the query with each folded
 * container's steps made one. Containers are one block of steps each
 * (`getShownContainers`), so that graph has no cycle. Columns and lanes are
 * `layoutCubeQuery`'s, on that graph.
 */
export const layoutCubeCanvas = (
  query: Query,
  containers: readonly StepContainer[] | undefined,
): CubeCanvasContainerLayout => {
  const shown = getShownContainers(query, containers);
  if (!shown.length) {
    return { ...layoutCubeQuery(query), containers: [] };
  }
  const boxOf = new Map<string, string>();
  shown.forEach(
    ({ container, steps }) =>
      container.folded &&
      steps.forEach((id) => boxOf.set(id, boxKey(container.id))),
  );
  const keyOf = (id: string): string => boxOf.get(id) ?? id;
  const open = shown
    .filter(({ container }) => !container.folded)
    .sort((a, b) => compareText(a.container.id, b.container.id));
  const keys = [...new Set(query.nodes.map((node) => keyOf(node.id)))].sort(
    compareText,
  );
  const edges = [...query.connections]
    .sort(compareConnections)
    .map((connection) => ({
      connection,
      source: keyOf(connection.source),
      target: keyOf(connection.target),
      name: `${connection.target}:${connection.port}`,
    }))
    .filter((edge) => edge.source !== edge.target);
  const getColumn = getKeyColumns(edges);
  const graph = new dagre.graphlib.Graph<{
    width?: number;
    height?: number;
  }>({ multigraph: true, compound: open.length > 0 });
  graph.setGraph({
    rankdir: 'LR',
    ranksep: open.length ? CONTAINER_RANK_SEPARATION : RANK_SEPARATION,
    nodesep: NODE_SEPARATION,
    ...(open.length ? { edgesep: CONTAINER_EDGE_SEPARATION } : {}),
  });
  graph.setDefaultEdgeLabel(() => ({}));
  keys.forEach((key) =>
    graph.setNode(key, {
      width: CUBE_CANVAS_NODE_WIDTH,
      height: CUBE_CANVAS_NODE_HEIGHT,
    }),
  );
  open.forEach(({ container, steps }) => {
    graph.setNode(frameKey(container.id), {});
    steps.forEach((id) => graph.setParent(id, frameKey(container.id)));
  });
  edges.forEach((edge) =>
    graph.setEdge(
      edge.source,
      edge.target,
      { minlen: getColumn(edge.target) - getColumn(edge.source) },
      edge.name,
    ),
  );
  dagre.layout(graph);
  const topLeftOf = (key: string): CubeCanvasPosition => {
    // dagre gives each node's centre
    const { x = 0, y = 0 } = graph.node(key) as { x?: number; y?: number };
    return {
      x: x - CUBE_CANVAS_NODE_WIDTH / 2,
      y: y - CUBE_CANVAS_NODE_HEIGHT / 2,
    };
  };
  const positions = new Map(
    query.nodes
      .filter((node) => !boxOf.has(node.id))
      .map((node): [string, CubeCanvasPosition] => [
        node.id,
        topLeftOf(node.id),
      ]),
  );
  // a lane in each column a line skips, as `layoutCubeQuery` gives them
  const columnLefts = new Map(
    keys.map((key): [number, number] => [getColumn(key), topLeftOf(key).x]),
  );
  const lanes = new Map<string, CubeCanvasPosition[]>();
  edges.forEach((edge) => {
    const edgeLanes: CubeCanvasPosition[] = [];
    const { points } = graph.edge(edge.source, edge.target, edge.name) as {
      points: CubeCanvasPosition[];
    };
    for (
      let column = getColumn(edge.source) + 1;
      column < getColumn(edge.target);
      column++
    ) {
      const x = columnLefts.get(column);
      const y =
        x === undefined
          ? undefined
          : getHeightAt(points, x + CUBE_CANVAS_NODE_WIDTH / 2);
      if (x === undefined || y === undefined) {
        return;
      }
      edgeLanes.push({ x, y });
    }
    if (edgeLanes.length) {
      lanes.set(edge.connection.toString(), edgeLanes);
    }
  });
  return {
    positions,
    lanes,
    containers: shown.map(({ container, steps }) => {
      if (container.folded) {
        return {
          container,
          steps,
          ...topLeftOf(boxKey(container.id)),
          width: CUBE_CANVAS_NODE_WIDTH,
          height: CUBE_CANVAS_NODE_HEIGHT,
        };
      }
      const corners = steps.map((id) => positions.get(id) ?? { x: 0, y: 0 });
      const left = Math.min(...corners.map(({ x }) => x));
      const top = Math.min(...corners.map(({ y }) => y));
      const right =
        Math.max(...corners.map(({ x }) => x)) + CUBE_CANVAS_NODE_WIDTH;
      const bottom =
        Math.max(...corners.map(({ y }) => y)) + CUBE_CANVAS_NODE_HEIGHT;
      return {
        container,
        steps,
        x: left - CUBE_CANVAS_FRAME_PADDING,
        y: top - CUBE_CANVAS_FRAME_PADDING - CUBE_CANVAS_FRAME_HEAD_HEIGHT,
        width: right - left + 2 * CUBE_CANVAS_FRAME_PADDING,
        height:
          bottom -
          top +
          2 * CUBE_CANVAS_FRAME_PADDING +
          CUBE_CANVAS_FRAME_HEAD_HEIGHT,
      };
    }),
  };
};

/**
 * Where the node editor of a step goes: on the step, or on the box of the
 * folded container it is in
 */
export const getCubeCanvasStepPlace = (
  layout: CubeCanvasContainerLayout,
  stepId: string,
): CubeCanvasPosition | undefined =>
  layout.positions.get(stepId) ??
  layout.containers.find(
    (place) => place.container.folded && place.steps.includes(stepId),
  );
