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
import type { V1_Multiplicity } from '@finos/legend-graph';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../../../graph/STO_ServiceStore_HashUtils.js';

export class V1_LocalMappingProperty implements Hashable {
  name!: string;
  type!: string;
  multiplicity!: V1_Multiplicity;

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.LOCAL_MAPPING_PROPERTY,
      this.name,
      this.type,
      this.multiplicity,
    ]);
  }
}
