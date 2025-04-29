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

import { ConnectionPointer } from '../../../../../../../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import { SnowflakeAppDeploymentConfiguration } from '../../../../../../../../graph/metamodel/pure/functionActivator/SnowflakeAppDeploymentConfiguration.js';
import type { V1_SnowflakeAppDeploymentConfiguration } from '../../../../engine/functionActivator/V1_SnowflakeAppDeploymentConfiguration.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import { V1_buildConnection } from './V1_ConnectionBuilderHelper.js';
import { UnsupportedOperationError, guaranteeType } from '@finos/legend-shared';
import {
  DeploymentOwner,
  UserList,
  type Ownership,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/function/Ownership.js';
import {
  V1_DeploymentOwner,
  V1_UserList,
  type V1_Ownership,
} from '../../../../model/packageableElements/function/V1_Ownership.js';
import type { FunctionActivator } from '../../../../../../../../graph/metamodel/pure/packageableElements/function/FunctionActivator.js';
import { HostedServiceDeploymentConfiguration } from '../../../../../../../../graph/metamodel/pure/functionActivator/HostedServiceDeploymentConfiguration.js';
import type { V1_HostedServiceDeploymentConfiguration } from '../../../../engine/functionActivator/V1_HostedServiceDeploymentConfiguration.js';
import { PostDeploymentAction } from '../../../../../../../../graph/metamodel/pure/functionActivator/PostDeploymentAction.js';
import type { DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension.js';
import type { V1_PostDeploymentAction } from '../../../../engine/functionActivator/V1_PostDeploymentAction.js';

export const V1_buildSnowflakeAppDeploymentConfiguration = (
  element: V1_SnowflakeAppDeploymentConfiguration,
  context: V1_GraphBuilderContext,
): SnowflakeAppDeploymentConfiguration => {
  const metamodel = new SnowflakeAppDeploymentConfiguration();

  if (element.activationConnection) {
    const activationConnection = guaranteeType(
      V1_buildConnection(element.activationConnection, context),
      ConnectionPointer,
    );

    metamodel.activationConnection = activationConnection;
  }
  return metamodel;
};

export const V1_buildDeploymentOwnership = (
  ownership: V1_DeploymentOwner,
  functionActivator: FunctionActivator,
): DeploymentOwner => new DeploymentOwner(ownership.id, functionActivator);

export const V1_buildUserList = (
  ownership: V1_UserList,
  functionActivator: FunctionActivator,
): UserList => new UserList(ownership.users, functionActivator);

export const V1_builHostedServiceOwnership = (
  ownership: V1_Ownership,
  parentService: FunctionActivator,
): Ownership => {
  if (ownership instanceof V1_DeploymentOwner) {
    return V1_buildDeploymentOwnership(ownership, parentService);
  } else if (ownership instanceof V1_UserList) {
    return V1_buildUserList(ownership, parentService);
  }
  throw new UnsupportedOperationError();
};

export const V1_buildHostedServiceDeploymentConfiguration = (
  element: V1_HostedServiceDeploymentConfiguration,
): HostedServiceDeploymentConfiguration => {
  const metamodel = new HostedServiceDeploymentConfiguration();
  metamodel.host = element.host;
  metamodel.port = element.port;
  metamodel.path = element.path;
  return metamodel;
};

export const V1_buildHostedServiceActions = (
  element: V1_PostDeploymentAction,
  context: V1_GraphBuilderContext,
): PostDeploymentAction => {
  const extraPostDeploymentActionBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_FunctionActivator_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraPostDeploymentPropertiesBuilders?.() ?? [],
  );
  for (const builder of extraPostDeploymentActionBuilders) {
    const metamodel = new PostDeploymentAction();
    metamodel.automated = element.automated;
    if (element.properties) {
      metamodel.properties = builder(element.properties, context);
    }
    return metamodel;
  }
  throw new UnsupportedOperationError(
    `Can't build Hosted Service Action`,
    element,
  );
};
