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
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';
import type { RawLambda } from '../../../rawValueSpecification/RawLambda.js';
import {
  type PropertyMappingVisitor,
  PropertyMapping,
} from '../PropertyMapping.js';

export class XStorePropertyMapping extends PropertyMapping implements Hashable {
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  crossExpression!: RawLambda;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.XSTORE_PROPERTY_MAPPING,
      super.hashCode,
      this.crossExpression,
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_XStorePropertyMapping(this);
  }
}
