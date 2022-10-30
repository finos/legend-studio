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
  getNullableFirstElement,
  assertTrue,
  URL_SEPARATOR,
  filterByType,
} from '@finos/legend-shared';
import { LEGEND_STUDIO_APP_EVENT } from '../../../LegendStudioAppEvent.js';
import { Version } from '@finos/legend-server-sdlc';
import {
  type Service,
  type ServiceRegistrationResult,
  type PureExecution,
  ServiceExecutionMode,
  buildLambdaVariableExpressions,
  VariableExpression,
  generateMultiplicityString,
  multiplicityComparator,
  Multiplicity,
} from '@finos/legend-graph';
import { ServiceRegistrationEnvironmentConfig } from '../../../../application/LegendStudioApplicationConfig.js';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';

export const LATEST_PROJECT_REVISION = 'Latest Project Revision';

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
  value: Version | string;
}

export class ServiceRegistrationState {
  readonly editorStore: EditorStore;
  readonly service: Service;
  readonly registrationOptions: ServiceRegistrationEnvironmentConfig[] = [];
  readonly registrationState = ActionState.create();

  serviceEnv?: string | undefined;
  serviceExecutionMode?: ServiceExecutionMode | undefined;
  projectVersion?: Version | string | undefined;
  activatePostRegistration = true;
  enableModesWithVersioning: boolean;
  TEMPORARY__useStoreModel = false;

  constructor(
    editorStore: EditorStore,
    service: Service,
    registrationOptions: ServiceRegistrationEnvironmentConfig[],
    enableModesWithVersioning: boolean,
  ) {
    makeObservable(this, {
      serviceEnv: observable,
      serviceExecutionMode: observable,
      projectVersion: observable,
      activatePostRegistration: observable,
      enableModesWithVersioning: observable,
      TEMPORARY__useStoreModel: observable,
      executionModes: computed,
      options: computed,
      versionOptions: computed,
      setServiceEnv: action,
      setServiceExecutionMode: action,
      setProjectVersion: action,
      setActivatePostRegistration: action,
      setUseStoreModelWithFullInteractive: action,
      initialize: action,
      updateVersion: action,
      updateType: action,
      updateEnv: action,
      registerService: flow,
    });

    this.editorStore = editorStore;
    this.service = service;
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

  setActivatePostRegistration(val: boolean): void {
    this.activatePostRegistration = val;
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

  *registerService(): GeneratorFn<void> {
    try {
      this.registrationState.inProgress();
      this.validateServiceForRegistration();
      const config = guaranteeNonNullable(
        this.options.find((info) => info.env === this.serviceEnv),
      );
      const serverUrl = config.executionUrl;
      const versionInput =
        this.projectVersion instanceof Version
          ? this.projectVersion.id.id
          : undefined;
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
          versionInput,
          serverUrl,
          guaranteeNonNullable(this.serviceExecutionMode),
          {
            TEMPORARY__useStoreModel: this.TEMPORARY__useStoreModel,
          },
        )) as ServiceRegistrationResult;
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

      this.editorStore.applicationStore.setActionAlertInfo({
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
              this.editorStore.applicationStore.navigator.visitAddress(
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
      this.service.owners.length >= MINIMUM_SERVICE_OWNERS,
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
            multiplicityComparator(m, p.multiplicity),
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
