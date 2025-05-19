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

import { IngestDefinition, type PackageableElement } from '@finos/legend-graph';
import { ElementEditorState } from '../ElementEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  ActionState,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  type GeneratorFn,
} from '@finos/legend-shared';
import type { IngestionManager } from '../../../../ingestion/IngestionManager.js';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type {
  IngestDefinitionValidationResponse,
  ValidateAndDeploymentResponse,
} from '../../../../ingestion/IngestionDeploymentResponse.js';
import {
  EditorInitialConfiguration,
  IngestElementEditorInitialConfiguration,
} from '../ElementEditorInitialConfiguration.js';
import type { AuthContextProps } from 'react-oidc-context';
import { EXTERNAL_APPLICATION_NAVIGATION__generateUrlWithEditorConfig } from '../../../../../__lib__/LegendStudioNavigation.js';

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
export class IngestDefinitionEditorState extends ElementEditorState {
  validationError: IngestDefinitionValidationResponse | undefined;
  deploymentState = ActionState.create();
  deployOnOpen = false;

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
      validationError: observable,
      setValError: action,
      init_with_deploy: flow,
      deploy: flow,
    });
    const elementConfig = config?.elementEditorConfiguration;
    if (elementConfig instanceof IngestElementEditorInitialConfiguration) {
      this.deployOnOpen = elementConfig.deployOnOpen ?? false;
    }
  }

  get ingestionManager(): IngestionManager | undefined {
    return this.editorStore.ingestionManager;
  }

  setValError(val: IngestDefinitionValidationResponse | undefined): void {
    this.validationError = val;
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
        guaranteeNonNullable(this.textContent),
        guaranteeNonNullable(this.ingest.appDirDeployment),
        this.deploymentState,
        token,
      )) as unknown as ValidateAndDeploymentResponse;
      const deploymentResponse = response.deploymentResponse;
      if (deploymentResponse) {
        this.editorStore.applicationStore.notificationService.notifySuccess(
          `Ingest definition successfully deployed on ${deploymentResponse.ingestDefinitionUrn}`,
        );
      } else {
        this.setValError(response.validationResponse);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Ingest definition failed to deploy: ${error.message}`,
      );
    } finally {
      this.deploymentState.complete();
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
