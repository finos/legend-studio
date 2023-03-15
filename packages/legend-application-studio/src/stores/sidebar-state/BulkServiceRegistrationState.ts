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
import { action, computed, makeObservable, observable, flow } from 'mobx';
import type { EditorSDLCState } from '../EditorSDLCState.js';
import type { EditorStore } from '../EditorStore.js';
import {
  type PureExecution,
  areMultiplicitiesEqual,
  buildLambdaVariableExpressions,
  generateMultiplicityString,
  Multiplicity,
  VariableExpression,
  ServiceExecutionMode,
  type BulkRegistrationResultFail,
  BulkRegistrationResultSuccess,
  type BulkServiceRegistrationResult,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertNonEmptyString,
  assertTrue,
  filterByType,
  getNullableFirstElement,
  guaranteeNonNullable,
  prettyCONSTName,
  UnsupportedOperationError,
  assertErrorThrown,
  LogEvent,
} from '@finos/legend-shared';
import { Version } from '@finos/legend-server-sdlc';
import { MINIMUM_SERVICE_OWNERS } from '../editor-state/element-editor-state/service/ServiceEditorState.js';
import { ServiceRegistrationEnvironmentConfig } from '../../application/LegendStudioApplicationConfig.js';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioAppEvent.js';
import { generateServiceManagementUrl } from '../editor-state/element-editor-state/service/ServiceRegistrationState.js';

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
interface ServiceRegistrationResult {
  successfulServices: string[];
  failedServices: string[];
  serviceLinks: string[];
}
export class ServiceConfigState {
  readonly editorStore: EditorStore;
  readonly registrationOptions: ServiceRegistrationEnvironmentConfig[] = [];
  readonly registrationState = ActionState.create();
  registrationResult: ServiceRegistrationResult | undefined;
  serviceEnv?: string | undefined;
  serviceExecutionMode?: ServiceExecutionMode | undefined;
  projectVersion?: Version | string | undefined;
  enableModesWithVersioning: boolean;
  TEMPORARY__useStoreModel = false;

  constructor(
    editorStore: EditorStore,
    registrationOptions: ServiceRegistrationEnvironmentConfig[],
    enableModesWithVersioning: boolean,
  ) {
    makeObservable(this, {
      serviceEnv: observable,
      serviceExecutionMode: observable,
      projectVersion: observable,
      enableModesWithVersioning: observable,
      TEMPORARY__useStoreModel: observable,
      executionModes: computed,
      options: computed,
      versionOptions: computed,
      setServiceEnv: action,
      setServiceExecutionMode: action,
      setProjectVersion: action,

      setUseStoreModelWithFullInteractive: action,
      initialize: action,

      updateVersion: action,
      updateType: action,
      updateEnv: action,
    });

    this.editorStore = editorStore;
    this.registrationOptions = registrationOptions;
    this.enableModesWithVersioning = enableModesWithVersioning;
    this.initialize();
    this.registrationState.setMessageFormatter(prettyCONSTName);
  }

  get options(): ServiceRegistrationEnvironmentConfig[] {
    if (this.enableModesWithVersioning) {
      return this.registrationOptions;
    }
    return this.registrationOptions
      .map((_envConfig) => {
        const envConfig = new ServiceRegistrationEnvironmentConfig();
        envConfig.env = _envConfig.env;
        envConfig.executionUrl = _envConfig.executionUrl;
        envConfig.managementUrl = _envConfig.managementUrl;
        // NOTE: For projects that we cannot create a version for, only fully-interactive mode is supported
        envConfig.modes = _envConfig.modes.filter(
          (mode) => mode === ServiceExecutionMode.FULL_INTERACTIVE,
        );
        return envConfig;
      })
      .filter((envConfig) => envConfig.modes.length);
  }

  get executionModes(): ServiceExecutionMode[] {
    return (
      this.options.find((e) => e.env === this.serviceEnv)?.modes ?? []
    ).map(getServiceExecutionMode);
  }

  get versionOptions(): ServiceVersionOption[] | undefined {
    if (
      this.enableModesWithVersioning &&
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

  setServiceEnv(val: string | undefined): void {
    this.serviceEnv = val;
  }

  setServiceExecutionMode(val: ServiceExecutionMode | undefined): void {
    this.serviceExecutionMode = val;
  }

  setProjectVersion(val: Version | string | undefined): void {
    this.projectVersion = val;
  }

  setUseStoreModelWithFullInteractive(val: boolean): void {
    this.TEMPORARY__useStoreModel = val;
  }

  initialize(): void {
    this.serviceEnv = getNullableFirstElement(this.registrationOptions)?.env;
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
}

export class BulkServiceRegistrationState {
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;
  serviceConfigState: ServiceConfigState;
  showSuccessModel = false;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      showSuccessModel: observable,
      editorStore: false,
      sdlcState: false,
      registerServices: flow,
      setSuccessModal: action,
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
  setSuccessModal(val: boolean): void {
    this.showSuccessModel = val;
  }
  *registerServices(): GeneratorFn<void> {
    const successfulServices: string[] = [];
    const failedServices: string[] = [];
    const serviceManagementURL: string[] = [];

    this.serviceConfigState.registrationState.inProgress();
    this.validateServiceForRegistration();
    try {
      const projectConfig = guaranteeNonNullable(
        this.editorStore.projectConfigurationEditorState.projectConfiguration,
      );

      const versionInput =
        this.serviceConfigState.projectVersion instanceof Version
          ? this.serviceConfigState.projectVersion.id.id
          : undefined;

      const config = guaranteeNonNullable(
        this.serviceConfigState.options.find(
          (info) => info.env === this.serviceConfigState.serviceEnv,
        ),
      );
      const serviceRegistrationResult =
        (yield this.editorStore.graphManagerState.graphManager.bulkServiceRegistration(
          this.editorStore.graphManagerState.graph.ownServices,
          this.editorStore.graphManagerState.graph,
          projectConfig.groupId,
          projectConfig.artifactId,
          versionInput,
          config.executionUrl,
          guaranteeNonNullable(this.serviceConfigState.serviceExecutionMode),
          {
            TEMPORARY__useStoreModel:
              this.serviceConfigState.TEMPORARY__useStoreModel,
          },
        )) as BulkServiceRegistrationResult[];

      serviceRegistrationResult.forEach((result) => {
        if (result instanceof BulkRegistrationResultSuccess) {
          const serviceURL = generateServiceManagementUrl(
            config.managementUrl,
            result.pattern,
          );
          serviceManagementURL.push(serviceURL);
          successfulServices.push(result.pattern);
        } else {
          failedServices.push(
            `${result.servicePath} ERROR: ${
              (result as BulkRegistrationResultFail).errorMessage
            }`,
          );
        }
      });
      this.serviceConfigState.registrationResult = {
        successfulServices: successfulServices,
        serviceLinks: serviceManagementURL,
        failedServices: failedServices,
      };
      this.showSuccessModel = true;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.serviceConfigState.registrationState.reset();
      this.serviceConfigState.registrationState.setMessage(undefined);
    }
  }

  validateServiceForRegistration(): void {
    const services = this.editorStore.graphManagerState.graph.ownServices;

    services.forEach((service) => {
      service.owners.forEach((owner) =>
        assertNonEmptyString(owner, `Service can't have an empty owner name`),
      );
      assertTrue(
        service.owners.length >= MINIMUM_SERVICE_OWNERS,
        `Service needs to have at least 2 owners in order to be registered`,
      );
      guaranteeNonNullable(
        this.serviceConfigState.serviceEnv,
        'Service registration environment can not be empty',
      );
      guaranteeNonNullable(
        this.serviceConfigState.serviceExecutionMode,
        'Service type can not be empty',
      );
      if (
        this.serviceConfigState.serviceExecutionMode ===
          ServiceExecutionMode.PROD ||
        this.serviceConfigState.serviceExecutionMode ===
          ServiceExecutionMode.SEMI_INTERACTIVE
      ) {
        guaranteeNonNullable(
          this.serviceConfigState.projectVersion,
          'Service version can not be empty in Semi-interactive and Prod service type',
        );
      }

      // validate service parameter multiplicities
      const SUPPORTED_SERVICE_PARAMETER_MULTIPLICITIES = [
        Multiplicity.ONE,
        Multiplicity.ZERO_MANY,
        Multiplicity.ZERO_ONE,
      ];
      const invalidParams = buildLambdaVariableExpressions(
        (service.execution as PureExecution).func,
        this.editorStore.graphManagerState,
      )
        .filter(filterByType(VariableExpression))
        .filter(
          (p) =>
            !SUPPORTED_SERVICE_PARAMETER_MULTIPLICITIES.some((m) =>
              areMultiplicitiesEqual(m, p.multiplicity),
            ),
        );
      assertTrue(
        invalidParams.length === 0,
        `Parameter(s)${invalidParams.map(
          (p) =>
            ` ${p.name}: [${generateMultiplicityString(
              p.multiplicity.lowerBound,
              p.multiplicity.upperBound,
            )}]`,
        )} has/have unsupported multiplicity. Supported multiplicities include ${SUPPORTED_SERVICE_PARAMETER_MULTIPLICITIES.map(
          (m) => ` [${generateMultiplicityString(m.lowerBound, m.upperBound)}]`,
        )}.`,
      );
    });
  }
}
