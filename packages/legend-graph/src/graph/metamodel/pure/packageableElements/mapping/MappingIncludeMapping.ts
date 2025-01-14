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

import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { hashArray } from '@finos/legend-shared';
import type { SubstituteStore } from './SubstituteStore.js';
import { MappingInclude } from './MappingInclude.js';

export class MappingIncludeMapping extends MappingInclude {
  storeSubstitutions: SubstituteStore[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_INCLUDE_MAPPING,
      this.included.valueForSerialization ?? '',
      this.storeSubstitutions[0]?.original.valueForSerialization ?? '',
      this.storeSubstitutions[0]?.substitute.valueForSerialization ?? '',
    ]);
  }
}
