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

import { createModelSchema, list, primitive, custom } from 'serializr';
import {
  serializeArray,
  deserializeArray,
  usingModelSchema,
  usingConstantValueSchema,
} from '@finos/legend-studio-shared';
import { V1_packageableElementPointerDeserrializerSchema } from '../../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';
import {
  V1_GenerationSpecification,
  V1_GenerationTreeNode,
} from '../../../model/packageableElements/generationSpecification/V1_GenerationSpecification';

export const V1_GENERATION_SPECIFICATION_ELEMENT_PROTOCOL_TYPE =
  'generationSpecification';

export const V1_generationTreeNodeModelSchema = createModelSchema(
  V1_GenerationTreeNode,
  {
    children: custom(
      (values) => serializeArray(values, (value) => value, true),
      (values) => deserializeArray(values, (value) => value, false),
    ),
    generationElement: primitive(),
    id: primitive(),
  },
);

export const V1_generationSpecificationsModelSchema = createModelSchema(
  V1_GenerationSpecification,
  {
    _type: usingConstantValueSchema(
      V1_GENERATION_SPECIFICATION_ELEMENT_PROTOCOL_TYPE,
    ),
    fileGenerations: list(
      usingModelSchema(V1_packageableElementPointerDeserrializerSchema),
    ),
    generationNodes: list(usingModelSchema(V1_generationTreeNodeModelSchema)),
    name: primitive(),
    package: primitive(),
  },
);
