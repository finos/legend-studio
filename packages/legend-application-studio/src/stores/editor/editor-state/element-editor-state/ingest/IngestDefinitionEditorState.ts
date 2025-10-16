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
  GRAPH_MANAGER_EVENT,
  IngestDefinition,
} from '@finos/legend-graph';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  ActionState,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  LogEvent,
  removePrefix,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import type {
  IngestDefinitionDeploymentResponse,
  IngestDefinitionValidationResponse,
  LakehouseIngestionManager,
  ValidateAndDeploymentResponse,
} from '@finos/legend-server-lakehouse';
import {
  EditorInitialConfiguration,
  IngestElementEditorInitialConfiguration,
} from '../ElementEditorInitialConfiguration.js';
import type { AuthContextProps } from 'react-oidc-context';
import { EXTERNAL_APPLICATION_NAVIGATION__generateUrlWithEditorConfig } from '../../../../../__lib__/LegendStudioNavigation.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import { LineageState } from '@finos/legend-query-builder';

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

const PARSER_SECTION = `###Lakehouse`;
export class IngestDefinitionEditorState extends ElementEditorState {
  validateAndDeployResponse: ValidateAndDeploymentResponse | undefined;
  deploymentState = ActionState.create();
  lineageGenerationState = ActionState.create();
  deployOnOpen = false;
  lineageState: LineageState;

  constructor(
    editorStore: EditorStore,
    element: PackageableElement,
    config?: EditorInitialConfiguration,
  ) {
    super(editorStore, element);

    makeObservable(this, {
      deploymentState: observable,
      deployOnOpen: observable,
      setDeployOnOpen: observable,
      validateAndDeployResponse: observable,
      deploymentResponse: computed,
      setValidateAndDeployResponse: action,
      init_with_deploy: flow,
      deploy: flow,
      generateLineage: flow,
    });
    if (
      config?.elementEditorConfiguration instanceof
      IngestElementEditorInitialConfiguration
    ) {
      this.deployOnOpen =
        config.elementEditorConfiguration.deployOnOpen ?? false;
    }
    this.lineageState = new LineageState(this.editorStore.applicationStore);
  }

  get deploymentResponse():
    | IngestDefinitionDeploymentResponse
    | IngestDefinitionValidationResponse
    | undefined {
    return (
      this.validateAndDeployResponse?.deploymentResponse ??
      this.validateAndDeployResponse?.validationResponse
    );
  }

  get ingestionManager(): LakehouseIngestionManager | undefined {
    return this.editorStore.ingestionManager;
  }

  setValidateAndDeployResponse(
    val: ValidateAndDeploymentResponse | undefined,
  ): void {
    this.validateAndDeployResponse = val;
  }

  setDeployOnOpen(value: boolean): void {
    this.deployOnOpen = value;
  }

  *init_with_deploy(auth: AuthContextProps): GeneratorFn<void> {
    this.setDeployOnOpen(false);
    if (!auth.isAuthenticated) {
      auth
        .signinRedirect({
          state: generateUrlToDeployOnOpen(this),
        })
        .catch(this.editorStore.applicationStore.alertUnhandledError);
      return;
    }
    const token = auth.user?.access_token;
    yield flowResult(this.generateElementGrammar()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    flowResult(this.deploy(token)).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
  }

  *deploy(token: string | undefined): GeneratorFn<void> {
    try {
      assertTrue(
        this.validForDeployment,
        'Ingest definition is not valid for deployment',
      );
      this.deploymentState.inProgress();
      const response = (yield guaranteeNonNullable(
        this.ingestionManager,
      ).deploy(
        // remove parser prefix for now since api already expects it to be under lakehouse parser
        guaranteeNonNullable(removePrefix(this.textContent, PARSER_SECTION)),
        guaranteeNonNullable(this.ingest.appDirDeployment),
        (val: string) =>
          this.editorStore.applicationStore.alertService.setBlockingAlert({
            message: val,
            showLoading: true,
          }),
        token,
      )) as unknown as ValidateAndDeploymentResponse;
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
      if (response.deploymentResponse) {
        this.editorStore.applicationStore.logService.info(
          LogEvent.create(LEGEND_STUDIO_APP_EVENT.INGESTION_DEPLOY_SUCCESS_URN),
          response.deploymentResponse.ingestDefinitionUrn,
        );
      }
      this.setValidateAndDeployResponse(response);
    } catch (error) {
      this.editorStore.applicationStore.alertService.setBlockingAlert(
        undefined,
      );
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Ingest definition failed to deploy: ${error.message}`,
      );
    } finally {
      this.deploymentState.complete();
    }
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

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    return new IngestDefinitionEditorState(editorStore, newElement);
  }

  get validForDeployment(): boolean {
    return Boolean(
      this.ingest.appDirDeployment && this.textContent && this.ingestionManager,
    );
  }

  get validForLineageViewer(): boolean {
    return Boolean(this.ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.length);
  }

  get validationMessage(): string {
    if (!this.ingest.appDirDeployment) {
      return 'No app dir deployment found';
    } else if (!this.textContent) {
      return 'No ingest definition found';
    } else if (!this.ingestionManager) {
      return 'No ingestion manager found';
    }
    return 'Deploy';
  }

  get ingest(): IngestDefinition {
    return guaranteeType(
      this.element,
      IngestDefinition,
      'Element inside ingest editor state must be a IngestDefinition',
    );
  }
}
