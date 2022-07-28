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
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';
import { V1_AbstractFlatDataPropertyMapping } from './V1_AbstractFlatDataPropertyMapping.js';
import type { V1_RawLambda } from '../../../../../model/rawValueSpecification/V1_RawLambda.js';
import type { V1_PropertyMappingVisitor } from '../../../../../model/packageableElements/mapping/V1_PropertyMapping.js';

export class V1_FlatDataPropertyMapping
  extends V1_AbstractFlatDataPropertyMapping
  implements Hashable
{
  enumMappingId?: string | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  transform!: V1_RawLambda;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_PROPERTY_MAPPING,
      super.hashCode,
      this.enumMappingId ?? '',
      this.transform,
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: V1_PropertyMappingVisitor<T>): T {
    return visitor.visit_FlatDataPropertyMapping(this);
  }
}
