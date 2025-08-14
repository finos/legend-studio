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

import {
  V1_ValueSpecification,
  type V1_ValueSpecificationVisitor,
} from '../../model/valueSpecification/V1_ValueSpecification.js';
import type { V1_Multiplicity } from '../../model/packageableElements/domain/V1_Multiplicity.js';
import type { V1_GenericType } from '../packageableElements/type/V1_GenericType.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../graph/Core_HashUtils.js';

export class V1_Variable extends V1_ValueSpecification implements Hashable {
  name!: string;
  multiplicity!: V1_Multiplicity;
  genericType: V1_GenericType | undefined;

  accept_ValueSpecificationVisitor<T>(
    visitor: V1_ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_Variable(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.VARIABLE_EXPRESSION,
      this.name,
      this.multiplicity,
      this.genericType?.rawType.hashCode,
    ]);
  }
}
