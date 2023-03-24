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
import type {
  BulkServiceRegistrationResult,
  Service,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  guaranteeNonNullable,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import { Version } from '@finos/legend-server-sdlc';
import {
  ServiceConfigState,
  ServiceRegistrationState,
} from '../editor-state/element-editor-state/service/ServiceRegistrationState.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../application/LegendStudioEvent.js';
import type { ServiceRegistrationEnvironmentConfig } from '../../../application/LegendStudioApplicationConfig.js';

export const LATEST_PROJECT_REVISION = 'Latest Project Revision';

export class BulkServiceRegistrationState extends ServiceConfigState {
  sdlcState: EditorSDLCState;
  registrationResult: BulkServiceRegistrationResult[] | undefined;
  showSuccessModel = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    super(
      editorStore,
      editorStore.applicationStore.config.options
        .TEMPORARY__serviceRegistrationConfig,
      editorStore.sdlcServerClient.featuresConfigHasBeenFetched &&
        editorStore.sdlcServerClient.features.canCreateVersion,
    );

    makeObservable(this, {
      showSuccessModel: observable,
      editorStore: false,
      sdlcState: false,
      registerServices: flow,
      setSuccessModal: action,
    });
    this.sdlcState = sdlcState;
  }
  setSuccessModal(val: boolean): void {
    this.showSuccessModel = val;
  }
  *registerServices(): GeneratorFn<void> {
    this.registrationState.inProgress();
    const bulkService = this.editorStore.graphManagerState.graph.ownServices;
    try {
      this.validateBulkServiceForRegistration(
        this.editorStore,
        bulkService,
        this.registrationOptions,
        this.enableModesWithVersioning,
      );
      const projectConfig = guaranteeNonNullable(
        this.editorStore.projectConfigurationEditorState.projectConfiguration,
      );

      const versionInput =
        this.projectVersion instanceof Version
          ? this.projectVersion.id.id
          : undefined;

      const config = guaranteeNonNullable(
        this.options.find((info) => info.env === this.serviceEnv),
      );
      this.registrationResult =
        (yield this.editorStore.graphManagerState.graphManager.bulkServiceRegistration(
          bulkService,
          this.editorStore.graphManagerState.graph,
          projectConfig.groupId,
          projectConfig.artifactId,
          versionInput,
          config.executionUrl,
          guaranteeNonNullable(this.serviceExecutionMode),
          {
            TEMPORARY__useStoreModel: this.TEMPORARY__useStoreModel,
          },
        )) as BulkServiceRegistrationResult[];

      this.showSuccessModel = true;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.registrationState.reset();
      this.registrationState.setMessage(undefined);
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
}
