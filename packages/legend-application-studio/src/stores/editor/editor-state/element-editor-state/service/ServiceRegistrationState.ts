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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import { MINIMUM_SERVICE_OWNERS } from '../../../editor-state/element-editor-state/service/ServiceEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  ActionState,
  prettyCONSTName,
  assertNonEmptyString,
  guaranteeNonNullable,
  UnsupportedOperationError,
  assertTrue,
  URL_SEPARATOR,
  filterByType,
  compareSemVerVersions,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../__lib__/LegendStudioEvent.js';
import {
  type Service,
  type PureExecution,
  type ServiceRegistrationSuccess,
  ServiceExecutionMode,
  buildLambdaVariableExpressions,
  VariableExpression,
  generateMultiplicityString,
  areMultiplicitiesEqual,
  Multiplicity,
} from '@finos/legend-graph';
import { ServiceRegistrationEnvironmentConfig } from '../../../../../application/LegendStudioApplicationConfig.js';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import { MASTER_SNAPSHOT_ALIAS } from '@finos/legend-server-depot';

export const LATEST_PROJECT_REVISION = 'Latest Project Revision';

export const PROJECT_SEMANTIC_VERSION_PATTERN = /^[0-9]*.[0-9]*.[0-9]*$/;

export const generateServiceManagementUrl = (
  baseUrl: string,
  serviceUrlPattern: string,
): string =>
  `${baseUrl}${
    URL_SEPARATOR +
    encodeURIComponent(
      serviceUrlPattern[0] === URL_SEPARATOR
        ? serviceUrlPattern.substring(1)
        : serviceUrlPattern,
    )
  }`;

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
  value: string;
}

export class ServiceConfigState {
  readonly editorStore: EditorStore;
  readonly registrationOptions: ServiceRegistrationEnvironmentConfig[] = [];
  readonly registrationState = ActionState.create();

  serviceEnv?: string | undefined;
  serviceExecutionMode?: ServiceExecutionMode | undefined;
  projectVersion?: string | undefined;
  enableModesWithVersioning: boolean;
  TEMPORARY__useStoreModel = false;
  TEMPORARY__useGenerateLineage = true;
  TEMPORARY__useGenerateOpenApi = false;

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
      TEMPORARY__useGenerateLineage: observable,
      TEMPORARY__useGenerateOpenApi: observable,
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
    this.registrationState.setMessageFormatter(prettyCONSTName);
    this.initialize();
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
      const semanticVersions =
        this.editorStore.sdlcState.projectPublishedVersions
          .filter((version) => version.match(PROJECT_SEMANTIC_VERSION_PATTERN))
          .sort((v1, v2) => compareSemVerVersions(v2, v1));
      const snapshotVersions =
        this.editorStore.sdlcState.projectPublishedVersions
          .filter((version) => !version.match(PROJECT_SEMANTIC_VERSION_PATTERN))
          .sort((v1, v2) => v1.localeCompare(v2));
      const options: ServiceVersionOption[] = snapshotVersions
        .concat(semanticVersions)
        .map((version) => ({
          label: version,
          value: version,
        }));
      if (this.serviceEnv && this.serviceEnv.toUpperCase() === 'PROD') {
        // NOTE: we disallow registering against snapshot versions in PROD
        return semanticVersions.map((version) => ({
          label: version,
          value: version,
        }));
      } else {
        if (this.serviceExecutionMode !== ServiceExecutionMode.PROD) {
          return [
            {
              label: LATEST_PROJECT_REVISION,
              value: MASTER_SNAPSHOT_ALIAS,
            },
            ...options.filter(
              (option) => option.value !== MASTER_SNAPSHOT_ALIAS,
            ),
          ];
        }
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

  setProjectVersion(val: string | undefined): void {
    this.projectVersion = val;
  }

  setUseStoreModelWithFullInteractive(val: boolean): void {
    this.TEMPORARY__useStoreModel = val;
  }

  setUseGenerateLineage(val: boolean): void {
    this.TEMPORARY__useGenerateLineage = val;
  }

  setUseGenerateOpenApi(val: boolean): void {
    this.TEMPORARY__useGenerateOpenApi = val;
  }

  initialize(): void {
    this.serviceEnv = this.registrationOptions[0]?.env;
    this.serviceExecutionMode = this.executionModes[0];
    this.updateVersion();
  }

  updateVersion(): void {
    if (this.serviceExecutionMode === ServiceExecutionMode.SEMI_INTERACTIVE) {
      this.projectVersion = MASTER_SNAPSHOT_ALIAS;
    } else if (this.serviceExecutionMode === ServiceExecutionMode.PROD) {
      this.projectVersion =
        this.editorStore.sdlcState.projectPublishedVersions[0];
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

export class ServiceRegistrationState extends ServiceConfigState {
  readonly service: Service;
  activatePostRegistration = true;

  constructor(
    editorStore: EditorStore,
    service: Service,
    registrationOptions: ServiceRegistrationEnvironmentConfig[],
    enableModesWithVersioning: boolean,
  ) {
    super(editorStore, registrationOptions, enableModesWithVersioning);

    makeObservable(this, {
      activatePostRegistration: observable,
      setActivatePostRegistration: action,
      registerService: flow,
    });

    this.service = service;
  }
  setActivatePostRegistration(val: boolean): void {
    this.activatePostRegistration = val;
  }

  *registerService(): GeneratorFn<void> {
    try {
      this.registrationState.inProgress();
      this.validateServiceForRegistration();
      const config = guaranteeNonNullable(
        this.options.find((info) => info.env === this.serviceEnv),
      );
      const serverUrl = config.executionUrl;
      const projectConfig = guaranteeNonNullable(
        this.editorStore.projectConfigurationEditorState.projectConfiguration,
      );
      this.registrationState.setMessage(`Registering service...`);
      const serviceRegistrationResult =
        (yield this.editorStore.graphManagerState.graphManager.registerService(
          this.service,
          this.editorStore.graphManagerState.graph,
          projectConfig.groupId,
          projectConfig.artifactId,
          this.projectVersion,
          serverUrl,
          guaranteeNonNullable(this.serviceExecutionMode),
          {
            TEMPORARY__useStoreModel: this.TEMPORARY__useStoreModel,
            TEMPORARY__useGenerateLineage: this.TEMPORARY__useGenerateLineage,
            TEMPORARY__useGenerateOpenApi: this.TEMPORARY__useGenerateOpenApi,
          },
        )) as ServiceRegistrationSuccess;
      if (this.activatePostRegistration) {
        this.registrationState.setMessage(`Activating service...`);
        yield this.editorStore.graphManagerState.graphManager.activateService(
          serverUrl,
          serviceRegistrationResult.serviceInstanceId,
        );
      }
      assertNonEmptyString(
        serviceRegistrationResult.pattern,
        'Service registration pattern is missing or empty',
      );

      this.editorStore.applicationStore.alertService.setActionAlertInfo({
        message: `Service with pattern ${
          serviceRegistrationResult.pattern
        } registered ${this.activatePostRegistration ? 'and activated ' : ''}`,
        prompt: 'You can now launch and monitor the operation of your service',
        type: ActionAlertType.STANDARD,
        actions: [
          {
            label: 'Launch Service',
            type: ActionAlertActionType.PROCEED,
            handler: (): void => {
              this.editorStore.applicationStore.navigationService.navigator.visitAddress(
                generateServiceManagementUrl(
                  config.managementUrl,
                  serviceRegistrationResult.pattern,
                ),
              );
            },
            default: true,
          },
          {
            label: 'Close',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
          },
        ],
      });
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

  validateServiceForRegistration(): void {
    this.service.owners.forEach((owner) =>
      assertNonEmptyString(owner, `Service can't have an empty owner name`),
    );
    assertTrue(
      Boolean(
        this.service.ownership ??
          this.service.owners.length >= MINIMUM_SERVICE_OWNERS,
      ),
      `Service needs to have at least 2 owners in order to be registered`,
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

    // validate service parameter multiplicities
    const SUPPORTED_SERVICE_PARAMETER_MULTIPLICITIES = [
      Multiplicity.ONE,
      Multiplicity.ZERO_MANY,
      Multiplicity.ZERO_ONE,
    ];
    const invalidParams = buildLambdaVariableExpressions(
      (this.service.execution as PureExecution).func,
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
  }
}
