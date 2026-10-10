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

import type { CubeEditorState } from './CubeEditorState.js';

// Where a node added from the palette, the canvas's context menu or 'Add
// Items' goes (PLAN §11.6, QUESTIONS.md U3 and U4): one rule for all of them.

/**
 * The node a new node of the type goes after: a transform after the node it
 * was dropped on or picked from, else after the selected node, standing alone
 * only in an empty query; a source after none, whatever node it was dropped
 * on, since it opens the source dialog and is added unconnected
 */
export const getCubeAddAfterId = (
  editorState: CubeEditorState,
  type: string,
  targetNodeId?: string,
): string | undefined =>
  editorState.registry.get(type)?.kind === 'source'
    ? undefined
    : (targetNodeId ?? editorState.document.query.selected);

/** Whether a node of the type can be added where the rule puts it */
export const canAddCubeNode = (
  editorState: CubeEditorState,
  type: string,
  targetNodeId?: string,
): boolean =>
  editorState.canAddNode(
    type,
    getCubeAddAfterId(editorState, type, targetNodeId),
  );

/**
 * Adds a node of the type where the rule puts it, after the node editor's
 * edits are applied: a transform with its defaults, no editor opened; a
 * source through the source dialog, on its tab
 */
export const addCubeNode = (
  editorState: CubeEditorState,
  type: string,
  targetNodeId?: string,
): void => {
  if (
    canAddCubeNode(editorState, type, targetNodeId) &&
    editorState.nodeEditor.finishApplied()
  ) {
    editorState.addNode(
      type,
      getCubeAddAfterId(editorState, type, targetNodeId),
    );
  }
};
