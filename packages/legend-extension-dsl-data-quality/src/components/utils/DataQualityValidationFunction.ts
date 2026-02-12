/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { uuid } from '@finos/legend-shared';
import { DataQualityLambdaParameterExtractorVisitor } from './DataQualityLambdaParameterExtractorVisitor.js';
import type {
  PureModel,
  ObserverContext,
  AbstractPropertyExpression,
  PrimitiveInstanceValue,
  CollectionInstanceValue,
  VariableExpression,
  ColSpecArrayInstance,
  ColSpecInstanceValue,
} from '@finos/legend-graph';
import type { LambdaBody } from './DataQualityLambdaParameterParser.js';
import { DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS } from '../constants/DataQualityConstants.js';

export interface VariableDeclaration {
  value: string;
  type: string;
}

export interface BaseValidationParameters {
  variableDeclaration?: VariableExpression;
}

export interface AssertionValidationParameters
  extends BaseValidationParameters {
  columns: ColSpecArrayInstance;
  otherParam?:
    | DataQualityValidationFilterFunction
    | DataQualityValidationCustomHelperFunction;
}

export interface CustomHelperValidationParameters
  extends BaseValidationParameters {
  column: ColSpecInstanceValue;
  otherParams: Array<PrimitiveInstanceValue | CollectionInstanceValue>;
}

export interface FilterValidationParameters extends BaseValidationParameters {
  lambda: {
    body:
      | DataQualityValidationFilterCondition
      | DataQualityValidationLogicalGroupFunction;
  } & BaseValidationParameters;
}

export interface FilterConditionParameters {
  property: AbstractPropertyExpression;
  otherParams: (PrimitiveInstanceValue | CollectionInstanceValue)[];
}

export interface LogicalGroupValidationParameters {
  left:
    | DataQualityValidationFilterCondition
    | DataQualityValidationLogicalGroupFunction;
  right:
    | DataQualityValidationFilterCondition
    | DataQualityValidationLogicalGroupFunction;
}

export abstract class DataQualityValidationFunction<T> {
  protected type = '';
  abstract name: string;
  abstract parameters: T;
  abstract accept<R>(visitor: DataQualityValidationFunctionVisitor<R>): R;

  id = uuid();

  createParameterFromLambda(
    lambdaBody: LambdaBody,
    graph: PureModel,
    observerContext: ObserverContext,
  ): void {
    const dataQualityLambdaParameterExtractorVisitor =
      new DataQualityLambdaParameterExtractorVisitor(
        lambdaBody,
        graph,
        observerContext,
      );
    this.accept(dataQualityLambdaParameterExtractorVisitor);
  }
}

export interface DataQualityValidationFunctionVisitor<T> {
  visitAssertion(func: DataQualityValidationAssertionFunction): T;
  visitFilter(func: DataQualityValidationFilterFunction): T;
  visitCustomHelper(func: DataQualityValidationCustomHelperFunction): T;
  visitFilterCondition(func: DataQualityValidationFilterCondition): T;
  visitLogicalGroup(func: DataQualityValidationLogicalGroupFunction): T;
}

export class DataQualityValidationFilterFunction extends DataQualityValidationFunction<FilterValidationParameters> {
  readonly name = 'filter';
  parameters: FilterValidationParameters;
  lambdaBodyVariableDeclaration: VariableDeclaration | undefined;

  constructor(parameters: FilterValidationParameters) {
    super();
    this.parameters = parameters;
  }

  accept<R>(visitor: DataQualityValidationFunctionVisitor<R>): R {
    return visitor.visitFilter(this);
  }
}

export class DataQualityValidationFilterCondition extends DataQualityValidationFunction<FilterConditionParameters> {
  name: string;
  parameters: FilterConditionParameters;

  constructor(name: string, parameters: FilterConditionParameters) {
    super();
    this.name = name;
    this.parameters = parameters;
  }

  accept<R>(visitor: DataQualityValidationFunctionVisitor<R>): R {
    return visitor.visitFilterCondition(this);
  }
}

export class DataQualityValidationLogicalGroupFunction extends DataQualityValidationFunction<LogicalGroupValidationParameters> {
  name: DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS;
  parameters: LogicalGroupValidationParameters;

  constructor(
    name: DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
    parameters: LogicalGroupValidationParameters,
  ) {
    super();
    this.name = name;
    this.parameters = parameters;
  }

  changeName() {
    if (this.name === DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS.AND) {
      this.name = DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS.OR;
    } else {
      this.name = DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS.AND;
    }
  }

  accept<R>(visitor: DataQualityValidationFunctionVisitor<R>): R {
    return visitor.visitLogicalGroup(this);
  }
}

export class DataQualityValidationCustomHelperFunction extends DataQualityValidationFunction<CustomHelperValidationParameters> {
  name: string;
  parameters: CustomHelperValidationParameters;

  constructor(name: string, parameters: CustomHelperValidationParameters) {
    super();
    this.name = name;
    this.parameters = parameters;
  }

  accept<R>(visitor: DataQualityValidationFunctionVisitor<R>): R {
    return visitor.visitCustomHelper(this);
  }
}

export class DataQualityValidationAssertionFunction extends DataQualityValidationFunction<AssertionValidationParameters> {
  name: string;
  parameters: AssertionValidationParameters;

  constructor(name: string, parameters: AssertionValidationParameters) {
    super();
    this.name = name;
    this.parameters = parameters;
  }

  accept<R>(visitor: DataQualityValidationFunctionVisitor<R>): R {
    return visitor.visitAssertion(this);
  }
}
