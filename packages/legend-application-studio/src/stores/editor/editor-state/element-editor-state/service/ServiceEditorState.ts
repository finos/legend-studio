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

import { observable, computed, action, makeObservable, flow } from 'mobx';
import {
  type GeneratorFn,
  type PlainObject,
  assertErrorThrown,
  guaranteeType,
  returnUndefOnError,
} from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore.js';
import {
  type ServiceExecutionState,
  UnsupportedServiceExecutionState,
  SingleServicePureExecutionState,
  MultiServicePureExecutionState,
  InlineServicePureExecutionState,
} from './ServiceExecutionState.js';
import { ServiceRegistrationState } from '../../../editor-state/element-editor-state/service/ServiceRegistrationState.js';
import { ElementEditorState } from '../../../editor-state/element-editor-state/ElementEditorState.js';
import {
  type PackageableElement,
  type ValueSpecification,
  Service,
  PureSingleExecution,
  PureMultiExecution,
  DeploymentOwnership,
  UserListOwnership,
  isStubbed_RawLambda,
  getValueSpecificationReturnType,
  type Type,
  resolveServiceQueryRawLambda,
  PureExecution,
} from '@finos/legend-graph';
import { ServiceTestableState } from './testable/ServiceTestableState.js';
import { User } from '@finos/legend-server-sdlc';
import { ServicePostValidationsState } from './ServicePostValidationState.js';
import { valueSpecReturnTDS } from '@finos/legend-query-builder';
import { service_setOwnership } from '../../../../graph-modifier/DSL_Service_GraphModifierHelper.js';

export enum SERVICE_TAB {
  GENERAL = 'GENERAL',
  EXECUTION = 'EXECUTION',
  TEST = 'TEST',
  REGISTRATION = 'REGISTRATION',
  POST_VALIDATION = 'POST_VALIDATION',
}

enum ServiceOwnershipType {
  DEPLOYMENT_OWNERSHIP = 'deploymentOwnership',
  USERLIST_OWNERSHIP = 'userListOwnership',
}

export const resolveServiceQueryValueSpec = (
  service: Service,
  editorStore: EditorStore,
): ValueSpecification | undefined => {
  const rawLambda = resolveServiceQueryRawLambda(service);
  if (rawLambda) {
    return editorStore.graphManagerState.graphManager.buildValueSpecification(
      editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
        rawLambda,
      ),
      editorStore.graphManagerState.graph,
    );
  }
  return undefined;
};

export const resolveServiceQueryReturnType = (
  service: Service,
  editorStore: EditorStore,
): Type | undefined => {
  const valueSpec = returnUndefOnError(() =>
    resolveServiceQueryValueSpec(service, editorStore),
  );
  if (valueSpec) {
    return returnUndefOnError(() => getValueSpecificationReturnType(valueSpec));
  }
  return undefined;
};

export const isServiceQueryTDS = (
  service: Service,
  editorStore: EditorStore,
): boolean => {
  const valueSpec = returnUndefOnError(() =>
    resolveServiceQueryValueSpec(service, editorStore),
  );
  return Boolean(
    valueSpec
      ? valueSpecReturnTDS(valueSpec, editorStore.graphManagerState.graph)
      : undefined,
  );
};

export const MINIMUM_SERVICE_OWNERS = 2;
export const DeploymentOwnershipLabel = 'Deployment';
export const UserlistOwnershipLabel = 'User List';
export const OWNERSHIP_OPTIONS = [
  {
    label: DeploymentOwnershipLabel,
    value: ServiceOwnershipType.DEPLOYMENT_OWNERSHIP,
  },
  {
    label: UserlistOwnershipLabel,
    value: ServiceOwnershipType.USERLIST_OWNERSHIP,
  },
];

export type ServiceOwnerOption = {
  label: string;
  value: string;
};

export class ServiceEditorState extends ElementEditorState {
  executionState: ServiceExecutionState;
  registrationState: ServiceRegistrationState;
  testableState: ServiceTestableState;
  selectedTab: SERVICE_TAB;
  postValidationState: ServicePostValidationsState;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      executionState: observable,
      selectedOwnership: computed,
      registrationState: observable,
      selectedTab: observable,
      postValidationState: observable,
      setSelectedTab: action,
      setSelectedOwnership: action,
      resetExecutionState: action,
      openToTestTab: action,
      service: computed,
      reprocess: action,
      searchUsers: flow,
    });

    this.executionState = this.buildExecutionState();
    this.registrationState = new ServiceRegistrationState(
      editorStore,
      this.service,
      editorStore.applicationStore.config.options.TEMPORARY__serviceRegistrationConfig,
      editorStore.sdlcServerClient.featuresConfigHasBeenFetched &&
        editorStore.sdlcServerClient.features.canCreateVersion,
    );
    this.testableState = new ServiceTestableState(editorStore, this);
    const executionQuery =
      this.service.execution instanceof PureExecution
        ? this.service.execution.func
        : undefined;
    // default to execution tab if query is defined
    this.selectedTab =
      executionQuery && !isStubbed_RawLambda(executionQuery)
        ? SERVICE_TAB.EXECUTION
        : SERVICE_TAB.GENERAL;
    this.postValidationState = new ServicePostValidationsState(this);
  }

  setSelectedTab(tab: SERVICE_TAB): void {
    this.selectedTab = tab;
  }

  openToTestTab(): void {
    this.selectedTab = SERVICE_TAB.TEST;
  }

  get selectedOwnership(): ServiceOwnerOption | undefined {
    const ownership = this.service.ownership;
    if (ownership instanceof DeploymentOwnership) {
      return {
        label: DeploymentOwnershipLabel,
        value: ServiceOwnershipType.DEPLOYMENT_OWNERSHIP,
      };
    } else if (ownership instanceof UserListOwnership) {
      return {
        label: UserlistOwnershipLabel,
        value: ServiceOwnershipType.USERLIST_OWNERSHIP,
      };
    }
    return undefined;
  }

  setSelectedOwnership(o: ServiceOwnerOption): void {
    switch (o.value) {
      case ServiceOwnershipType.DEPLOYMENT_OWNERSHIP: {
        service_setOwnership(
          this.service,
          new DeploymentOwnership('', this.service),
        );
        break;
      }
      case ServiceOwnershipType.USERLIST_OWNERSHIP: {
        const currentUserId =
          this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig()
            .currentUserId;
        service_setOwnership(
          this.service,
          new UserListOwnership(
            currentUserId ? [currentUserId] : [],
            this.service,
          ),
        );
        break;
      }
      default: {
        this.editorStore.applicationStore.notificationService.notifyError(
          'Unsupported ownership type',
        );
      }
    }
  }

  resetExecutionState(): void {
    this.executionState = this.buildExecutionState();
  }

  buildExecutionState(): ServiceExecutionState {
    const execution = this.service.execution;
    if (
      execution instanceof PureSingleExecution &&
      execution.mapping &&
      execution.runtime
    ) {
      return new SingleServicePureExecutionState(
        this.editorStore,
        this,
        execution,
      );
    } else if (execution instanceof PureSingleExecution) {
      return new InlineServicePureExecutionState(
        this.editorStore,
        this,
        execution,
      );
    } else if (
      execution instanceof PureMultiExecution &&
      execution.executionParameters
    ) {
      return new MultiServicePureExecutionState(
        this.editorStore,
        this,
        execution,
      );
    }
    return new UnsupportedServiceExecutionState(
      this.editorStore,
      this,
      this.service.execution,
    );
  }

  get service(): Service {
    return guaranteeType(
      this.element,
      Service,
      'Element inside service editor state must be a service',
    );
  }

  *searchUsers(name: string): GeneratorFn<User[]> {
    try {
      return (
        (yield this.editorStore.sdlcServerClient.getUsers(
          name,
        )) as PlainObject<User>[]
      ).map((p) => User.serialization.fromJson(p));
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      return [];
    }
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ServiceEditorState {
    const serviceEditorState = new ServiceEditorState(editorStore, newElement);
    serviceEditorState.selectedTab = this.selectedTab;
    return serviceEditorState;
  }
}
