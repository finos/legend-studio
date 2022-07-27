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
import {
  CORE_HASH_STRUCTURE,
  hashRawLambda,
} from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';
import type { V1_ClassMappingVisitor } from './V1_ClassMapping.js';
import { V1_OperationClassMapping } from './V1_OperationClassMapping.js';

export class V1_MergeOperationClassMapping
  extends V1_OperationClassMapping
  implements Hashable
{
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  validationFunction!: V1_RawLambda;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OPERATION_SET_IMPLEMENTATION,
      this.operation,
      hashArray(this.parameters),
      hashRawLambda(
        this.validationFunction.parameters,
        this.validationFunction.body,
      ),
    ]);
  }
  override accept_ClassMappingVisitor<T>(
    visitor: V1_ClassMappingVisitor<T>,
  ): T {
    return visitor.visit_MergeOperationClassMapping(this);
  }
}
