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

import type { ConfigurationProperty } from '../metamodel/pure/packageableElements/fileGeneration/ConfigurationProperty.js';
import type { FileGenerationSpecification } from '../metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';

export const getNullableFileGenerationConfig = (
  fileGeneration: FileGenerationSpecification,
  name: string,
): ConfigurationProperty | undefined =>
  fileGeneration.configurationProperties.find(
    (property) => name === property.name,
  );
