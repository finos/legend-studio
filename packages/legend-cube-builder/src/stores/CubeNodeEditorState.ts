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

import type { QueryNode } from '@finos/legend-cube';
import { action, computed, makeObservable, observable } from 'mobx';
import type { CubeEditorState } from './CubeEditorState.js';

/**
 * The node editor in the side panel (PLAN §7.4): which node it shows. Opening
 * it never changes which node Execute runs.
 */
export class CubeNodeEditorState {
  readonly editorState: CubeEditorState;

  /** The id of the node the panel shows, while it is open */
  nodeId: string | undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      nodeId: observable,
      node: computed,
      open: action,
      close: action,
    });
    this.editorState = editorState;
  }

  /** The node the panel shows, as the cube has it now */
  get node(): QueryNode | undefined {
    return this.nodeId === undefined
      ? undefined
      : this.editorState.document.query.getNode(this.nodeId);
  }

  open(nodeId: string): void {
    if (this.editorState.document.query.getNode(nodeId)) {
      this.nodeId = nodeId;
    }
  }

  close(): void {
    this.nodeId = undefined;
  }
}
