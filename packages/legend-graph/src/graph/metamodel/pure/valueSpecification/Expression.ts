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

import type { GenericTypeReference } from '../packageableElements/domain/GenericTypeReference.js';
import { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import type { PackageableElementReference } from '../packageableElements/PackageableElementReference.js';
import {
  type ValueSpecificationVisitor,
  ValueSpecification,
} from './ValueSpecification.js';
import type { Function } from '../packageableElements/domain/Function.js';
import {
  type Hashable,
  hashArray,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../Core_HashUtils.js';
import type { PropertyReference } from '../packageableElements/domain/PropertyReference.js';

export class Expression extends ValueSpecification implements Hashable {
  classifierGenericType?: GenericTypeReference | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXPRESSION,
      this.classifierGenericType?.ownerReference.valueForSerialization ?? '',
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
    ]);
  }

  accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    throw new UnsupportedOperationError();
  }
}

export class FunctionExpression extends Expression implements Hashable {
  functionName: string;
  parametersValues: ValueSpecification[] = [];
  func?: unknown;

  constructor(functionName: string) {
    super(Multiplicity.ONE, undefined);
    this.functionName = functionName;
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FUNCTION_EXPRESSION,
      this.classifierGenericType?.ownerReference.valueForSerialization ?? '',
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      this.functionName,
      hashArray(this.parametersValues),
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_FunctionExpression(this);
  }
}

// export class

export class SimpleFunctionExpression
  extends FunctionExpression
  implements Hashable
{
  /**
   * Currently, we don't do function matching
   *
   * @discrepancy model
   */
  declare func?: PackageableElementReference<Function> | undefined;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FUNCTION_EXPRESSION,
      this.classifierGenericType?.ownerReference.valueForSerialization ?? '',
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      this.functionName,
      hashArray(this.parametersValues),
      this.func?.valueForSerialization ?? '',
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_SimpleFunctionExpression(this);
  }
}

export class AbstractPropertyExpression
  extends FunctionExpression
  implements Hashable
{
  declare func: PropertyReference;

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FUNCTION_EXPRESSION,
      this.classifierGenericType?.ownerReference.valueForSerialization ?? '',
      this.genericType?.ownerReference.valueForSerialization ?? '',
      this.multiplicity,
      this.functionName,
      hashArray(this.parametersValues),
      this.func.pointerHashCode,
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_AbstractPropertyExpression(this);
  }
}
