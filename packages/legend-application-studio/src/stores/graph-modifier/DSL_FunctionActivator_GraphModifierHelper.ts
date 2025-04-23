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
  type HostedService,
  DEFAULT_HOSTED_SERVICE_PATTERN,
  type FunctionActivator,
  type Ownership,
  observe_FunctionActivatorOwnership,
  type DeploymentOwner,
  type UserList,
} from '@finos/legend-graph';
import { action } from 'mobx';

export const hostedService_setDocumentation = action(
  (hostedService: HostedService, val: string): void => {
    hostedService.documentation = val;
  },
);

export const hostedService_setAutoActivateUpdates = action(
  (hostedService: HostedService, val: boolean): void => {
    hostedService.autoActivateUpdates = val;
  },
);

export const hostedService_setPattern = action(
  (hostedService: HostedService, val: string): void => {
    hostedService.pattern = val;
  },
);

export const hostedService_removePatternParameter = action(
  (hostedService: HostedService, value: string): void => {
    const newPattern = hostedService.pattern
      .replace(new RegExp(`\\/\\{${value}\\}`, 'ug'), '')
      .replace(/\/{2,}/gu, '/');
    hostedService.pattern =
      newPattern !== '' ? newPattern : DEFAULT_HOSTED_SERVICE_PATTERN;
  },
);

export const hostedService_setStoreModel = action(
  (hostedService: HostedService, val: boolean): void => {
    hostedService.storeModel = val;
  },
);

export const hostedService_setGenerateLineage = action(
  (hostedService: HostedService, val: boolean): void => {
    hostedService.generateLineage = val;
  },
);

export const activator_setOwnership = action(
  (activator: FunctionActivator, value: Ownership): void => {
    activator.ownership = observe_FunctionActivatorOwnership(value);
  },
);

export const activator_setDeploymentOwner = action(
  (deploymentOwner: DeploymentOwner, value: string): void => {
    deploymentOwner.id = value;
  },
);

export const activator_addUserOwner = action(
  (userList: UserList, value: string): void => {
    userList.users.push(value);
  },
);

export const activator_updateUserOwnership = action(
  (userList: UserList, value: string, index: number): void => {
    userList.users[index] = value;
  },
);

export const activator_deleteValueFromUserOwnership = action(
  (userList: UserList, index: number): void => {
    userList.users.splice(index, 1);
  },
);

export const hostedServices_deleteAction = action(
  (hostedService: HostedService, index: number): void => {
    hostedService.actions.splice(index, 1);
  },
);
