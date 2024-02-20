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

import { prettyCONSTName, type PlainObject } from '@finos/legend-shared';
import type { ProjectConfiguration } from '@finos/legend-server-sdlc';
import type { EditorStore } from '../../EditorStore.js';
import { EditorDiffViewerState } from './EditorDiffViewerState.js';
import type { SPECIAL_REVISION_ALIAS } from '../entity-diff-editor-state/EntityDiffEditorState.js';
import type { EditorState } from '../EditorState.js';

export const PROJECT_CONFIGURATION = 'PROJECT_CONFIGURATION';

export class ProjectConfigurationDiffEditorState extends EditorDiffViewerState {
  fromConfig: PlainObject<ProjectConfiguration>;
  toConfig: PlainObject<ProjectConfiguration>;
  constructor(
    fromConfig: PlainObject<ProjectConfiguration>,
    toConfig: PlainObject<ProjectConfiguration>,
    editorStore: EditorStore,
    fromRevision: SPECIAL_REVISION_ALIAS | string,
    toRevision: SPECIAL_REVISION_ALIAS | string,
  ) {
    super(fromRevision, toRevision, editorStore);
    this.fromConfig = fromConfig;
    this.toConfig = toConfig;
  }

  override get label(): string {
    return prettyCONSTName(PROJECT_CONFIGURATION);
  }

  override match(tab: EditorState): boolean {
    return (
      tab instanceof ProjectConfigurationDiffEditorState &&
      tab.fromRevision === this.fromRevision &&
      tab.toRevision === this.toRevision
    );
  }

  override get description(): string {
    return prettyCONSTName(PROJECT_CONFIGURATION);
  }
}
