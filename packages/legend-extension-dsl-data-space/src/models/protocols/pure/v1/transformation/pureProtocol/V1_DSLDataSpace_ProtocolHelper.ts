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
  deserializeArray,
  serializeArray,
  usingConstantValueSchema,
} from '@finos/legend-shared';
import { createModelSchema, custom, optional, primitive } from 'serializr';
import { V1_DataSpace } from '../../model/packageableElements/dataSpace/V1_DataSpace';

export const V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE = 'dataSpace';

export const V1_dataSpaceModelSchema = createModelSchema(V1_DataSpace, {
  _type: usingConstantValueSchema(V1_DATA_SPACE_ELEMENT_PROTOCOL_TYPE),
  artifactId: primitive(),
  description: optional(primitive()),
  diagrams: custom(
    (values) => serializeArray(values, (value) => value, true),
    (values) => deserializeArray(values, (value) => value, false),
  ),
  groupId: primitive(),
  mapping: primitive(),
  name: primitive(),
  package: primitive(),
  runtime: primitive(),
  supportEmail: optional(primitive()),
  versionId: primitive(),
});
