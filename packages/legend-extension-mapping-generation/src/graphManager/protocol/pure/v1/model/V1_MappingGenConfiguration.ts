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

import { ModelGenerationConfiguration } from '@finos/legend-graph';

export class V1_MappingGenConfiguration extends ModelGenerationConfiguration {
  sourceMapping?: string | undefined;
  mappingToRegenerate?: string | undefined;
  mappingNewName?: string | undefined;
  storeNewName?: string | undefined;
  m2mAdditionalMappings: string[] = [];

  constructor(
    sourceMapping: string | undefined,
    mappingToRegenerate: string | undefined,
    mappingNewName: string | undefined,
    storeNewName: string | undefined,
    m2mAdditionalMappings: string[],
    key: string,
    label?: string | undefined,
  ) {
    super(key, label);
    this.sourceMapping = sourceMapping;
    this.mappingToRegenerate = mappingToRegenerate;
    this.mappingNewName = mappingNewName;
    this.storeNewName = storeNewName;
    this.m2mAdditionalMappings = m2mAdditionalMappings;
  }
}
