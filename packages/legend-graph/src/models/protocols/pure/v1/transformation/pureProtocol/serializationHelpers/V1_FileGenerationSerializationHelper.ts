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

import { createModelSchema, raw, list, primitive, optional } from 'serializr';
import {
  usingConstantValueSchema,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_ConfigurationProperty } from '../../../model/packageableElements/fileGeneration/V1_ConfigurationProperty.js';
import { V1_FileGenerationSpecification } from '../../../model/packageableElements/fileGeneration/V1_FileGenerationSpecification.js';

export const V1_FILE_GENERATION_ELEMENT_PROTOCOL_TYPE = 'fileGeneration';

export const V1_configurationPropertyModelSchema = createModelSchema(
  V1_ConfigurationProperty,
  {
    name: primitive(),
    value: raw(),
  },
);

export const V1_fileGenerationModelSchema = createModelSchema(
  V1_FileGenerationSpecification,
  {
    _type: usingConstantValueSchema(V1_FILE_GENERATION_ELEMENT_PROTOCOL_TYPE),
    configurationProperties: list(
      usingModelSchema(V1_configurationPropertyModelSchema),
    ),
    generationOutputPath: optional(primitive()),
    name: primitive(),
    package: primitive(),
    scopeElements: list(primitive()),
    type: primitive(),
  },
);
