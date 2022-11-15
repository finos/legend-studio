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

import type { Type } from '../packageableElements/domain/Type.js';
import type { VariableExpression } from './VariableExpression.js';
import { InstanceValue } from './InstanceValue.js';
import type {
  ValueSpecification,
  ValueSpecificationVisitor,
} from './ValueSpecification.js';
import { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference.js';

export class FunctionType implements Hashable {
  /**
   * Currently, we don't do type-inferencing
   *
   * @discrepancy model
   */
  returnType?: PackageableElementReference<Type> | undefined;
  parameters: VariableExpression[] = [];
  returnMultiplicity: Multiplicity;

  constructor(
    returnType: PackageableElementReference<Type> | undefined,
    returnMultiplicity: Multiplicity,
  ) {
    this.returnType = returnType;
    this.returnMultiplicity = returnMultiplicity;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FUNCTION_TYPE,
      this.returnType?.valueForSerialization ?? '',
      hashArray(this.parameters),
      this.returnMultiplicity,
    ]);
  }
}

export class LambdaFunction implements Hashable {
  functionType: FunctionType;
  /**
   * Engine saves `openVariables` as strings. We save them as a map of var name to the VariableExpression
   * This is so we don't needless recreate VariableExpressions again and can leverage the same VariableExpression as
   * the ones used in LambdaFunction expressions. This is especially useful when handling `let` statements.
   *
   * @discrepancy model
   */
  openVariables: Map<string, VariableExpression> = new Map();
  expressionSequence: ValueSpecification[] = [];

  constructor(type: FunctionType) {
    this.functionType = type;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.LAMBDA_FUNCTION,
      this.functionType,
      hashArray(Array.from(this.openVariables.keys())),
      hashArray(this.expressionSequence),
    ]);
  }
}

export class LambdaFunctionInstanceValue
  extends InstanceValue
  implements Hashable
{
  override values: LambdaFunction[] = [];

  constructor() {
    super(Multiplicity.ONE);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.LAMBDA_FUNCTION_INSTANCE_VALUE,
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      hashArray(this.values),
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_LambdaFunctionInstanceValue(this);
  }
}
