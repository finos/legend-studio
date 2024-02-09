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
import { V1_SnowflakeAppType } from '../../../../engine/functionActivator/V1_SnowflakeAppType.js';
import { SnowflakeAppType } from '../../../../../../../../graph/metamodel/pure/functionActivator/SnowflakeAppType.js';
import type { V1_RestServiceDeploymentConfiguration } from '../../../../engine/functionActivator/V1_RestServiceDeploymentConfiguration.js';
import { RestServiceDeploymentConfiguration } from '../../../../../../../../graph/metamodel/pure/functionActivator/RestServiceDeploymentConfiguration.js';
import {
  V1_DeploymentOwnership,
  V1_UserListOwnership,
  type V1_RestServiceOwnership,
} from '../../../../model/packageableElements/function/V1_RestServiceOwnership.js';
import {
  RestDeploymentOwnership,
  RestUserListOwnership,
  type RestServiceOwnership,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/function/RestServiceOwnership.js';
import type { RestService } from '../../../../../../../../graph/metamodel/pure/packageableElements/function/RestService.js';

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

export const V1_buildSnowflakeAppType = (
  element: V1_SnowflakeAppType,
): SnowflakeAppType => {
  switch (element) {
    case V1_SnowflakeAppType.FULL:
      return SnowflakeAppType.FULL;
    case V1_SnowflakeAppType.STAGE:
      return SnowflakeAppType.STAGE;
    default:
      throw new UnsupportedOperationError(
        `Can't build V1_SnowflakeApp type`,
        element,
      );
  }
};

export const V1_buildRestServiceDeploymentConfiguration = (
  element: V1_RestServiceDeploymentConfiguration,
): RestServiceDeploymentConfiguration => {
  const metamodel = new RestServiceDeploymentConfiguration();

  metamodel.host = element.host;
  metamodel.port = element.port;
  metamodel.path = element.path;

  return metamodel;
};

export const V1_builRestServiceOwnership = (
  serviceOwnership: V1_RestServiceOwnership,
  parentService: RestService,
): RestServiceOwnership => {
  if (serviceOwnership instanceof V1_DeploymentOwnership) {
    return new RestDeploymentOwnership(serviceOwnership.id, parentService);
  } else if (serviceOwnership instanceof V1_UserListOwnership) {
    return new RestUserListOwnership(serviceOwnership.users, parentService);
  }
  throw new UnsupportedOperationError();
};
