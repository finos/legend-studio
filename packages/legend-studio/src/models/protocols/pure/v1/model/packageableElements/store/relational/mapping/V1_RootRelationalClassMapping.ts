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
import { hashArray } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';
import type { V1_FilterMapping } from './V1_FilterMapping';
import { V1_RelationalClassMapping } from './V1_RelationalClassMapping';
import type { V1_RelationalOperationElement } from '../../../../../model/packageableElements/store/relational/model/V1_RelationalOperationElement';
import type { V1_TablePtr } from '../../../../../model/packageableElements/store/relational/model/V1_TablePtr';
import type { V1_ClassMappingVisitor } from '../../../../../model/packageableElements/mapping/V1_ClassMapping';

export class V1_RootRelationalClassMapping
  extends V1_RelationalClassMapping
  implements Hashable
{
  mainTable?: V1_TablePtr;
  distinct!: boolean;
  groupBy: V1_RelationalOperationElement[] = [];
  filter?: V1_FilterMapping;

  override accept_ClassMappingVisitor<T>(
    visitor: V1_ClassMappingVisitor<T>,
  ): T {
    return visitor.visit_RootRelationalClassMapping(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ROOT_RELATIONAL_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.mainTable ?? '',
      this.distinct.toString(),
      hashArray(this.groupBy),
      this.filter ?? '',
    ]);
  }
}
