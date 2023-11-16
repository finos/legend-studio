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
  customListWithSchema,
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import { createModelSchema, primitive, optional } from 'serializr';
import { V1_SnowflakeApp } from '../../model/packageableElements/snowflakeApp/V1_SnowflakeApp_SnowflakeApp.js';
import {
  V1_connectionPointerModelSchema,
  V1_stereotypePtrModelSchema,
  V1_taggedValueModelSchema,
} from '@finos/legend-graph';
import { V1_SnowflakeAppDeploymentConfiguration } from '../../model/functionActivator/V1_SnowflakeApp_SnowflakeAppDeploymentConfiguration.js';

export const V1_SNOWFLAKE_APP_ELEMENT_PROTOCOL_TYPE = 'snowflakeApp';
const V1_SNOWFLAKE_APP_DEPLOYMENT_CONFIGURATION_APP_TYPE =
  'snowflakeDeploymentConfiguration';

export const V1_SnowflakeAppDeploymentConfigurationAppModelSchema =
  createModelSchema(V1_SnowflakeAppDeploymentConfiguration, {
    _type: usingConstantValueSchema(
      V1_SNOWFLAKE_APP_DEPLOYMENT_CONFIGURATION_APP_TYPE,
    ),
    activationConnection: usingModelSchema(V1_connectionPointerModelSchema),
  });

export const V1_snowflakeAppModelSchema = createModelSchema(V1_SnowflakeApp, {
  _type: usingConstantValueSchema(V1_SNOWFLAKE_APP_ELEMENT_PROTOCOL_TYPE),
  description: optional(primitive()),
  owner: optional(primitive()),
  applicationName: primitive(),
  function: primitive(),
  name: primitive(),
  package: primitive(),
  stereotypes: customListWithSchema(V1_stereotypePtrModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  taggedValues: customListWithSchema(V1_taggedValueModelSchema, {
    INTERNAL__forceReturnEmptyInTest: true,
  }),
  activationConfiguration: usingModelSchema(
    V1_SnowflakeAppDeploymentConfigurationAppModelSchema,
  ),
  type: optional(primitive()),
});
