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

import { list, primitive, createModelSchema } from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { V1_GenerationProperty } from '../generation/V1_GenerationConfigurationDescription.js';

export class V1_ExternalFormatDescription {
  name: string;
  contentTypes: string[] = [];
  supportsSchemaGeneration = false;
  schemaGenerationProperties: V1_GenerationProperty[] = [];
  supportsModelGeneration = false;
  modelGenerationProperties: V1_GenerationProperty[] = [];
  constructor(name: string) {
    this.name = name;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ExternalFormatDescription, {
      name: primitive(),
      contentTypes: list(primitive()),
      supportsSchemaGeneration: primitive(),
      schemaGenerationProperties: usingModelSchema(
        V1_GenerationProperty.serialization.schema,
      ),
      supportsModelGeneration: primitive(),
      modelGenerationProperties: usingModelSchema(
        V1_GenerationProperty.serialization.schema,
      ),
    }),
  );
}
