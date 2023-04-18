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
  hashArray,
  hashObject,
  hashUnknownValue,
  isObject,
  type Hashable,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';

export class V1_ConfigurationProperty implements Hashable {
  name!: string;
  value!: unknown; // Any

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CONFIGURATION_PROPERTY,
      this.name,
      isObject(this.value)
        ? hashObject(this.value)
        : hashUnknownValue(this.value),
    ]);
  }
}
