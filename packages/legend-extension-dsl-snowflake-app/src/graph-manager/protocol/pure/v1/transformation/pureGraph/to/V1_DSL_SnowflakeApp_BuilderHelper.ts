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
  type V1_GraphBuilderContext,
  V1_buildConnection,
  ConnectionPointer,
} from '@finos/legend-graph';
import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import { SnowflakeAppDeploymentConfiguration } from '../../../../../../../graph/metamodel/pure/model/functionActivator/DSL_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';
import { SnowflakeAppType } from '../../../../../../../graph/metamodel/pure/model/functionActivator/DSL_SnowflakeApp_SnowflakeAppType.js';
import type { V1_SnowflakeAppDeploymentConfiguration } from '../../../model/functionActivator/V1_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';
import { V1_SnowflakeAppType } from '../../../model/functionActivator/V1_SnowflakeApp_SnowflakeAppType.js';

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
