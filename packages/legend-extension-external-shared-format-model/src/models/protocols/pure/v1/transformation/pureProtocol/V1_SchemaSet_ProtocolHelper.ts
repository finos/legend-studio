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
import { createModelSchema, primitive, list } from 'serializr';
import { V1_SchemaSet } from '../../model/packageableElements/V1_SchemaSet';
import { V1_Schema } from '../../model/packageableElements/V1_Schema';

export const V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE = 'externalFormatSchemaSet';

const V1_schemaModelSchema = createModelSchema(V1_Schema, {
  content: primitive(),
  id: primitive(),
  location: primitive(),
});

export const V1_schemaSetModelSchema = createModelSchema(V1_SchemaSet, {
  _type: usingConstantValueSchema(V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE),
  format: primitive(),
  name: primitive(),
  package: primitive(),
  schemas: list(usingModelSchema(V1_schemaModelSchema)),
});
