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
import { hashLambda } from '../../../../../MetaModelUtils';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementVisitor } from '../PackageableElement';
import type { RawVariableExpression } from '../../rawValueSpecification/RawVariableExpression';
import type { Type } from './Type';
import type { Multiplicity } from './Multiplicity';
import type { StereotypeReference } from './StereotypeReference';
import type { TaggedValue } from './TaggedValue';
import type { PackageableElementReference } from '../PackageableElementReference';
import { FunctionDefinition } from './Function';

export class ConcreteFunctionDefinition
  extends FunctionDefinition
  implements Hashable
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
  body: object[] = [];
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

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
      this.returnType.hashValue,
      hashArray(this.taggedValues),
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashLambda(undefined, this.body),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_ConcreteFunctionDefinition(this);
  }
}
