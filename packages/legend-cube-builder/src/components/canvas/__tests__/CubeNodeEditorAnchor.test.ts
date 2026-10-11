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
import {
  type CubeScreenRect,
  getCubeNodeScreenRect,
  isCubeNodeInView,
  toDOMRect,
} from '../CubeNodeEditorAnchor.js';

/** A canvas 800 by 400, away from the window's corner */
const CANVAS: CubeScreenRect = { left: 100, top: 50, width: 800, height: 400 };

/** A node 200 by 72 with its top-left corner here */
const node = (left: number, top: number): CubeScreenRect => ({
  left,
  top,
  width: 200,
  height: 72,
});

describe('Node editor anchor', () => {
  test("Places a node on the screen by its layout position, the canvas's pan and zoom, and the canvas's place", () => {
    expect(
      getCubeNodeScreenRect({ x: 100, y: 50 }, [10, 20, 1], {
        left: 5,
        top: 7,
      }),
    ).toEqual({ left: 115, top: 77, width: 200, height: 72 });
  });

  test('Scales the node, and its position but not the pan, by the zoom', () => {
    expect(
      getCubeNodeScreenRect({ x: 100, y: 50 }, [10, 20, 0.5], {
        left: 5,
        top: 7,
      }),
    ).toEqual({ left: 65, top: 52, width: 100, height: 36 });
  });

  test('Counts a node as in view when any of it overlaps the canvas', () => {
    // inside
    expect(isCubeNodeInView(node(300, 200), CANVAS)).toBe(true);
    // a pixel over each edge
    expect(isCubeNodeInView(node(-99, 200), CANVAS)).toBe(true);
    expect(isCubeNodeInView(node(899, 200), CANVAS)).toBe(true);
    expect(isCubeNodeInView(node(300, -21), CANVAS)).toBe(true);
    expect(isCubeNodeInView(node(300, 449), CANVAS)).toBe(true);
    // larger than the canvas, covering it
    expect(
      isCubeNodeInView({ left: 0, top: 0, width: 2000, height: 2000 }, CANVAS),
    ).toBe(true);
  });

  test("Counts a node only touching the canvas's edge as out of view", () => {
    // right edge on the canvas's left, left edge on its right
    expect(isCubeNodeInView(node(-100, 200), CANVAS)).toBe(false);
    expect(isCubeNodeInView(node(900, 200), CANVAS)).toBe(false);
    // bottom edge on the canvas's top, top edge on its bottom
    expect(isCubeNodeInView(node(300, -22), CANVAS)).toBe(false);
    expect(isCubeNodeInView(node(300, 450), CANVAS)).toBe(false);
  });

  test('Counts a node fully left, right, above or below the canvas as out of view', () => {
    expect(isCubeNodeInView(node(-500, 200), CANVAS)).toBe(false);
    expect(isCubeNodeInView(node(1200, 200), CANVAS)).toBe(false);
    expect(isCubeNodeInView(node(300, -300), CANVAS)).toBe(false);
    expect(isCubeNodeInView(node(300, 900), CANVAS)).toBe(false);
  });

  test('Counts every node as in view on a canvas not laid out yet', () => {
    const farAway = node(5000, 5000);
    expect(isCubeNodeInView(farAway, { ...CANVAS, width: 0 })).toBe(true);
    expect(isCubeNodeInView(farAway, { ...CANVAS, height: 0 })).toBe(true);
    // and a canvas of some size does hide it
    expect(isCubeNodeInView(farAway, CANVAS)).toBe(false);
  });

  test('Gives the rectangle as a DOM rectangle, with its corners', () => {
    const rect = toDOMRect({ left: 115, top: 77, width: 200, height: 72 });
    expect({
      x: rect.x,
      y: rect.y,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    }).toEqual({
      x: 115,
      y: 77,
      left: 115,
      top: 77,
      right: 315,
      bottom: 149,
      width: 200,
      height: 72,
    });
  });
});
