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
  list,
  primitive,
  createModelSchema,
  optional,
  object,
} from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import {
  V1_PureModelContextData,
  PureClientVersion,
} from '@finos/legend-graph';
import { V1_MappingGenerationConfiguration } from '../model/V1_MappingGenerationConfiguration';

export const V1_mappingGenerationConfigModelSchema = createModelSchema(
  V1_MappingGenerationConfiguration,
  {
    sourceMapping: primitive(),
    mappingToRegenerate: primitive(),
    m2mAdditionalMappings: list(primitive()),
    mappingNewName: optional(primitive()),
    storeNewName: optional(primitive()),
  },
);

export class V1_MappingGenerateModelInput {
  clientVersion?: string | undefined;
  model: V1_PureModelContextData;
  config: V1_MappingGenerationConfiguration;

  constructor(
    config: V1_MappingGenerationConfiguration,
    model: V1_PureModelContextData,
  ) {
    this.clientVersion = PureClientVersion.VX_X_X;
    this.config = config;
    this.model = model;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingGenerateModelInput, {
      clientVersion: optional(primitive()),
      model: object(V1_PureModelContextData),
      config: usingModelSchema(V1_mappingGenerationConfigModelSchema),
    }),
  );
}
