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
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_SnowflakeAppDeploymentConfiguration } from '../../../engine/functionActivator/V1_SnowflakeAppDeploymentConfiguration.js';
import { createModelSchema } from 'serializr';
import { V1_connectionPointerModelSchema } from './V1_ConnectionSerializationHelper.js';

const V1_SNOWFLAKE_APP_DEPLOYMENT_CONFIGURATION_APP_TYPE =
  'snowflakeDeploymentConfiguration';

export const V1_SnowflakeAppDeploymentConfigurationAppModelSchema =
  createModelSchema(V1_SnowflakeAppDeploymentConfiguration, {
    _type: usingConstantValueSchema(
      V1_SNOWFLAKE_APP_DEPLOYMENT_CONFIGURATION_APP_TYPE,
    ),
    activationConnection: usingModelSchema(V1_connectionPointerModelSchema),
  });
