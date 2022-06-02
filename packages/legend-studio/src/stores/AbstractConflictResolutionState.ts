/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type {
  EntityChangeConflict,
  EntityChangeConflictResolution,
} from '@finos/legend-server-sdlc';
import type { GeneratorFn } from '@finos/legend-shared';
import type { EntityChangeConflictEditorState } from './editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import type { EditorSDLCState } from './EditorSDLCState.js';
import type { EditorStore } from './EditorStore.js';

export abstract class AbstractConflictResolutionState {
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;

  /**
   * This helps maintain the current merge text that the user is working on.
   * If we just use editor store to keep track of the current tab, what happens
   * is when the user closes the merge-conflict tab and re-open it, they will lose
   * their current progress because we will make network call again to recompute
   * the three way merge.
   */
  mergeEditorStates: EntityChangeConflictEditorState[] = [];

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
  }

  abstract get resolutions(): EntityChangeConflictResolution[];

  abstract openConflict(conflict: EntityChangeConflict): void;

  abstract closeConflict(conflict: EntityChangeConflictEditorState): void;

  abstract resolveConflict(resolution: EntityChangeConflictResolution): void;

  abstract markConflictAsResolved(
    conflict: EntityChangeConflictEditorState,
  ): GeneratorFn<void>;
}
