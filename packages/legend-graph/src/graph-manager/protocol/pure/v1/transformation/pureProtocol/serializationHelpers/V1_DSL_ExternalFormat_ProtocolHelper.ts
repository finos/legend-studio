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
  alias,
  createModelSchema,
  primitive,
  list,
  optional,
  custom,
  serialize,
  deserialize,
} from 'serializr';
import { V1_ExternalFormatConnection } from '../../../model/packageableElements/externalFormat/connection/V1_DSL_ExternalFormat_ExternalFormatConnection.js';
import { V1_UrlStream } from '../../../model/packageableElements/externalFormat/connection/V1_DSL_ExternalFormat_UrlStream.js';
import { V1_Schema } from '../../../model/packageableElements/externalFormat/schemaSet/V1_DSL_ExternalFormat_Schema.js';
import { V1_SchemaSet } from '../../../model/packageableElements/externalFormat/schemaSet/V1_DSL_ExternalFormat_SchemaSet.js';
import { V1_Binding } from '../../../model/packageableElements/externalFormat/store/V1_DSL_ExternalFormat_Binding.js';
import { V1_ModelUnit } from '../../../model/packageableElements/externalFormat/store/V1_DSL_ExternalFormat_ModelUnit.js';

export const V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE = 'externalFormatSchemaSet';
export const V1_BINDING_ELEMENT_PROTOCOL_TYPE = 'binding';
export const V1_EXTERNAL_FORMAT_CONNECTION_ELEMENT_PROTOCOL_TYPE =
  'ExternalFormatConnection';

const V1_schemaModelSchema = createModelSchema(V1_Schema, {
  content: primitive(),
  id: optional(primitive()),
  location: optional(primitive()),
});

export const V1_schemaSetModelSchema = createModelSchema(V1_SchemaSet, {
  _type: usingConstantValueSchema(V1_SCHEMA_SET_ELEMENT_PROTOCOL_TYPE),
  format: primitive(),
  name: primitive(),
  package: primitive(),
  schemas: list(usingModelSchema(V1_schemaModelSchema)),
});

export const V1_modelUnitModelSchema = createModelSchema(V1_ModelUnit, {
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
  schemaId: optional(primitive()),
  schemaSet: primitive(),
});

const V1_urlStreamModelSchema = createModelSchema(V1_UrlStream, {
  _type: usingConstantValueSchema('urlStream'),
  url: primitive(),
});

export const V1_externalFormatConnectionModelSchema = createModelSchema(
  V1_ExternalFormatConnection,
  {
    _type: usingConstantValueSchema(
      V1_EXTERNAL_FORMAT_CONNECTION_ELEMENT_PROTOCOL_TYPE,
    ),
    store: alias('element', optional(primitive())),
    externalSource: usingModelSchema(V1_urlStreamModelSchema),
  },
);
