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

import type { Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-shared';
import type { V1_FilterPointer } from './V1_FilterPointer';
import type { V1_JoinPointer } from '../../../../../model/packageableElements/store/relational/model/V1_JoinPointer';

export class V1_FilterMapping implements Hashable {
  filter!: V1_FilterPointer;
  joins?: V1_JoinPointer[] = [];
  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FILTER_MAPPING,
      this.filter.db ?? '',
      this.filter.name,
      hashArray(this.joins ?? []),
    ]);
  }
}
