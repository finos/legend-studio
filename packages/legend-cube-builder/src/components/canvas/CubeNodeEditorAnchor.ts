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
  CUBE_CANVAS_NODE_HEIGHT,
  CUBE_CANVAS_NODE_WIDTH,
  type CubeCanvasPosition,
} from './CubeCanvasLayout.js';

/** A rectangle on the screen, in pixels from the window's top-left corner */
export interface CubeScreenRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** React Flow's viewport: the pan, then the zoom */
export type CubeCanvasTransform = readonly [
  translateX: number,
  translateY: number,
  zoom: number,
];

/**
 * Where a node is on the screen: its place in the layout, moved by the
 * canvas's pan and zoom, inside the canvas's own place on the screen. Every
 * node is the same size (PLAN §7.2), so nothing is measured.
 */
export const getCubeNodeScreenRect = (
  position: CubeCanvasPosition,
  transform: CubeCanvasTransform,
  canvas: Pick<CubeScreenRect, 'left' | 'top'>,
): CubeScreenRect => {
  const [translateX, translateY, zoom] = transform;
  return {
    left: canvas.left + translateX + position.x * zoom,
    top: canvas.top + translateY + position.y * zoom,
    width: CUBE_CANVAS_NODE_WIDTH * zoom,
    height: CUBE_CANVAS_NODE_HEIGHT * zoom,
  };
};

/**
 * Whether any of the node shows inside the canvas: a node panned out of
 * view hides its editor, which stays open with its edits. A canvas not laid
 * out yet (no size) hides nothing.
 */
export const isCubeNodeInView = (
  node: CubeScreenRect,
  canvas: CubeScreenRect,
): boolean =>
  canvas.width <= 0 ||
  canvas.height <= 0 ||
  (node.left < canvas.left + canvas.width &&
    node.left + node.width > canvas.left &&
    node.top < canvas.top + canvas.height &&
    node.top + node.height > canvas.top);

/** The rectangle as the DOM gives one, for a positioning library to read */
export const toDOMRect = (rect: CubeScreenRect): DOMRect =>
  ({
    ...rect,
    x: rect.left,
    y: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => rect,
  }) as DOMRect;
