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
  type PlainObject,
} from '@finos/legend-shared';
import type { EditorStore } from '../../EditorStore.js';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  type DeployProjectResponse,
  MetadataRequestOptions,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import { LegendStudioTelemetryHelper } from '../../../../__lib__/LegendStudioTelemetryHelper.js';

export const DEV_SNAPSHOT_VERSION = '1.0.0-SNAPSHOT';

export class DevMetadataState {
  readonly editorStore: EditorStore;
  result: DeployProjectResponse | undefined;
  options: MetadataRequestOptions = new MetadataRequestOptions();
  pushState = ActionState.create();

  // Compare-with-dev state
  compareState = ActionState.create();
  currentWorkspaceCode: string | undefined;
  snapshotCode: string | undefined;
  snapshotNotAvailable = false;
  isCompareModalOpen = false;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;

    makeObservable(this, {
      pushState: observable,
      push: flow,
      options: observable,
      setOptions: action,
      compareState: observable,
      currentWorkspaceCode: observable,
      snapshotCode: observable,
      snapshotNotAvailable: observable,
      isCompareModalOpen: observable,
      openCompareModal: action,
      closeCompareModal: action,
      compareWithSnapshot: flow,
    });
  }

  setOptions(options: MetadataRequestOptions): void {
    this.options = options;
  }

  openCompareModal(): void {
    this.isCompareModalOpen = true;
  }

  closeCompareModal(): void {
    this.isCompareModalOpen = false;
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

  *compareWithSnapshot(): GeneratorFn<void> {
    try {
      this.compareState.inProgress();
      this.snapshotNotAvailable = false;
      this.currentWorkspaceCode = undefined;
      this.snapshotCode = undefined;
      const gav = this.projectGAV;
      assertNonNullable(gav, 'Project configuration is required to compare');
      const graphManager = this.editorStore.graphManagerState.graphManager;

      // 1) Current workspace -> Pure code (same as toggling to text mode)
      const currentCode = (yield graphManager.graphToPureCode(
        this.editorStore.graphManagerState.graph,
        { pretty: true, excludeUnknown: true },
      )) as string;
      this.currentWorkspaceCode = currentCode;

      // 2) Snapshot from depot -> Pure code; if the call fails we treat
      // it as "nothing deployed yet"
      let snapshotEntities: Entity[] | undefined;
      try {
        const entitiesJson =
          (yield this.editorStore.depotServerClient.getVersionEntities(
            gav.groupId,
            gav.artifactId,
            DEV_SNAPSHOT_VERSION,
          )) as PlainObject<Entity>[];
        snapshotEntities = entitiesJson as unknown as Entity[];
      } catch {
        this.snapshotNotAvailable = true;
        this.compareState.complete();
        return;
      }

      const snapshotCode = (yield graphManager.entitiesToPureCode(
        snapshotEntities,
        { pretty: true },
      )) as string;
      this.snapshotCode = snapshotCode;
      this.compareState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error comparing with dev snapshot: ${error.message}`,
      );
      this.compareState.fail();
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
      this.pushState.inProgress();
      LegendStudioTelemetryHelper.logEvent_DevMetadataPushLaunched(
        this.editorStore.applicationStore.telemetryService,
        this.editorStore.editorMode.getSourceInfo(),
        currentProjectConfiguration.groupId,
        currentProjectConfiguration.artifactId,
        undefined,
      );
      const result =
        (yield this.editorStore.graphManagerState.graphManager.pushToDevMetadata(
          currentProjectConfiguration.groupId,
          currentProjectConfiguration.artifactId,
          undefined,
          this.options,
          this.editorStore.graphManagerState.graph,
        )) as DeployProjectResponse;
      this.result = result;
      LegendStudioTelemetryHelper.logEvent_DevMetadataPushSucceeded(
        this.editorStore.applicationStore.telemetryService,
        this.editorStore.editorMode.getSourceInfo(),
        currentProjectConfiguration.groupId,
        currentProjectConfiguration.artifactId,
        undefined,
        result.finalStatus,
      );
      this.pushState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error pushing to dev metadata: ${error.message}`,
      );
      LegendStudioTelemetryHelper.logEvent_DevMetadataPushFailure(
        this.editorStore.applicationStore.telemetryService,
        this.editorStore.editorMode.getSourceInfo(),
        error.message,
      );
      this.pushState.fail();
    }
  }
}
