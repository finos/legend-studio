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

import { SnowflakeApp } from '../metamodel/pure/model/packageableElements/snowflakeApp/DSL_SnowflakeApp_SnowflakeApp.js';
import { SnowflakeAppDeploymentConfiguration } from '../metamodel/pure/model/functionActivator/DSL_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';
import { SnowflakeAppType } from '../metamodel/pure/model/functionActivator/DSL_SnowflakeApp_SnowflakeAppType.js';
import {
  type ConcreteFunctionDefinition,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';

export const create_SnowflakeAppElement = (
  name: string,
  functionElement: ConcreteFunctionDefinition,
): SnowflakeApp => {
  const snowflakeApp = new SnowflakeApp(name);
  snowflakeApp.applicationName = '';
  snowflakeApp.description = '';
  snowflakeApp.owner = undefined;
  snowflakeApp.type = SnowflakeAppType.FULL;
  snowflakeApp.function =
    PackageableElementExplicitReference.create(functionElement);
  snowflakeApp.activationConfiguration =
    new SnowflakeAppDeploymentConfiguration();
  return snowflakeApp;
};
