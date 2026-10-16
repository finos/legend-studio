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
import { getViewportForBounds } from '@xyflow/react';
import {
  CUBE_CANVAS_LEFT_MARGIN,
  getCubeCanvasLeftAlignedViewport,
} from '../CubeCanvas.js';

describe('The graph fitted to the left of the canvas', () => {
  test('Puts a small graph against the left edge, at full size, centred top to bottom', () => {
    const bounds = { x: 100, y: 50, width: 400, height: 100 };
    const viewport = getCubeCanvasLeftAlignedViewport(bounds, 1000, 500);
    expect(viewport.zoom).toBe(1);
    // the graph's left edge shows at the margin
    expect(bounds.x * viewport.zoom + viewport.x).toBe(CUBE_CANVAS_LEFT_MARGIN);
    // and top to bottom, as fitting it would
    expect(viewport.y).toBe(
      getViewportForBounds(bounds, 1000, 500, 0.2, 1, 0.1).y,
    );
  });

  test('Zooms a wide graph out as fitting it would, still from the left', () => {
    const bounds = { x: -20, y: 0, width: 3000, height: 200 };
    const viewport = getCubeCanvasLeftAlignedViewport(bounds, 1000, 500);
    const fitted = getViewportForBounds(bounds, 1000, 500, 0.2, 1, 0.1);
    expect(viewport.zoom).toBe(fitted.zoom);
    expect(viewport.zoom).toBeLessThan(1);
    expect(bounds.x * viewport.zoom + viewport.x).toBeCloseTo(
      CUBE_CANVAS_LEFT_MARGIN,
    );
  });
});
