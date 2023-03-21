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

import type { EditorStore } from '../editor/EditorStore.js';
import { observable, makeObservable, action } from 'mobx';
import { ActionState } from '@finos/legend-shared';
import type { ProjectVersionPlatformDependency } from '@finos/legend-server-depot';
import type { ProjectConfiguration } from '@finos/legend-server-sdlc';
import type { ProjectOverviewState } from './ProjectOverviewState.js';

export class ProjectDependantEditorState {
  configState: ProjectOverviewState;
  editorStore: EditorStore;
  isReadOnly: boolean;
  dependants: ProjectVersionPlatformDependency[] | undefined;
  fetchingDependantInfoState = ActionState.create();

  constructor(configState: ProjectOverviewState, editorStore: EditorStore) {
    makeObservable(this, {
      dependants: observable,
      fetchingDependantInfoState: observable,
      setDependants: action,
    });
    this.configState = configState;
    this.editorStore = editorStore;
    this.isReadOnly = editorStore.isInViewerMode;
  }

  get projectConfiguration(): ProjectConfiguration | undefined {
    return this.editorStore.projectConfigurationEditorState
      .projectConfiguration;
  }

  setDependants(value: ProjectVersionPlatformDependency[] | undefined): void {
    this.dependants = value;
  }
}
