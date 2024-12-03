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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_EmbeddedData } from '../../data/V1_EmbeddedData.js';
import type { V1_PackageableElementPointer } from '../V1_PackageableElement.js';

export class V1_MappingStoreTestData implements Hashable {
  store!: V1_PackageableElementPointer;
  data!: V1_EmbeddedData;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.STORE_TEST_DATA,
      this.store.path,
      this.data,
    ]);
  }
}
