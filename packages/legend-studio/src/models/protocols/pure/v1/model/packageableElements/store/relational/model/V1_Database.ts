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

import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import { hashArray } from '@finos/legend-studio-shared';
import type { V1_PackageableElementVisitor } from '../../../../../model/packageableElements/V1_PackageableElement';
import { V1_Store } from '../../../../../model/packageableElements/store/V1_Store';
import type { V1_Schema } from './V1_Schema';
import type { V1_Join } from './V1_Join';
import type { V1_Filter } from './V1_Filter';

export class V1_Database extends V1_Store implements Hashable {
  schemas: V1_Schema[] = [];
  joins: V1_Join[] = [];
  filters: V1_Filter[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABASE,
      super.hashCode,
      hashArray(this.schemas),
      hashArray(this.joins),
      hashArray(this.filters),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Database(this);
  }
}
