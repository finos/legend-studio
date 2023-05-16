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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';
import { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import {
  ValueSpecification,
  type ValueSpecificationVisitor,
} from './ValueSpecification.js';

/**
 * This value specification maintains a reference to another value specification
 *
 * @internal This type is specific to Studio only, not a standard, recognizeable in Pure/engine.
 */
export class INTERNAL__PropagatedValue
  extends ValueSpecification
  implements Hashable
{
  readonly getValue!: () => ValueSpecification;
  /**
   * Tells whether we need to replace the `INTERNAL__PropagatedValue` with actual `ValueSpecification` or not.
   */
  isPropagatedValue = true;

  constructor(getValue: () => ValueSpecification) {
    super(Multiplicity.ZERO);

    this.getValue = getValue;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__PROPAGATED_VALUE,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
    ]);
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_INTERNAL__PropagatedValue(this);
  }
}
