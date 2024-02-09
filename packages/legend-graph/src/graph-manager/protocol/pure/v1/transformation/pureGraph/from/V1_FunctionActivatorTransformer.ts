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
import { V1_SnowflakeAppDeploymentConfiguration } from '../../../engine/functionActivator/V1_SnowflakeAppDeploymentConfiguration.js';
import { V1_transformConnectionPointer } from './V1_ConnectionTransformer.js';
import { V1_SnowflakeAppType } from '../../../engine/functionActivator/V1_SnowflakeAppType.js';
import { SnowflakeAppType } from '../../../../../../../graph/metamodel/pure/functionActivator/SnowflakeAppType.js';
import type { RestServiceDeploymentConfiguration } from '../../../../../../../graph/metamodel/pure/functionActivator/RestServiceDeploymentConfiguration.js';
import { V1_RestServiceDeploymentConfiguration } from '../../../engine/functionActivator/V1_RestServiceDeploymentConfiguration.js';

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

export const V1_transformSnowflakeAppType = (
  value: SnowflakeAppType,
): V1_SnowflakeAppType => {
  switch (value) {
    case SnowflakeAppType.FULL:
      return V1_SnowflakeAppType.FULL;
    case SnowflakeAppType.STAGE:
      return V1_SnowflakeAppType.STAGE;
    default:
      throw new UnsupportedOperationError(
        `Can't transform SnowflakeApp type`,
        value,
      );
  }
};

export const V1_transformRestServiceDeploymentConfiguration = (
  element: RestServiceDeploymentConfiguration,
): V1_RestServiceDeploymentConfiguration => {
  const protocol = new V1_RestServiceDeploymentConfiguration();
  protocol.host = element.host;
  protocol.path = element.path;
  protocol.port = element.port;
  return protocol;
};
