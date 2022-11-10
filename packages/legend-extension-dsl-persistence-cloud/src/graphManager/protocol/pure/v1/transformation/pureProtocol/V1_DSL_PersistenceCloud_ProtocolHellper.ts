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

import { V1_AwsGluePersistencePlatform } from '../../model/packageableElements/persistence/cloud/V1_DSL_PersistenceCloud_AwsGluePersistencePlatform.js';
import { usingConstantValueSchema } from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

/**********
 * persistence platfrom
 **********/

export const V1_AWS_GLUE_PERSISTENCE_PLATFORM_PROTOCOL_TYPE = 'awsGlue';

export const V1_awsGluePersistencePlatformModelSchema = createModelSchema(
  V1_AwsGluePersistencePlatform,
  {
    _type: usingConstantValueSchema(
      V1_AWS_GLUE_PERSISTENCE_PLATFORM_PROTOCOL_TYPE,
    ),
    dataProcessingUnits: primitive(),
  },
);
