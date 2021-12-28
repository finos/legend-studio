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

import { action, computed, makeAutoObservable } from 'mobx';
import type { ServiceEditorState } from '../../../editor-state/element-editor-state/service/ServiceEditorState';
import type { EditorStore } from '../../../EditorStore';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  ActionState,
  prettyCONSTName,
  assertNonEmptyString,
  guaranteeNonNullable,
  UnsupportedOperationError,
  getNullableFirstElement,
  assertTrue,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_LOG_EVENT_TYPE } from '../../../LegendStudioLogEvent';
import { Version } from '@finos/legend-server-sdlc';
import {
  type ServiceRegistrationResult,
  ServiceExecutionMode,
} from '@finos/legend-graph';
import { ServiceRegistrationEnvInfo } from '../../../../application/LegendStudioConfig';

export const LATEST_PROJECT_REVISION = 'Latest Project Revision';

const getServiceExecutionMode = (mode: string): ServiceExecutionMode => {
  switch (mode) {
    case ServiceExecutionMode.FULL_INTERACTIVE:
      return ServiceExecutionMode.FULL_INTERACTIVE;
    case ServiceExecutionMode.SEMI_INTERACTIVE:
      return ServiceExecutionMode.SEMI_INTERACTIVE;
    case ServiceExecutionMode.PROD:
      return ServiceExecutionMode.PROD;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported service execution mode '${mode}'`,
      );
  }
};

interface ServiceVersionOption {
  label: string;
  value: Version | string;
}

export class ServiceRegistrationState {
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  modal = false;
  registrationState = ActionState.create();
  serviceEnv?: string | undefined;
  serviceExecutionMode?: ServiceExecutionMode | undefined;
  projectVersion?: Version | string | undefined;
  activatePostRegistration = true;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      setModal: action,
      executionModes: computed,
      updateVersion: action,
      setProjectVersion: action,
      openModal: action,
      initialize: action,
      updateType: action,
      updateEnv: action,
      setActivatePostRegistration: action,
    });

    this.editorStore = editorStore;
    this.serviceEditorState = serviceEditorState;
  }

  setModal(modal: boolean): void {
    this.modal = modal;
  }
  setServiceEnv(val: string | undefined): void {
    this.serviceEnv = val;
  }
  setServiceExecutionMode(val: ServiceExecutionMode | undefined): void {
    this.serviceExecutionMode = val;
  }
  setProjectVersion(val: Version | string | undefined): void {
    this.projectVersion = val;
  }

  setActivatePostRegistration(val: boolean): void {
    this.activatePostRegistration = val;
  }

  openModal(): void {
    this.setModal(true);
    this.initialize();
  }

  initialize(): void {
    this.serviceEnv = getNullableFirstElement(
      this.editorStore.applicationStore.config.options
        .TEMPORARY__serviceRegistrationConfig,
    )?.env;
    this.serviceExecutionMode = this.executionModes[0];
    this.updateVersion();
  }

  updateVersion(): void {
    if (this.serviceExecutionMode === ServiceExecutionMode.SEMI_INTERACTIVE) {
      this.projectVersion = LATEST_PROJECT_REVISION;
    } else if (this.serviceExecutionMode === ServiceExecutionMode.PROD) {
      this.projectVersion = this.editorStore.sdlcState.projectVersions[0];
    } else {
      this.projectVersion = undefined;
    }
  }

  updateType(val: ServiceExecutionMode | undefined): void {
    this.setServiceExecutionMode(val);
    this.updateVersion();
  }

  updateEnv(val: string | undefined): void {
    this.setServiceEnv(val);
    this.setServiceExecutionMode(this.executionModes[0]);
  }

  /**
   * NOTE: For Prototype projects, only fully-interactive mode is supported
   */
  get options(): ServiceRegistrationEnvInfo[] {
    if (this.editorStore.sdlcState.isCurrentProjectInProduction) {
      return this.editorStore.applicationStore.config.options
        .TEMPORARY__serviceRegistrationConfig;
    }
    return this.editorStore.applicationStore.config.options.TEMPORARY__serviceRegistrationConfig.map(
      (_envConfig) => {
        const envConfig = new ServiceRegistrationEnvInfo();
        envConfig.env = _envConfig.env;
        envConfig.url = _envConfig.url;
        envConfig.modes = _envConfig.modes.filter(
          (mode) => mode === ServiceExecutionMode.FULL_INTERACTIVE,
        );
        return envConfig;
      },
    ).filter((envConfig) => envConfig.modes.length);
  }

  get executionModes(): ServiceExecutionMode[] {
    return (
      this.options.find((e) => e.env === this.serviceEnv)?.modes ?? []
    ).map(getServiceExecutionMode);
  }

  get versionOptions(): ServiceVersionOption[] | undefined {
    if (
      this.editorStore.sdlcState.isCurrentProjectInProduction &&
      this.serviceExecutionMode !== ServiceExecutionMode.FULL_INTERACTIVE
    ) {
      const options: ServiceVersionOption[] =
        this.editorStore.sdlcState.projectVersions.map((version) => ({
          label: version.id.id,
          value: version,
        }));
      if (this.serviceExecutionMode !== ServiceExecutionMode.PROD) {
        return [
          {
            label: prettyCONSTName(LATEST_PROJECT_REVISION),
            value: LATEST_PROJECT_REVISION,
          },
          ...options,
        ];
      }
      return options;
    }
    return undefined;
  }

  *registerService(): GeneratorFn<void> {
    try {
      this.registrationState.inProgress();
      this.validateServiceForRegistration();
      const serverUrl = guaranteeNonNullable(
        this.options.find((info) => info.env === this.serviceEnv),
      ).url;
      const versionInput =
        this.projectVersion instanceof Version
          ? this.projectVersion.id.id
          : undefined;
      const projectConfig = guaranteeNonNullable(
        this.editorStore.projectConfigurationEditorState.projectConfiguration,
      );
      const serviceRegistrationResult =
        (yield this.editorStore.graphManagerState.graphManager.registerService(
          this.editorStore.graphManagerState.graph,
          this.serviceEditorState.service,
          projectConfig.groupId,
          projectConfig.artifactId,
          serverUrl,
          guaranteeNonNullable(this.serviceExecutionMode),
          versionInput,
        )) as ServiceRegistrationResult;
      if (this.activatePostRegistration) {
        yield this.editorStore.graphManagerState.graphManager.activateService(
          serverUrl,
          serviceRegistrationResult.serviceInstanceId,
        );
      }
      this.setModal(false);
      this.editorStore.applicationStore.notifySuccess(
        `service with patten ${serviceRegistrationResult.pattern} registered ${
          this.activatePostRegistration ? ' and activated ' : ''
        } on ${serviceRegistrationResult.serverURL}`,
        undefined,
        null,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(
          LEGEND_STUDIO_LOG_EVENT_TYPE.SERVICE_REGISTRATION_FAILURE,
        ),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.registrationState.reset();
    }
  }

  validateServiceForRegistration(): void {
    assertTrue(
      this.serviceEditorState.service.owners.length !== 0,
      `Service needs to have an owner in order to be registered`,
    );
    this.serviceEditorState.service.owners.forEach((owner) =>
      assertNonEmptyString(owner, `Service can't have an empty owner name`),
    );
    guaranteeNonNullable(
      this.serviceEnv,
      'Service registration environment can not be empty',
    );
    guaranteeNonNullable(
      this.serviceExecutionMode,
      'Service type can not be empty',
    );
    if (
      this.serviceExecutionMode === ServiceExecutionMode.PROD ||
      this.serviceExecutionMode === ServiceExecutionMode.SEMI_INTERACTIVE
    ) {
      guaranteeNonNullable(
        this.projectVersion,
        'Service version can not be empty in Semi-interactive and Prod service type',
      );
    }
  }
}
