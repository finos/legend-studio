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
import {
  CORE_HASH_STRUCTURE,
  hashRawLambda,
} from '../../../../Core_HashUtils.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import type { RawVariableExpression } from '../../rawValueSpecification/RawVariableExpression.js';
import type { Multiplicity } from '../domain/Multiplicity.js';
import { FunctionDefinition } from '../domain/Function.js';
import type { Testable } from '../../test/Testable.js';
import type { FunctionTestSuite } from './test/FunctionTestSuite.js';
import type { GenericTypeReference } from '../domain/GenericTypeReference.js';

export class ConcreteFunctionDefinition
  extends FunctionDefinition
  implements Hashable, Testable
{
  returnType: GenericTypeReference;
  returnMultiplicity: Multiplicity;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  parameters: RawVariableExpression[] = [];
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  expressionSequence: object[] = [];
  tests: FunctionTestSuite[] = [];

  constructor(
    name: string,
    returnType: GenericTypeReference,
    returnMultiplicity: Multiplicity,
  ) {
    super(name);
    this.returnType = returnType;
    this.returnMultiplicity = returnMultiplicity;
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FUNCTION,
      this.path,
      hashArray(this.parameters),
      this.returnType.ownerReference.valueForSerialization ?? '',
      hashArray(this.taggedValues),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashRawLambda(undefined, this.expressionSequence),
      this.tests.length ? hashArray(this.tests) : '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_ConcreteFunctionDefinition(this);
  }
}
