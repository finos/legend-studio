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

import { V1_MasterRecordDefinition } from '../../model/packageableElements/mastery/V1_DSL_Mastery_MasterRecordDefinition.js';
import {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_IdentityResolution.js';
import {
  V1_RecordSource,
  V1_RecordSourcePartition,
} from '../../model/packageableElements/mastery/V1_DSL_Mastery_RecordSource.js';
import {
  type PureProtocolProcessorPlugin,
  V1_rawLambdaModelSchema,
} from '@finos/legend-graph';
import {
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  deserialize,
  list,
  type ModelSchema,
  primitive,
  serialize,
} from 'serializr';

/**********
 * sources
 **********/

const V1_recordSourcePartitionSchema = createModelSchema(
  V1_RecordSourcePartition,
  {
    id: primitive(),
    tags: list(primitive()),
  },
);

const V1_recordSourceSchema = createModelSchema(V1_RecordSource, {
  createBlockedException: primitive(),
  createPermitted: primitive(),
  description: primitive(),
  id: primitive(),
  parseService: primitive(),
  partitions: list(
    custom(
      (val) => serialize(V1_recordSourcePartitionSchema, val),
      (val) => deserialize(V1_recordSourcePartitionSchema, val),
    ),
  ),
  sequentialData: primitive(),
  stagedLoad: primitive(),
  status: primitive(),
  tags: list(primitive()),
  transformService: primitive(),
});

/**********
 * identity resolution
 **********/

const V1_resolutionQuerySchema = createModelSchema(V1_ResolutionQuery, {
  keyType: primitive(),
  precedence: primitive(),
  queries: list(usingModelSchema(V1_rawLambdaModelSchema)),
});

const V1_identityResolutionSchema = createModelSchema(V1_IdentityResolution, {
  modelClass: primitive(),
  resolutionQueries: list(
    custom(
      (val) => serialize(V1_resolutionQuerySchema, val),
      (val) => deserialize(V1_resolutionQuerySchema, val),
    ),
  ),
});

/**********
 * master record definition
 **********/

export const V1_MASTER_RECORD_DEFINITION_ELEMENT_PROTOCOL_TYPE = 'mastery';

export const V1_masterRecordDefinitionModelSchema = (
  plugins: PureProtocolProcessorPlugin[],
): ModelSchema<V1_MasterRecordDefinition> =>
  createModelSchema(V1_MasterRecordDefinition, {
    _type: usingConstantValueSchema(
      V1_MASTER_RECORD_DEFINITION_ELEMENT_PROTOCOL_TYPE,
    ),
    identityResolution: custom(
      (val) => serialize(V1_identityResolutionSchema, val),
      (val) => deserialize(V1_identityResolutionSchema, val),
    ),
    modelClass: primitive(),
    name: primitive(),
    package: primitive(),
    sources: list(
      custom(
        (val) => serialize(V1_recordSourceSchema, val),
        (val) => deserialize(V1_recordSourceSchema, val),
      ),
    ),
  });
