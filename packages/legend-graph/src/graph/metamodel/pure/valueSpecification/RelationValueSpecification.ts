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
import { InstanceValue } from './InstanceValue.js';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from './ValueSpecification.js';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';

/**
 * To Keep simple we have modeled the metamodel classes ColSpec, FuncColSpec, AggColSpec
 * with the singluar `Col Spec` class.
 * @discrepancy model
 */
export class ColSpec implements Hashable {
  name!: string;
  type: string | undefined;
  function1: ValueSpecification | undefined;
  function2: ValueSpecification | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_COL_SPEC,
      this.name,
      this.function1 ?? '',
      this.function2 ?? '',
    ]);
  }
}
export class ColSpecInstanceValue extends InstanceValue implements Hashable {
  override values: ColSpec[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_COL_SPEC,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashArray(this.values),
    ]);
  }
  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_ColSpecInstance(this);
  }
}
export class ColSpecArray implements Hashable {
  colSpecs: ColSpec[] = [];

  get hashCode(): string {
    return hashArray([hashArray(this.colSpecs)]);
  }
}

export class ColSpecArrayInstance extends InstanceValue implements Hashable {
  override values: ColSpecArray[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_COL_SPEC_ARRAY,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashArray(this.values),
    ]);
  }
  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_ColSpecArrayInstance(this);
  }
}
