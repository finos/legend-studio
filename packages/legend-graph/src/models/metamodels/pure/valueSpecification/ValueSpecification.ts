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

import type { GenericTypeReference } from '../packageableElements/domain/GenericTypeReference';
import type { Multiplicity } from '../packageableElements/domain/Multiplicity';
import type { AlloySerializationConfigInstanceValue } from './AlloySerializationConfig';
import type {
  RootGraphFetchTreeInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
} from './GraphFetchTree';
import type {
  InstanceValue,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  RuntimeInstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  CollectionInstanceValue,
} from './InstanceValue';
import type { LambdaFunctionInstanceValue } from './LambdaFunction';
import type {
  FunctionExpression,
  SimpleFunctionExpression,
  AbstractPropertyExpression,
} from './SimpleFunctionExpression';
import type { INTERNAL__UnknownValueSpecification } from './INTERNAL__UnknownValueSpecification';
import type { VariableExpression } from './VariableExpression';

export interface ValueSpecificationVisitor<T> {
  visit_RootGraphFetchTreeInstanceValue(
    valueSpecification: RootGraphFetchTreeInstanceValue,
  ): T;
  visit_PropertyGraphFetchTreeInstanceValue(
    valueSpecification: PropertyGraphFetchTreeInstanceValue,
  ): T;
  visit_AlloySerializationConfigInstanceValue(
    valueSpecification: AlloySerializationConfigInstanceValue,
  ): T;
  visit_PrimitiveInstanceValue(valueSpecification: PrimitiveInstanceValue): T;
  visit_EnumValueInstanceValue(valueSpecification: EnumValueInstanceValue): T;
  visit_RuntimeInstanceValue(valueSpecification: RuntimeInstanceValue): T;
  visit_PairInstanceValue(valueSpecification: PairInstanceValue): T;
  visit_MappingInstanceValue(valueSpecification: MappingInstanceValue): T;
  visit_PureListInsanceValue(valueSpecification: PureListInstanceValue): T;
  visit_CollectionInstanceValue(valueSpecification: CollectionInstanceValue): T;
  visit_FunctionExpression(valueSpecification: FunctionExpression): T;
  visit_SimpleFunctionExpression(
    valueSpecification: SimpleFunctionExpression,
  ): T;
  visit_VariableExpression(valueSpecification: VariableExpression): T;
  visit_LambdaFunctionInstanceValue(
    valueSpecification: LambdaFunctionInstanceValue,
  ): T;
  visit_AbstractPropertyExpression(
    valueSpecification: AbstractPropertyExpression,
  ): T;
  visit_InstanceValue(valueSpecification: InstanceValue): T;

  visit_INTERNAL__UnknownValueSpecification(
    valueSpecification: INTERNAL__UnknownValueSpecification,
  ): T;
}

export abstract class ValueSpecification {
  genericType?: GenericTypeReference | undefined;
  multiplicity!: Multiplicity;

  constructor(
    multiplicity: Multiplicity,
    genericTypeReference?: GenericTypeReference,
  ) {
    this.multiplicity = multiplicity;
    this.genericType = genericTypeReference;
  }

  abstract accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T;
}
