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

import { primitive, createModelSchema, object } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';
import {
  V1_PureModelContextData,
  V1_GenerationInput,
} from '@finos/legend-graph';
import { V1_MappingGenerationConfiguration as V1_MappingGenerationConfiguration } from './V1_MappingGenerationConfiguration.js';

export class V1_MappingGenerationInput extends V1_GenerationInput {
  config!: V1_MappingGenerationConfiguration;

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingGenerationInput, {
      clientVersion: primitive(),
      model: object(V1_PureModelContextData),
      config: object(V1_MappingGenerationConfiguration),
    }),
  );
}
