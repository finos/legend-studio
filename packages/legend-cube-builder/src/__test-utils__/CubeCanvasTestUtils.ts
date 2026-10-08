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

import { screen, waitFor } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../__lib__/LegendCubeTesting.js';

// The canvas's nodes, as the tests find them: React Flow keys its own wrapper
// of each node by the node's id

/** The canvas node of a query node, or `null` when it isn't drawn */
export const TEST__queryCanvasNode = (
  nodeId: string,
  container: ParentNode = document,
): HTMLElement | null =>
  container.querySelector<HTMLElement>(
    `.react-flow__node[data-id="${nodeId}"] [data-testid="${LEGEND_CUBE_TEST_ID.CANVAS_NODE}"]`,
  );

/** The canvas node of a query node, once React Flow has drawn it */
export const TEST__findCanvasNode = async (
  nodeId: string,
  container: ParentNode = document,
): Promise<HTMLElement> => {
  let node: HTMLElement | null = null;
  await waitFor(() => {
    node = TEST__queryCanvasNode(nodeId, container);
    if (!node) {
      throw new Error(`Node "${nodeId}" is not on the canvas`);
    }
  });
  return node as unknown as HTMLElement;
};

/** Every node drawn on the canvas */
export const TEST__getCanvasNodes = (): HTMLElement[] =>
  screen.queryAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_NODE);

/** The node's tooltip, one line an item: errors, warnings, description, id */
export const TEST__getCanvasNodeTooltip = (node: HTMLElement): string[] =>
  (node.getAttribute('title') ?? '').split('\n');
