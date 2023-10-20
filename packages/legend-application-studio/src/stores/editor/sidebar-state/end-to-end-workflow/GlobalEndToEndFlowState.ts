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

import { makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../EditorStore.js';
import { QueryConnectionEndToEndWorkflowEditorState } from '../../editor-state/end-to-end-workflow-state/QueryConnectionEndToEndWorkflowEditorState.js';
import { END_TO_END_WORKFLOWS } from '../../editor-state/end-to-end-workflow-state/EndToEndWorkflowEditorState.js';

export class GlobalEndToEndWorkflowState {
  editorStore: EditorStore;
  queryToConnectionWorkflowEditorState: QueryConnectionEndToEndWorkflowEditorState;

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      editorStore: false,
      queryToConnectionWorkflowEditorState: observable,
    });
    this.editorStore = editorStore;
    this.queryToConnectionWorkflowEditorState =
      new QueryConnectionEndToEndWorkflowEditorState(this.editorStore);
  }

  visitWorkflow(workflow: string): void {
    if (workflow === END_TO_END_WORKFLOWS.CREATE_QUERY_FROM_CONNECTION) {
      this.editorStore.tabManagerState.openTab(
        this.queryToConnectionWorkflowEditorState,
      );
    }
  }
}
