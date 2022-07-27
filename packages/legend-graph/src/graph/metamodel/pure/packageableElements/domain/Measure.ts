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
  hashArray,
  UnsupportedOperationError,
  type Hashable,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import { Type } from './Type.js';
import { DataType } from './DataType.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';

export class Unit extends DataType implements Hashable {
  measure: Measure;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  conversionFunction?: RawLambda | undefined;

  constructor(
    name: string,
    measure: Measure,
    conversionFunction: RawLambda | undefined,
  ) {
    super(name);

    this.measure = measure;
    this.conversionFunction = conversionFunction;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.UNIT,
      this.measure.path,
      this.conversionFunction ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }
}

export class Measure extends Type implements Hashable {
  canonicalUnit?: Unit | undefined;
  nonCanonicalUnits: Unit[] = [];

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MEASURE,
      this.path,
      this.canonicalUnit ?? '',
      hashArray(this.nonCanonicalUnits),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Measure(this);
  }
}
