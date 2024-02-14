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

import type { EditorStore } from '../../EditorStore.js';
import { EditorState } from '../EditorState.js';
import type { SPECIAL_REVISION_ALIAS } from '../entity-diff-editor-state/EntityDiffEditorState.js';

export abstract class EditorDiffViewerState extends EditorState {
  fromRevision: SPECIAL_REVISION_ALIAS | string;
  toRevision: SPECIAL_REVISION_ALIAS | string;

  constructor(
    fromRevision: SPECIAL_REVISION_ALIAS | string,
    toRevision: SPECIAL_REVISION_ALIAS | string,
    editorStore: EditorStore,
  ) {
    super(editorStore);
    this.fromRevision = fromRevision;
    this.toRevision = toRevision;
  }
}
