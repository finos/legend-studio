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
import type { INTERNAL__PropagatedValue } from './INTERNAL__PropagatedValue';

export enum SUPPORTED_FUNCTIONS {
  // date-time value helper functions
  TODAY = 'meta::pure::functions::date::today',
  NOW = 'meta::pure::functions::date::now',
  FIRST_DAY_OF_WEEK = 'meta::pure::functions::date::firstDayOfThisWeek',
  FIRST_DAY_OF_MONTH = 'meta::pure::functions::date::firstDayOfThisMonth',
  FIRST_DAY_OF_QUARTER = 'meta::pure::functions::date::firstDayOfThisQuarter',
  FIRST_DAY_OF_YEAR = 'meta::pure::functions::date::firstDayOfThisYear',
  PREVIOUS_DAY_OF_WEEK = 'meta::pure::functions::date::previousDayOfWeek',
  IS_ON_DAY = 'meta::pure::functions::date::isOnDay',
  IS_ON_OR_AFTER_DAY = 'meta::pure::functions::date::isOnOrAfterDay',
  IS_AFTER_DAY = 'meta::pure::functions::date::isAfterDay',
  IS_ON_OR_BEFORE_DAY = 'meta::pure::functions::date::isOnOrBeforeDay',
  IS_BEFORE_DAY = 'meta::pure::functions::date::isBeforeDay',

  // adjust time
  MINUS = 'meta::pure::functions::math::minus',
  ADJUST = 'meta::pure::functions::date::adjust',
}

export interface ValueSpecificationVisitor<T> {
  visit_RootGraphFetchTreeInstanceValue(
    valueSpecification: RootGraphFetchTreeInstanceValue,
  ): T;
  visit_INTERNAL__PropagatedValue(
    valueSpecification: INTERNAL__PropagatedValue,
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
  visit_PureListInstanceValue(valueSpecification: PureListInstanceValue): T;
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
