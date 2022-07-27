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
  type V1_PropertyMappingVisitor,
  V1_PropertyMapping,
} from '../../../../../model/packageableElements/mapping/V1_PropertyMapping.js';
import type { V1_RawLambda } from '../../../../../model/rawValueSpecification/V1_RawLambda.js';

export class V1_PurePropertyMapping
  extends V1_PropertyMapping
  implements Hashable
{
  enumMappingId?: string | undefined;
  explodeProperty?: boolean | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  transform!: V1_RawLambda;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PURE_PROPERTY_MAPPING,
      super.hashCode,
      this.enumMappingId ?? '',
      this.transform,
      Boolean(this.explodeProperty).toString(),
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: V1_PropertyMappingVisitor<T>): T {
    return visitor.visit_PurePropertyMapping(this);
  }
}
