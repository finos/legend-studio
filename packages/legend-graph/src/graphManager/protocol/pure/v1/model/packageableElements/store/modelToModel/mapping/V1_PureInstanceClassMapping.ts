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
import {
  type V1_ClassMappingVisitor,
  V1_ClassMapping,
} from '../../../../../model/packageableElements/mapping/V1_ClassMapping.js';
import type { V1_PropertyMapping } from '../../../../../model/packageableElements/mapping/V1_PropertyMapping.js';
import type { V1_RawLambda } from '../../../../../model/rawValueSpecification/V1_RawLambda.js';

export class V1_PureInstanceClassMapping
  extends V1_ClassMapping
  implements Hashable
{
  srcClass?: string | undefined;
  propertyMappings: V1_PropertyMapping[] = [];
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  filter?: V1_RawLambda | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PURE_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.srcClass ?? '',
      this.filter ?? '',
      hashArray(this.propertyMappings),
    ]);
  }

  accept_ClassMappingVisitor<T>(visitor: V1_ClassMappingVisitor<T>): T {
    return visitor.visit_PureInstanceClassMapping(this);
  }
}
