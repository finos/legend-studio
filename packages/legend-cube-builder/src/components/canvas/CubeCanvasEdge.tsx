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
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
} from '@xyflow/react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeCanvasFlowEdge } from './CubeCanvasElements.js';
import {
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasPosition,
} from './CubeCanvasLayout.js';

/** The gap between an input's label and the node it feeds */
const LABEL_GAP = 6;

/** React Flow's curve from a point to one further right: both control points halfway across */
const curveTo = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): string => {
  const middle = (fromX + toX) / 2;
  return ` C${middle},${fromY} ${middle},${toY} ${toX},${toY}`;
};

/**
 * An edge's path: React Flow's curve from its source to its target or, for an
 * edge that skips columns, straight across each column in the lane the
 * layout keeps for it, with the same curve in each gap between columns, so
 * it never crosses a node (`layoutCubeQuery`)
 */
export const getCubeCanvasEdgePath = (
  edge: Pick<
    EdgeProps,
    | 'sourceX'
    | 'sourceY'
    | 'sourcePosition'
    | 'targetX'
    | 'targetY'
    | 'targetPosition'
  >,
  lanes: readonly CubeCanvasPosition[],
): string => {
  if (!lanes.length) {
    return getBezierPath(edge)[0];
  }
  let path = `M${edge.sourceX},${edge.sourceY}`;
  let x = edge.sourceX;
  let y = edge.sourceY;
  lanes.forEach((lane) => {
    path += `${curveTo(x, y, lane.x, lane.y)} L${lane.x + CUBE_CANVAS_NODE_WIDTH},${lane.y}`;
    x = lane.x + CUBE_CANVAS_NODE_WIDTH;
    y = lane.y;
  });
  return path + curveTo(x, y, edge.targetX, edge.targetY);
};

/**
 * A connection, with its port's label (Left or Right on a Join) shown as text
 * beside the input it feeds, not in a tooltip (spec §17.3). The label is HTML:
 * React Flow's own edge label measures SVG text, which jsdom can't.
 */
export const CubeCanvasEdge: React.FC<EdgeProps<CubeCanvasFlowEdge>> = (
  props,
) => {
  const { id, targetX, targetY, markerEnd, data } = props;
  const path = getCubeCanvasEdgePath(props, data?.lanes ?? []);
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded bg-[var(--color-bg-panel)] px-1 text-sm text-[var(--color-text-secondary)]"
            style={{
              transform: `translate(-100%, -100%) translate(${targetX - LABEL_GAP}px, ${targetY - 2}px)`,
            }}
            data-testid={LEGEND_CUBE_TEST_ID.CANVAS_EDGE_LABEL}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
