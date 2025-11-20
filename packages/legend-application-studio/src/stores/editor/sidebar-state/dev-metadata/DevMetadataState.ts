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
  assertNonEmptyString,
  assertNonNullable,
  assertTrue,
  filterByType,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { EditorStore } from '../../EditorStore.js';
import { action, flow, makeObservable, observable } from 'mobx';
import { type DevMetadataResult, IngestDefinition } from '@finos/legend-graph';
import { generateGAVCoordinates } from '@finos/legend-storage';

export class DevMetadataState {
  readonly editorStore: EditorStore;
  result: DevMetadataResult | undefined;
  pushState = ActionState.create();
  did = '';

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;

    makeObservable(this, {
      pushState: observable,
      did: observable,
      setDid: action,
      push: flow,
      init: action,
    });
  }

  setDid(did: string): void {
    this.did = did;
  }

  init(): void {
    if (!this.did) {
      const ingestDID = this.editorStore.graphManagerState.graph.allElements
        .filter(filterByType(IngestDefinition))[0]
        ?.appDirDeployment?.appDirId?.toString();
      if (ingestDID) {
        this.setDid(ingestDID);
      }
    }
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
      const projectId = generateGAVCoordinates(
        currentProjectConfiguration.groupId,
        currentProjectConfiguration.artifactId,
        undefined,
      );
      assertNonEmptyString(this.did, 'DID required to push to dev mode');
      this.pushState.inProgress();
      this.editorStore.applicationStore.alertService.setBlockingAlert({
        message: 'Pushing to Dev Mode',
        showLoading: true,
      });
      const result =
        (yield this.editorStore.graphManagerState.graphManager.pushToDevMetadata(
          this.did,
          projectId,
          this.editorStore.graphManagerState.graph,
        )) as DevMetadataResult;
      this.result = result;
      this.editorStore.applicationStore.notificationService.notifySuccess(
        `Pushed to dev mode`,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.pushState.fail();
    } finally {
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
    }
  }
}
