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

import { usingConstantValueSchema } from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';
import { V1_Text } from '../../model/packageableElements/text/V1_DSL_Text_Text.js';

export const V1_TEXT_ELEMENT_PROTOCOL_TYPE = 'text';

export const V1_textModelSchema = createModelSchema(V1_Text, {
  _type: usingConstantValueSchema(V1_TEXT_ELEMENT_PROTOCOL_TYPE),
  content: primitive(),
  name: primitive(),
  package: primitive(),
  type: primitive(),
});
