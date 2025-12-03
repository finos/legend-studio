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

import {
  ActionState,
  assertErrorThrown,
  assertNonNullable,
  assertTrue,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { EditorStore } from '../../EditorStore.js';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  type DeployProjectResponse,
  MetadataRequestOptions,
} from '@finos/legend-graph';

export class DevMetadataState {
  readonly editorStore: EditorStore;
  result: DeployProjectResponse | undefined;
  options: MetadataRequestOptions = new MetadataRequestOptions();
  pushState = ActionState.create();

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;

    makeObservable(this, {
      pushState: observable,
      push: flow,
      options: observable,
      setOptions: action,
    });
  }

  setOptions(options: MetadataRequestOptions): void {
    this.options = options;
  }

  get projectGAV(): { groupId: string; artifactId: string } | undefined {
    const currentProjectConfiguration =
      this.editorStore.projectConfigurationEditorState.projectConfiguration;
    if (currentProjectConfiguration) {
      return {
        groupId: currentProjectConfiguration.groupId,
        artifactId: currentProjectConfiguration.artifactId,
      };
    }
    return undefined;
  }

  *push(): GeneratorFn<void> {
    try {
      this.result = undefined;
      const dependenciesSize =
        this.editorStore.graphManagerState.graph.dependencyManager
          .projectDependencyModelsIndex.size;
      assertTrue(
        dependenciesSize === 0,
        'Dependencies not supported in dev mode',
      );
      const currentProjectConfiguration =
        this.editorStore.projectConfigurationEditorState
          .currentProjectConfiguration;
      assertNonNullable(
        currentProjectConfiguration,
        'Project Name required to push to dev mode',
      );
      this.pushState.inProgress();
      const result =
        (yield this.editorStore.graphManagerState.graphManager.pushToDevMetadata(
          currentProjectConfiguration.groupId,
          currentProjectConfiguration.artifactId,
          undefined,
          this.options,
          this.editorStore.graphManagerState.graph,
        )) as DeployProjectResponse;
      this.result = result;
      this.pushState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error pushing to dev metadata: ${error.message}`,
      );
      this.pushState.fail();
    }
  }
}
