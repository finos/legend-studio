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
import type { Multiplicity } from '../packageableElements/domain/Multiplicity.js';
import type { GraphFetchTreeInstanceValue } from './GraphFetchTree.js';
import type {
  InstanceValue,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  CollectionInstanceValue,
} from './InstanceValue.js';
import type { LambdaFunctionInstanceValue } from './LambdaFunction.js';
import type {
  FunctionExpression,
  SimpleFunctionExpression,
  AbstractPropertyExpression,
} from './Expression.js';
import type { INTERNAL__UnknownValueSpecification } from './INTERNAL__UnknownValueSpecification.js';
import type { VariableExpression } from './VariableExpression.js';
import type { INTERNAL__PropagatedValue } from './INTERNAL__PropagatedValue.js';
import type { Hashable } from '@finos/legend-shared';
import type { KeyExpressionInstanceValue } from './KeyExpressionInstanceValue.js';
import type {
  ColSpecArrayInstance,
  ColSpecInstanceValue,
} from './RelationValueSpecification.js';

export interface ValueSpecificationVisitor<T> {
  visit_INTERNAL__UnknownValueSpecification(
    valueSpecification: INTERNAL__UnknownValueSpecification,
  ): T;
  visit_INTERNAL__PropagatedValue(
    valueSpecification: INTERNAL__PropagatedValue,
  ): T;

  visit_FunctionExpression(valueSpecification: FunctionExpression): T;
  visit_SimpleFunctionExpression(
    valueSpecification: SimpleFunctionExpression,
  ): T;
  visit_VariableExpression(valueSpecification: VariableExpression): T;
  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): T;

  visit_InstanceValue(valueSpecification: InstanceValue): T;
  visit_ColSpecArrayInstance(valueSpeciciation: ColSpecArrayInstance): T;
  visit_ColSpecInstance(valueSpeciciation: ColSpecInstanceValue): T;

  visit_CollectionInstanceValue(valueSpecification: CollectionInstanceValue): T;
  visit_EnumValueInstanceValue(valueSpecification: EnumValueInstanceValue): T;
  visit_PrimitiveInstanceValue(valueSpecification: PrimitiveInstanceValue): T;
  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): T;
  visit_GraphFetchTreeInstanceValue(
    valueSpecification: GraphFetchTreeInstanceValue,
  ): T;
  visit_KeyExpressionInstanceValue(
    valueSpeciciation: KeyExpressionInstanceValue,
  ): T;
}

export abstract class ValueSpecification implements Hashable {
  /**
   * NOTE: Currently, we don't do type-inferencing to the generic type
   * here is left as optional
   *
   * @discrepancy model
   */
  genericType?: GenericTypeReference | undefined;
  multiplicity!: Multiplicity;

  constructor(
    multiplicity: Multiplicity,
    genericTypeReference?: GenericTypeReference,
  ) {
    this.multiplicity = multiplicity;
    this.genericType = genericTypeReference;
  }

  abstract get hashCode(): string;

  abstract accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T;
}
