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

import { type Rect, type Transform, useStore } from '@xyflow/react';
import { useEffect } from 'react';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import {
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasPosition,
} from './CubeCanvasLayout.js';

/**
 * The steps wholly inside a box drawn on the canvas, as React Flow's own
 * box takes nodes: the box in the canvas's pixels, which the viewport's
 * transform maps to the graph's, where the steps are placed
 */
export const getCubeCanvasStepsInBox = (
  positions: ReadonlyMap<string, CubeCanvasPosition>,
  box: Rect,
  [x, y, zoom]: Transform,
): string[] => {
  const left = (box.x - x) / zoom;
  const top = (box.y - y) / zoom;
  const right = left + box.width / zoom;
  const bottom = top + box.height / zoom;
  return [...positions]
    .filter(
      ([, position]) =>
        position.x >= left &&
        position.y >= top &&
        position.x + CUBE_CANVAS_NODE_WIDTH <= right &&
        position.y + CUBE_CANVAS_NODE_HEIGHT <= bottom,
    )
    .map(([id]) => id);
};

/**
 * Picks the steps inside the box that Shift and a drag draws on the canvas
 * (PLAN §11.29), as it is drawn. React Flow draws the box, and selects
 * nothing, as no node is selectable; the steps' places are the layout's.
 * Goes inside `ReactFlow`, whose store has the box.
 */
export const CubeCanvasSelectionBox = (props: {
  editorState: CubeEditorState;
  positions: ReadonlyMap<string, CubeCanvasPosition>;
}): null => {
  const { editorState, positions } = props;
  const box = useStore((state) => state.userSelectionRect);
  const transform = useStore((state) => state.transform);
  useEffect(() => {
    if (box) {
      editorState.canvasSelection.setBoxSteps(
        getCubeCanvasStepsInBox(positions, box, transform),
      );
    }
  }, [editorState, positions, box, transform]);
  return null;
};
