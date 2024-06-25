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
import { action, makeObservable, observable, flow } from 'mobx';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import type { EditorStore } from '../EditorStore.js';
import {
  type ServiceRegistrationResult,
  type Service,
  ServiceRegistrationSuccess,
  ServiceRegistrationFail,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  guaranteeNonNullable,
  assertErrorThrown,
  LogEvent,
  ActionState,
  assertTrue,
} from '@finos/legend-shared';
import {
  ServiceConfigState,
  ServiceRegistrationState,
} from '../editor-state/element-editor-state/service/ServiceRegistrationState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import { type ServiceRegistrationEnvironmentConfig } from '../../../application/LegendStudioApplicationConfig.js';

export enum REGISTRATION_RESULT {
  DID_NOT_RUN = 'DID_NOT_RUN',
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS',
  IN_PROGRESS = 'IN_PROGRESS',
}

export const getServiceRegistrationResult = (
  isServiceRegistering: boolean,
  result: ServiceRegistrationResult | undefined,
): REGISTRATION_RESULT => {
  if (isServiceRegistering) {
    return REGISTRATION_RESULT.IN_PROGRESS;
  } else if (result instanceof ServiceRegistrationSuccess) {
    return REGISTRATION_RESULT.SUCCESS;
  } else if (result instanceof ServiceRegistrationFail) {
    return REGISTRATION_RESULT.FAILED;
  }
  return REGISTRATION_RESULT.DID_NOT_RUN;
};

export class BulkServiceRegistrationState {
  globalBulkServiceRegistrationState: GlobalBulkServiceRegistrationState;
  registrationResult: ServiceRegistrationResult | undefined;
  service: Service;
  showFailingView = false;
  isSelected = false;

  constructor(
    globalBulkServiceRegistrationState: GlobalBulkServiceRegistrationState,
    service: Service,
  ) {
    makeObservable(this, {
      service: observable,
      registrationResult: observable,
      setShowFailingView: action,
      toggleIsSelected: action,
      isSelected: observable,
    });
    this.globalBulkServiceRegistrationState =
      globalBulkServiceRegistrationState;
    this.service = service;
  }

  toggleIsSelected(): void {
    this.isSelected = !this.isSelected;
  }
  setShowFailingView(val: boolean): void {
    this.showFailingView = val;
  }

  handleRegistrationResult(
    registrationResult: ServiceRegistrationResult,
  ): void {
    try {
      assertTrue(registrationResult.service?.pattern === this.service.pattern);
      this.registrationResult = registrationResult;
    } catch (error) {
      assertErrorThrown(error);
    }
  }
}

export class GlobalBulkServiceRegistrationState {
  readonly editorStore: EditorStore;
  readonly sdlcState: EditorSDLCState;
  bulkServiceRegistrationState: BulkServiceRegistrationState[] | undefined;
  serviceConfigState: ServiceConfigState;
  isServiceRegistering = ActionState.create();
  showRegistrationConfig = false;
  failingView: ServiceRegistrationFail | undefined;
  selectAllServices = false;
  activatePostRegistration = true;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      editorStore: false,
      sdlcState: false,
      bulkServiceRegistrationState: observable,
      init: action,
      setShowRegConfig: action,
      showRegistrationConfig: observable,
      registerServices: flow,
      failingView: observable,
      setFailingView: action,
      setSelectAll: action,
      selectAllServices: observable,
      toggleSelectAllServices: action,
      activatePostRegistration: observable,
      setActivatePostRegistration: action,
    });
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.serviceConfigState = new ServiceConfigState(
      editorStore,
      editorStore.applicationStore.config.options.TEMPORARY__serviceRegistrationConfig,
      editorStore.sdlcServerClient.featuresConfigHasBeenFetched &&
        editorStore.sdlcServerClient.features.canCreateVersion,
    );
  }

  init(force?: boolean): void {
    if (!this.bulkServiceRegistrationState || force) {
      this.bulkServiceRegistrationState =
        this.editorStore.graphManagerState.graph.ownServices.map(
          (service) => new BulkServiceRegistrationState(this, service),
        );
    }
  }

  toggleSelectAllServices(val: boolean): void {
    this.selectAllServices = val;
  }

  setSelectAll(val: boolean): void {
    this.bulkServiceRegistrationStates.forEach(
      (serviceRegistrationState) => (serviceRegistrationState.isSelected = val),
    );
  }

  setFailingView(val: ServiceRegistrationFail | undefined): void {
    this.failingView = val;
  }

  setShowRegConfig(val: boolean): void {
    this.showRegistrationConfig = val;
  }

  setActivatePostRegistration(val: boolean): void {
    this.activatePostRegistration = val;
  }

  get bulkServiceRegistrationStates(): BulkServiceRegistrationState[] {
    return this.bulkServiceRegistrationState ?? [];
  }

  *registerServices(): GeneratorFn<void> {
    this.isServiceRegistering.inProgress();
    const selectedServices = this.bulkServiceRegistrationStates
      .filter((bulkRegState) => bulkRegState.isSelected)
      .map((serviceState) => serviceState.service);

    try {
      this.validateBulkServiceForRegistration(
        this.editorStore,
        selectedServices,
        this.serviceConfigState.registrationOptions,
        this.serviceConfigState.enableModesWithVersioning,
      );
      const projectConfig = guaranteeNonNullable(
        this.editorStore.projectConfigurationEditorState.projectConfiguration,
      );

      const config = guaranteeNonNullable(
        this.serviceConfigState.options.find(
          (info) => info.env === this.serviceConfigState.serviceEnv,
        ),
      );

      const registrationResults =
        (yield this.editorStore.graphManagerState.graphManager.bulkServiceRegistration(
          selectedServices,
          this.editorStore.graphManagerState.graph,
          projectConfig.groupId,
          projectConfig.artifactId,
          this.serviceConfigState.projectVersion,
          config.executionUrl,
          guaranteeNonNullable(this.serviceConfigState.serviceExecutionMode),
          {
            TEMPORARY__useStoreModel:
              this.serviceConfigState.TEMPORARY__useStoreModel,
            TEMPORARY__useGenerateLineage:
              this.serviceConfigState.TEMPORARY__useGenerateLineage,
          },
        )) as ServiceRegistrationResult[];

      const successfulResults = registrationResults.filter(
        (result) => result instanceof ServiceRegistrationSuccess,
      );

      if (this.activatePostRegistration) {
        yield Promise.resolve(
          successfulResults.map((serviceResult) =>
            this.editorStore.graphManagerState.graphManager.activateService(
              config.executionUrl,
              serviceResult.serviceInstanceId,
            ),
          ),
        );
      }
      this.handleResults(registrationResults);
      this.isServiceRegistering.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.serviceConfigState.registrationState.reset();
      this.isServiceRegistering.fail();
    }
  }

  validateBulkServiceForRegistration(
    editorStore: EditorStore,
    services: Service[],
    registrationOptions: ServiceRegistrationEnvironmentConfig[],
    enableModesWithVersioning: boolean,
  ): void {
    services.forEach((service) => {
      const serviceRegState = new ServiceRegistrationState(
        editorStore,
        service,
        registrationOptions,
        enableModesWithVersioning,
      );
      serviceRegState.validateServiceForRegistration();
    });
  }

  handleResults(registrationResults: ServiceRegistrationResult[]): void {
    registrationResults.forEach((registrationResult) => {
      const registrationState = this.bulkServiceRegistrationStates.find(
        (bulkRegState) =>
          bulkRegState.service.path ===
          guaranteeNonNullable(registrationResult.service).path,
      );
      if (registrationState) {
        registrationState.handleRegistrationResult(registrationResult);
      }
    });
  }
}
