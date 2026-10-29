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

import { describe, expect, test } from '@jest/globals';
import { getBezierPath, Position } from '@xyflow/react';
import { getCubeCanvasEdgePath } from '../CubeCanvasEdge.js';

/** From a node's output in the first column to a node's input in the fourth */
const EDGE = {
  sourceX: 200,
  sourceY: 36,
  sourcePosition: Position.Right,
  targetX: 768,
  targetY: 100,
  targetPosition: Position.Left,
};

describe('The path of an edge on the canvas', () => {
  test('Is the curve React Flow draws, for an edge that skips no column', () => {
    const edge = { ...EDGE, targetX: 256 };
    expect(getCubeCanvasEdgePath(edge, [])).toBe(getBezierPath(edge)[0]);
  });

  test('Goes straight across each column an edge skips, in its lane, and curves only between columns', () => {
    const path = getCubeCanvasEdgePath(EDGE, [
      { x: 256, y: 36 },
      { x: 512, y: 244 },
    ]);
    expect(path).toBe(
      'M200,36 C228,36 228,36 256,36 L456,36 C484,36 484,244 512,244 L712,244 C740,244 740,100 768,100',
    );
    // into the target, the same curve as an edge from the last lane would be
    const [last] = getBezierPath({ ...EDGE, sourceX: 712, sourceY: 244 });
    expect(path.endsWith(last.replace(/^M\S+/u, ''))).toBe(true);
  });
});
