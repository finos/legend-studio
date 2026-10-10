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

import { addCubeNode, canAddCubeNode } from '../../stores/CubeAddPlacement.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';

// Drag and drop on the canvas (spec §17.3): palette items and nodes are
// dragged; nodes and the canvas take drops. The app's HTML5 backend provider
// wraps every Legend application, so Cube mounts none of its own.

export enum CUBE_DND_TYPE {
  PALETTE_ITEM = 'legend-cube.palette-item',
  NODE = 'legend-cube.node',
}

/** A palette item carries the type of node it adds */
export interface CubePaletteDragItem {
  readonly nodeType: string;
}

/** A node carries only its id */
export interface CubeNodeDragItem {
  readonly nodeId: string;
}

export type CubeDragItem = CubePaletteDragItem | CubeNodeDragItem;

const isNodeDragItem = (item: CubeDragItem): item is CubeNodeDragItem =>
  'nodeId' in item;

/**
 * Whether dropping the item on the node does anything, which also decides
 * whether the node lights up under it: a transform is spliced in after the
 * node, another node connects to it or else moves after it. A source is the
 * canvas's, whatever node it is dropped on (PLAN §11.6, U4).
 */
export const canDropOnCubeNode = (
  editorState: CubeEditorState,
  item: CubeDragItem,
  targetId: string,
): boolean =>
  isNodeDragItem(item)
    ? editorState.canDropNode(item.nodeId, targetId)
    : editorState.registry.get(item.nodeType)?.kind !== 'source' &&
      canAddCubeNode(editorState, item.nodeType, targetId);

export const dropOnCubeNode = (
  editorState: CubeEditorState,
  item: CubeDragItem,
  targetId: string,
): void => {
  if (isNodeDragItem(item)) {
    editorState.dropNode(item.nodeId, targetId);
  } else {
    addCubeNode(editorState, item.nodeType, targetId);
  }
};

/**
 * A palette item dropped on the canvas (PLAN §11.6, U3 and U4): a transform
 * around the nodes goes after the selected node; a source opens the source
 * dialog on its tab, even dropped on a node, which leaves it to the canvas.
 * A transform dropped on a node is the node's, taken or refused.
 */
export const dropOnCubeCanvas = (
  editorState: CubeEditorState,
  item: CubeDragItem,
  isOverNode: boolean,
): void => {
  if (
    !isNodeDragItem(item) &&
    (!isOverNode || editorState.registry.get(item.nodeType)?.kind === 'source')
  ) {
    addCubeNode(editorState, item.nodeType);
  }
};
