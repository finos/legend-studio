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

import { computed, makeObservable, observable } from 'mobx';
import type { SnowflakeAppDeploymentConfiguration } from '../../../graph/metamodel/pure/functionActivator/SnowflakeAppDeploymentConfiguration.js';
import { type ObserverContext, skipObserved } from './CoreObserverHelper.js';
import { observe_ConnectionPointer } from './DSL_Mapping_ObserverHelper.js';
import {
  DeploymentOwner,
  UserList,
  type Ownership,
} from '../../../graph/metamodel/pure/packageableElements/function/Ownership.js';
import type { HostedServiceDeploymentConfiguration } from '../../../graph/metamodel/pure/functionActivator/HostedServiceDeploymentConfiguration.js';
import type { PostDeploymentAction } from '../../../graph/metamodel/pure/functionActivator/PostDeploymentAction.js';
import type { DSL_FunctionActivator_PureGraphManager_Extension } from '../../extensions/DSL_FunctionActivator_PureGraphManager_Extension.js';
import type { MemSQLDeploymentConfiguration } from '../../../graph/metamodel/pure/functionActivator/MemSQLDeploymentConfiguration.js';

export const observe_SnowflakeAppDeploymentConfiguration = skipObserved(
  (
    metamodel: SnowflakeAppDeploymentConfiguration,
  ): SnowflakeAppDeploymentConfiguration => {
    makeObservable(metamodel, {
      activationConnection: observable,
    });

    if (metamodel.activationConnection) {
      observe_ConnectionPointer(metamodel.activationConnection);
    }

    return metamodel;
  },
);

export const observe_DeploymentOwnership = skipObserved(
  (metamodel: DeploymentOwner): DeploymentOwner => {
    makeObservable(metamodel, {
      id: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

export const observe_UserListOwnership = skipObserved(
  (metamodel: UserList): UserList => {
    makeObservable(metamodel, {
      users: observable,
      hashCode: computed,
    });
    return metamodel;
  },
);

export const observe_FunctionActivatorOwnership = (
  metamodel: Ownership,
): Ownership => {
  if (metamodel instanceof DeploymentOwner) {
    return observe_DeploymentOwnership(metamodel);
  } else if (metamodel instanceof UserList) {
    return observe_UserListOwnership(metamodel);
  }
  return metamodel;
};

export const observe_HostedServiceDeploymentConfiguration = skipObserved(
  (
    metamodel: HostedServiceDeploymentConfiguration,
  ): HostedServiceDeploymentConfiguration => {
    if (metamodel.host && metamodel.port && metamodel.path) {
      makeObservable(metamodel, {
        host: observable,
        port: observable,
        path: observable,
      });
    }
    return metamodel;
  },
);

export const observe_HostedServicePostDeploymentAction = (
  metamodel: PostDeploymentAction,
  context: ObserverContext,
): PostDeploymentAction => {
  makeObservable(metamodel, {
    properties: observable,
    automated: observable,
  });
  const extraObservers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_FunctionActivator_PureGraphManager_Extension
      ).getExtraFunctionActivatorPostDeploymentPropertiesObservers?.() ?? [],
  );
  for (const observer of extraObservers) {
    if (metamodel.properties) {
      observer(metamodel.properties);
    }
  }
  return metamodel;
};

export const observe_MemSQLFunctionDeploymentConfiguration = skipObserved(
  (metamodel: MemSQLDeploymentConfiguration): MemSQLDeploymentConfiguration => {
    makeObservable(metamodel, {
      activationConnection: observable,
    });

    if (metamodel.activationConnection) {
      observe_ConnectionPointer(metamodel.activationConnection);
    }

    return metamodel;
  },
);
