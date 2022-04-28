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
  type KeyedExecutionParameter,
  type Mapping,
  type PureExecution,
  type PureMultiExecution,
  type PureSingleExecution,
  type RawLambda,
  type Runtime,
  type Service,
  type ServiceExecution,
  type DEPRECATED__ServiceTest,
  type DEPRECATED__SingleExecutionTest,
  type DEPRECATED__TestContainer,
  type ObserverContext,
  DEFAULT_SERVICE_PATTERN,
  observe_ServiceExecution,
  observe_KeyedExecutionParameter,
  observe_TestContainer,
  observe_Mapping,
  observe_RawLambda,
  observe_Runtime,
  observe_ServiceTest_Legacy,
} from '@finos/legend-graph';
import { addUniqueEntry, deleteEntry, uuid } from '@finos/legend-shared';
import { action } from 'mobx';

export const service_initNewService = action(
  (service: Service, userId?: string): void => {
    service.pattern = `/${uuid()}`; // initialize the service pattern with an UUID to avoid people leaving the pattern as /
    if (userId) {
      service.owners.push(userId);
    } // this is used to add the current user as the first owner by default
  },
);
export const service_setExecution = action(
  (
    service: Service,
    value: ServiceExecution,
    observerContext: ObserverContext,
  ): void => {
    service.execution = observe_ServiceExecution(value, observerContext);
  },
);
export const service_setLegacyTest = action(
  (service: Service, value: DEPRECATED__ServiceTest): void => {
    service.test = observe_ServiceTest_Legacy(value);
  },
);
export const service_setPattern = action(
  (service: Service, value: string): void => {
    service.pattern = value;
  },
);
export const service_setDocumentation = action(
  (service: Service, value: string): void => {
    service.documentation = value;
  },
);
export const service_setAutoActivateUpdates = action(
  (service: Service, value: boolean): void => {
    service.autoActivateUpdates = value;
  },
);
export const service_addOwner = action(
  (service: Service, value: string): void => {
    addUniqueEntry(service.owners, value);
  },
);
export const service_updateOwner = action(
  (service: Service, value: string, idx: number): void => {
    service.owners[idx] = value;
  },
);
export const service_deleteOwner = action(
  (service: Service, idx: number): void => {
    service.owners.splice(idx, 1);
  },
);
export const service_removePatternParameter = action(
  (service: Service, value: string): void => {
    const newPattern = service.pattern
      .replace(new RegExp(`\\/\\{${value}\\}`, 'ug'), '')
      .replace(/\/{2,}/gu, '/');
    service.pattern = newPattern !== '' ? newPattern : DEFAULT_SERVICE_PATTERN;
  },
);
export const pureExecution_setFunction = action(
  (pe: PureExecution, value: RawLambda): void => {
    pe.func = observe_RawLambda(value);
  },
);
export const pureSingleExecution_setMapping = action(
  (
    pe: PureSingleExecution | KeyedExecutionParameter,
    value: Mapping,
    observerContext: ObserverContext,
  ): void => {
    pe.mapping.value = observe_Mapping(value, observerContext);
  },
);
export const pureSingleExecution_setRuntime = action(
  (
    pe: PureSingleExecution | KeyedExecutionParameter,
    value: Runtime,
    observerContext: ObserverContext,
  ): void => {
    pe.runtime = observe_Runtime(value, observerContext);
  },
);
export const keyedExecutionParameter_setKey = action(
  (ke: KeyedExecutionParameter, value: string): void => {
    ke.key = value;
  },
);
export const pureMultiExecution_setExecutionKey = action(
  (pe: PureMultiExecution, value: string): void => {
    pe.executionKey = value;
  },
);
export const pureMultiExecution_addExecutionParameter = action(
  (
    pe: PureMultiExecution,
    value: KeyedExecutionParameter,
    context: ObserverContext,
  ): void => {
    addUniqueEntry(
      pe.executionParameters,
      observe_KeyedExecutionParameter(value, context),
    );
  },
);
export const singleExecTest_setData = action(
  (val: DEPRECATED__SingleExecutionTest, value: string): void => {
    val.data = value;
  },
);

export const singleExecTest_addAssert = action(
  (
    val: DEPRECATED__SingleExecutionTest,
    value: DEPRECATED__TestContainer,
  ): void => {
    addUniqueEntry(val.asserts, observe_TestContainer(value));
  },
);

export const singleExecTest_deleteAssert = action(
  (
    val: DEPRECATED__SingleExecutionTest,
    value: DEPRECATED__TestContainer,
  ): void => {
    deleteEntry(val.asserts, observe_TestContainer(value));
  },
);
