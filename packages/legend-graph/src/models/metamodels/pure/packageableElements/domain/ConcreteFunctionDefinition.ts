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
import { hashRawLambda } from '../../../../../MetaModelUtils.js';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import type { RawVariableExpression } from '../../rawValueSpecification/RawVariableExpression.js';
import type { Type } from './Type.js';
import type { Multiplicity } from './Multiplicity.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import { FunctionDefinition } from './Function.js';
import type { FunctionTest } from './FunctionTest.js';
import type { Testable } from '../../test/Testable.js';

export class ConcreteFunctionDefinition
  extends FunctionDefinition
  implements Hashable, Testable
{
  returnType: PackageableElementReference<Type>;
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
  tests: FunctionTest[] = [];

  constructor(
    name: string,
    returnType: PackageableElementReference<Type>,
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
      this.returnType.valueForSerialization ?? '',
      hashArray(this.taggedValues),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashRawLambda(undefined, this.expressionSequence),
      hashArray(this.tests),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_ConcreteFunctionDefinition(this);
  }
}
