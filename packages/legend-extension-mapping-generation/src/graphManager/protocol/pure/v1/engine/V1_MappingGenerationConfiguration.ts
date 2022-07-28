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

import { SerializationFactory } from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive } from 'serializr';

export class V1_MappingGenerationConfiguration {
  sourceMapping!: string;
  mappingToRegenerate!: string;
  m2mIntermediateMappings: string[] = [];
  resultMappingName?: string | undefined;
  resultIncludedMappingName?: string | undefined;
  resultStoreName?: string | undefined;
  originalMappingName?: string | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_MappingGenerationConfiguration, {
      sourceMapping: primitive(),
      mappingToRegenerate: primitive(),
      m2mIntermediateMappings: list(primitive()),
      resultMappingName: optional(primitive()),
      resultIncludedMappingName: optional(primitive()),
      resultStoreName: optional(primitive()),
      originalMappingName: optional(primitive()),
    }),
  );
}
