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

import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import type { V1_PackageableElementVisitor } from '../../../../../model/packageableElements/V1_PackageableElement.js';
import { V1_Store } from '../../../../../model/packageableElements/store/V1_Store.js';
import type { V1_Schema } from './V1_Schema.js';
import type { V1_Join } from './V1_Join.js';
import type { V1_Filter } from './V1_Filter.js';
import type { V1_StereotypePtr } from '../../../domain/V1_StereotypePtr.js';

export class V1_Database extends V1_Store implements Hashable {
  schemas: V1_Schema[] = [];
  joins: V1_Join[] = [];
  filters: V1_Filter[] = [];
  stereotypes: V1_StereotypePtr[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE,
      this.path,
      hashArray(this.includedStores.map((e) => e.path)),
      hashArray(this.schemas),
      hashArray(this.joins),
      hashArray(this.filters),
      hashArray(this.stereotypes),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Database(this);
  }
}
