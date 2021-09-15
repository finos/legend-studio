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
import {
  createModelSchema,
  primitive,
  list,
  custom,
  serialize,
  deserialize,
} from 'serializr';
import { V1_SchemaSet } from '../../model/packageableElements/schemaSet/V1_SchemaSet';
import { V1_Schema } from '../../model/packageableElements/schemaSet/V1_Schema';
import { V1_Binding } from '../../model/packageableElements/store/V1_Binding';
import { V1_ModelUnit } from '../../model/packageableElements/store/V1_ModelUnit';

export const V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE = 'externalFormatSchemaSet';
export const V1_BINDING_ELEMENT_PROTOCOL_TYPE = 'binding';

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

const V1_modelUnitModelSchema = createModelSchema(V1_ModelUnit, {
  packageableElementExcludes: list(primitive()),
  packageableElementIncludes: list(primitive()),
});

export const V1_bindingModelSchema = createModelSchema(V1_Binding, {
  _type: usingConstantValueSchema(V1_BINDING_ELEMENT_PROTOCOL_TYPE),
  contentType: primitive(),
  modelUnit: custom(
    (val) => serialize(V1_modelUnitModelSchema, val),
    (val) => deserialize(V1_modelUnitModelSchema, val),
  ),
  name: primitive(),
  package: primitive(),
  schemaId: primitive(),
  schemaSet: primitive(),
});
