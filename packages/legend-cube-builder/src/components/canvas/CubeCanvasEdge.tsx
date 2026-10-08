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

/** The gap between an input's label and the node it feeds */
const LABEL_GAP = 6;

/**
 * A connection, with its port's label (Left or Right on a Join) shown as text
 * beside the input it feeds, not in a tooltip (spec §17.3). The label is HTML:
 * React Flow's own edge label measures SVG text, which jsdom can't.
 */
export const CubeCanvasEdge: React.FC<EdgeProps<CubeCanvasFlowEdge>> = (
  props,
) => {
  const { id, targetX, targetY, markerEnd, data } = props;
  const [path] = getBezierPath(props);
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
