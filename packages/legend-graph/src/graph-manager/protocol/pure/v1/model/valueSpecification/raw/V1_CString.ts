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
import type { V1_ValueSpecificationVisitor } from '../V1_ValueSpecification.js';
import { V1_PrimitiveValueSpecification } from './V1_PrimitiveValueSpecification.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import { PRIMITIVE_TYPE } from '../../../../../../../graph/MetaModelConst.js';

export class V1_CString
  extends V1_PrimitiveValueSpecification
  implements Hashable
{
  value!: string;
  /**
   * Whether the literal was authored as a multi-line (`'''...'''`) block.
   * See https://github.com/finos/legend-engine/pull/4998
   */
  multiLine = false;

  accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_CString(this);
  }

  /**
   * NOTE: `multiLine` is excluded here to keep this hash compatible with `PrimitiveInstanceValue.hashCode`,
   * whose metamodel has no counterpart for the flag.
   */
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.PRIMITIVE_INSTANCE_VALUE,
      PRIMITIVE_TYPE.STRING,
      this.multiplicity,
      hashObjectWithoutSourceInformation([this.value]),
    ]);
  }
}
