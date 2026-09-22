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
  type MatViewDataSet,
  type PackageableElement,
  type V1_RawLineageModel,
  type ArtifactGenerationExtensionResult,
  type IngestionDefinitionArtifact,
  GRAPH_MANAGER_EVENT,
  IngestDefinition,
} from '@finos/legend-graph';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeType,
  LogEvent,
  type GeneratorFn,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  EditorInitialConfiguration,
  IngestElementEditorInitialConfiguration,
} from '../ElementEditorInitialConfiguration.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateUrlWithEditorConfig } from '../../../../../__lib__/LegendStudioNavigation.js';
import { LineageState } from '@finos/legend-query-builder';
import { IngestTestableState } from './IngestTestableState.js';

export enum INGEST_DEFINITION_TAB {
  DEFINITION = 'Definition',
  TESTING = 'Testing',
}

export const INGEST_DEFINITION_ARTIFACT_EXTENSION = 'ingestDefinition';

const createEditorInitialConfiguration = (): EditorInitialConfiguration => {
  const config = new EditorInitialConfiguration();
  const ingest = new IngestElementEditorInitialConfiguration();
  ingest.deployOnOpen = true;
  config.elementEditorConfiguration = ingest;
  return config;
};

const editorInitialConfigToBase64 = (val: EditorInitialConfiguration): string =>
  btoa(JSON.stringify(EditorInitialConfiguration.serialization.toJson(val)));

export const generateUrlToDeployOnOpen = (
  val: IngestDefinitionEditorState,
): string => {
  return val.editorStore.applicationStore.navigationService.navigator.generateAddress(
    EXTERNAL_APPLICATION_NAVIGATION__generateUrlWithEditorConfig(
      val.editorStore.editorMode.generateElementLink(val.ingest.path),
      editorInitialConfigToBase64(createEditorInitialConfiguration()),
    ),
  );
};

type CachedIngestArtifact = {
  hashCode: string;
  artifact: IngestionDefinitionArtifact;
};

export class IngestDefinitionEditorState extends ElementEditorState {
  selectedTab = INGEST_DEFINITION_TAB.DEFINITION;
  lineageGenerationState = ActionState.create();
  artifactGenerationState = ActionState.create();
  ingestionArtifact: IngestionDefinitionArtifact | undefined;
  cachedArtfact: CachedIngestArtifact | undefined;
  deployOnOpen = false;
  lineageState: LineageState;
  ingestTestableState: IngestTestableState;

  constructor(
    editorStore: EditorStore,
    element: PackageableElement,
    config?: EditorInitialConfiguration,
  ) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      deployOnOpen: observable,
      setDeployOnOpen: observable,
      cachedArtfact: observable,
      ingestionArtifact: observable,
      setSelectedTab: action,
      setIngestCachedArtifact: action,
      setIngestionArtifact: action,
      generateLineage: flow,
      generateArtifact: flow,
    });
    if (
      config?.elementEditorConfiguration instanceof
      IngestElementEditorInitialConfiguration
    ) {
      this.deployOnOpen =
        config.elementEditorConfiguration.deployOnOpen ?? false;
    }
    this.lineageState = new LineageState(this.editorStore.applicationStore);
    this.ingestTestableState = new IngestTestableState(this);
    this.ingestTestableState.init();
  }

  setSelectedTab(val: INGEST_DEFINITION_TAB): void {
    this.selectedTab = val;
  }

  setDeployOnOpen(value: boolean): void {
    this.deployOnOpen = value;
  }

  setIngestionArtifact(val: IngestionDefinitionArtifact | undefined): void {
    this.ingestionArtifact = val;
  }

  setIngestCachedArtifact(val: CachedIngestArtifact | undefined): void {
    this.cachedArtfact = val;
  }

  getMatviewFuncNames(): string[] {
    return (
      this.ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.map(
        (dataset) => dataset.name,
      ) ?? []
    );
  }

  *generateLineage(matviewDataset: MatViewDataSet): GeneratorFn<void> {
    if (this.lineageGenerationState.isInProgress) {
      this.editorStore.applicationStore.notificationService.notifyError(
        'Lineage generation in progress already',
      );
      return;
    }
    try {
      this.lineageGenerationState.inProgress();

      const query = matviewDataset.source.function;

      const lineageRawData =
        (yield this.editorStore.graphManagerState.graphManager.generateLineage(
          query,
          undefined,
          undefined,
          this.editorStore.graphManagerState.graph,
          undefined,
        )) as V1_RawLineageModel;
      const lineageData =
        this.editorStore.graphManagerState.graphManager.buildLineage(
          lineageRawData,
        );
      this.lineageState.setLineageData(lineageData);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.LINEAGE_GENERATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.lineageGenerationState.complete();
    }
  }

  *generateArtifact(): GeneratorFn<void> {
    if (this.artifactGenerationState.isInProgress) {
      this.editorStore.applicationStore.notificationService.notifyError(
        'Artifact generation in progress already',
      );
      return;
    }
    const currentHashCode = this.ingest.hashCode;
    if (this.cachedArtfact?.hashCode === currentHashCode) {
      // reuse cached artifact if the ingest definition has not changed
      this.setIngestionArtifact(this.cachedArtfact.artifact);
      return;
    }
    try {
      this.artifactGenerationState.inProgress();
      const generatedArtifacts =
        (yield this.editorStore.graphManagerState.graphManager.generateArtifacts(
          this.editorStore.graphManagerState.graph,
          this.editorStore.graphEditorMode.getGraphTextInputOption(),
          [this.ingest.path],
        )) as ArtifactGenerationExtensionResult;
      const ingestArtifact = generatedArtifacts.values.find(
        (artifact) =>
          artifact.extension === INGEST_DEFINITION_ARTIFACT_EXTENSION,
      );
      const artifactContent =
        ingestArtifact?.artifactsByExtensionElements[0]?.files[0]?.content;
      if (!artifactContent) {
        throw new Error(
          `Could not find generated ingest definition artifact for '${this.ingest.path}'`,
        );
      }
      const artifact =
        this.editorStore.graphManagerState.graphManager.buildIngestDefinitionArtifact(
          JSON.parse(artifactContent) as Record<PropertyKey, unknown>,
          this.editorStore.graphManagerState.graph,
        );
      this.setIngestCachedArtifact({
        hashCode: currentHashCode,
        artifact,
      });
      this.setIngestionArtifact(artifact);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(
        `Failed to generate ingest artifact: ${error.message}`,
      );
    } finally {
      this.artifactGenerationState.complete();
    }
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new IngestDefinitionEditorState(editorStore, newElement);
  }

  get validForLineageViewer(): boolean {
    return Boolean(this.ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.length);
  }

  get ingest(): IngestDefinition {
    return guaranteeType(
      this.element,
      IngestDefinition,
      'Element inside ingest editor state must be a IngestDefinition',
    );
  }
}
