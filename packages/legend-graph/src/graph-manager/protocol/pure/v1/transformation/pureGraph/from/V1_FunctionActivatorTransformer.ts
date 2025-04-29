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

import { UnsupportedOperationError } from '@finos/legend-shared';
import type { SnowflakeAppDeploymentConfiguration } from '../../../../../../../graph/metamodel/pure/functionActivator/SnowflakeAppDeploymentConfiguration.js';
import {
  DeploymentOwner,
  UserList,
  type Ownership,
} from '../../../../../../../graph/metamodel/pure/packageableElements/function/Ownership.js';
import { V1_SnowflakeAppDeploymentConfiguration } from '../../../engine/functionActivator/V1_SnowflakeAppDeploymentConfiguration.js';
import {
  V1_DeploymentOwner,
  type V1_Ownership,
  V1_UserList,
} from '../../../model/packageableElements/function/V1_Ownership.js';
import { V1_transformConnectionPointer } from './V1_ConnectionTransformer.js';
import { V1_HostedServiceDeploymentConfiguration } from '../../../engine/functionActivator/V1_HostedServiceDeploymentConfiguration.js';
import type { HostedServiceDeploymentConfiguration } from '../../../../../../../graph/metamodel/pure/functionActivator/HostedServiceDeploymentConfiguration.js';
import type { PostDeploymentAction } from '../../../../../../../graph/metamodel/pure/functionActivator/PostDeploymentAction.js';
import type { DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import type { V1_PostDeploymentAction } from '../../../engine/functionActivator/V1_PostDeploymentAction.js';
export const V1_transformSnowflakeAppDeploymentConfiguration = (
  element: SnowflakeAppDeploymentConfiguration,
): V1_SnowflakeAppDeploymentConfiguration => {
  const protocol = new V1_SnowflakeAppDeploymentConfiguration();

  if (element.activationConnection) {
    protocol.activationConnection = V1_transformConnectionPointer(
      element.activationConnection,
    );
  }

  return protocol;
};

export const V1_transformDeployment = (
  metamodel: DeploymentOwner,
): V1_DeploymentOwner => {
  const ownership = new V1_DeploymentOwner();
  ownership.id = metamodel.id;
  return ownership;
};

export const V1_transformUserList = (element: UserList): V1_UserList => {
  const ownership = new V1_UserList();
  ownership.users = element.users;
  return ownership;
};

export const V1_transformOwnership = (metamodel: Ownership): V1_Ownership => {
  if (metamodel instanceof DeploymentOwner) {
    return V1_transformDeployment(metamodel);
  } else if (metamodel instanceof UserList) {
    return V1_transformUserList(metamodel);
  }
  throw new UnsupportedOperationError(
    "Can't transform function activator ownership",
    metamodel,
  );
};

export const V1_transformActions = (
  metamodel: PostDeploymentAction[],
  context: V1_GraphTransformerContext,
): V1_PostDeploymentAction[] => {
  const extraFunctionActivatorTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraPostDeploymentPropertiesTransformers?.() ?? [],
  );
  for (const transformer of extraFunctionActivatorTransformers) {
    const protocol: V1_PostDeploymentAction[] = [];
    for (const action of metamodel) {
      const actionProtocol = new V1_PostDeploymentAction();
      actionProtocol.automated = action.automated;
      if (action.properties) {
        actionProtocol.properties = transformer(action.properties, context);
      }
      protocol.push(actionProtocol);
    }
    return protocol;
  }
  throw new UnsupportedOperationError(
    "Can't transform function activator actions",
    metamodel,
  );
};

export const V1_transformHostedServiceDeploymentConfiguration = (
  element: HostedServiceDeploymentConfiguration,
): V1_HostedServiceDeploymentConfiguration => {
  const protocol = new V1_HostedServiceDeploymentConfiguration();
  protocol.host = element.host;
  protocol.path = element.path;
  protocol.port = element.port;
  return protocol;
};
