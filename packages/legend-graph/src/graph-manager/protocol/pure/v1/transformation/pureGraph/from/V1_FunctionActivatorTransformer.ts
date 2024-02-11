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
  type Ownership,
} from '../../../../../../../graph/metamodel/pure/packageableElements/function/Ownership.js';
import { V1_SnowflakeAppDeploymentConfiguration } from '../../../engine/functionActivator/V1_SnowflakeAppDeploymentConfiguration.js';
import { V1_DeploymentOwner } from '../../../model/packageableElements/function/V1_Ownership.js';
import { V1_transformConnectionPointer } from './V1_ConnectionTransformer.js';

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

const transformDeployment = (element: DeploymentOwner): V1_DeploymentOwner => {
  const ownership = new V1_DeploymentOwner();
  ownership.id = element.id;
  return ownership;
};

export const V1_transformDeployment = (
  metamodel: Ownership,
): V1_DeploymentOwner => {
  if (metamodel instanceof DeploymentOwner) {
    return transformDeployment(metamodel);
  }
  throw new UnsupportedOperationError(
    "Can't transform function activator ownership",
    metamodel,
  );
};
