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
  V1_initPackageableElement,
  V1_transformConnectionPointer,
  generateFunctionPrettyName,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import type { SnowflakeAppDeploymentConfiguration } from '../../../../../../../graph/metamodel/pure/model/functionActivator/DSL_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';
import { SnowflakeAppType } from '../../../../../../../graph/metamodel/pure/model/functionActivator/DSL_SnowflakeApp_SnowflakeAppType.js';
import type { SnowflakeApp } from '../../../../../../../graph/metamodel/pure/model/packageableElements/snowflakeApp/DSL_SnowflakeApp_SnowflakeApp.js';
import { V1_SnowflakeAppDeploymentConfiguration } from '../../../model/functionActivator/V1_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';
import { V1_SnowflakeAppType } from '../../../model/functionActivator/V1_SnowflakeApp_SnowflakeAppType.js';
import { V1_SnowflakeApp } from '../../../model/packageableElements/snowflakeApp/V1_SnowflakeApp_SnowflakeApp.js';

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

export const V1_transformSnowflakeApp = (
  element: SnowflakeApp,
): V1_SnowflakeApp => {
  const protocol = new V1_SnowflakeApp();
  V1_initPackageableElement(protocol, element);
  protocol.function = generateFunctionPrettyName(element.function.value, {
    fullPath: true,
    spacing: false,
    notIncludeParamName: true,
  });
  protocol.applicationName = element.applicationName;
  protocol.description = element.description;
  protocol.owner = element.owner;
  protocol.activationConfiguration =
    V1_transformSnowflakeAppDeploymentConfiguration(
      element.activationConfiguration,
    );
  if (element.type) {
    protocol.type = V1_transformSnowflakeAppType(element.type);
  }
  return protocol;
};
