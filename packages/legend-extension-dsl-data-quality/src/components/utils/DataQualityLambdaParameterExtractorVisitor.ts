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

import type {
  DataQualityValidationFunctionVisitor,
  DataQualityValidationAssertionFunction,
  DataQualityValidationFilterFunction,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterCondition,
  DataQualityValidationLogicalGroupFunction,
} from './DataQualityValidationFunction.js';
import {
  DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
  SUPPORTED_TYPES,
} from '../constants/DataQualityConstants.js';
import { assertTrue, UnsupportedOperationError } from '@finos/legend-shared';
import {
  type AbstractPropertyExpression,
  type CollectionInstanceValue,
  type PrimitiveInstanceValue,
  type ObserverContext,
  type PureModel,
  matchFunctionName,
} from '@finos/legend-graph';
import {
  DataQualityLambdaParameterParser,
  type LambdaBody,
} from './DataQualityLambdaParameterParser.js';
import { DataQualityValidationFunctionFactory } from './DataQualityValidationFunctionFactory.js';
import {
  observe_DataQualityValidationFilterCondition,
  observe_DataQualityValidationLogicalGroupFunction,
} from './DataQualityValidationFunctionObserver.js';

export class DataQualityLambdaParameterExtractorVisitor
  implements DataQualityValidationFunctionVisitor<void>
{
  private lambdaBody: LambdaBody;
  private graph: PureModel;
  private observerContext: ObserverContext;
  private filterBody: LambdaBody | undefined;

  constructor(
    lambdaBody: LambdaBody,
    graph: PureModel,
    observerContext: ObserverContext,
  ) {
    this.lambdaBody = lambdaBody;
    this.graph = graph;
    this.observerContext = observerContext;
  }

  visitAssertion(func: DataQualityValidationAssertionFunction): void {
    const { parameters = [] } = this.lambdaBody;

    if (parameters.length === 0) {
      return;
    }

    parameters.forEach((param) => {
      if (param._type === SUPPORTED_TYPES.CLASS_INSTANCE) {
        func.parameters.columns =
          DataQualityLambdaParameterParser.processColSpecArray(
            param,
            this.observerContext,
          );
      }

      if (param._type === SUPPORTED_TYPES.VAR) {
        func.parameters.variableDeclaration =
          DataQualityLambdaParameterParser.processVariableDeclaration(param);
      }
    });
  }

  visitFilter(func: DataQualityValidationFilterFunction): void {
    const { parameters = [] } = this.lambdaBody;

    if (parameters.length === 0) {
      return;
    }

    const error = new UnsupportedOperationError('Cannot process type');

    const firstParam = parameters[0];
    const secondParam = parameters[1];

    if (firstParam?._type !== SUPPORTED_TYPES.VAR) {
      throw error;
    }

    if (secondParam?._type === SUPPORTED_TYPES.LAMBDA && !secondParam.body) {
      throw error;
    }

    if (!secondParam) {
      throw error;
    }

    DataQualityLambdaParameterParser.validateLambdaParameter(secondParam);

    func.parameters.variableDeclaration =
      DataQualityLambdaParameterParser.processVariableDeclaration(firstParam);

    const lambdaBody = secondParam.body;
    if (!lambdaBody || lambdaBody.length === 0) {
      throw error;
    }

    this.filterBody = lambdaBody[0];
    if (!this.filterBody) {
      throw error;
    }

    const factory = new DataQualityValidationFunctionFactory(
      this.graph,
      this.observerContext,
    );

    const functionName = this.filterBody.function ?? '';
    if (this.isLogicalFunction(functionName)) {
      func.parameters.lambda.body = factory.createLogicalFunction(
        functionName as DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
      );
    } else {
      func.parameters.lambda.body =
        factory.createFilterChildFunction(functionName);
    }

    func.parameters.lambda.body.accept(this);

    const lambdaParams = secondParam.parameters;
    if (lambdaParams.length === 0) {
      throw error;
    }

    const firstLambdaParam = lambdaParams[0];
    if (!firstLambdaParam) {
      throw error;
    }

    func.parameters.lambda.variableDeclaration =
      DataQualityLambdaParameterParser.processVariableDeclaration(
        firstLambdaParam,
      );
  }

  visitCustomHelper(func: DataQualityValidationCustomHelperFunction): void {
    const { parameters = [] } = this.lambdaBody;

    func.parameters.otherParams = [];

    parameters.forEach((param) => {
      if (param._type === SUPPORTED_TYPES.CLASS_INSTANCE) {
        const processedColumn = DataQualityLambdaParameterParser.processColSpec(
          param,
          this.observerContext,
        );
        func.parameters.column = processedColumn;
      } else if (param._type === SUPPORTED_TYPES.VAR) {
        func.parameters.variableDeclaration =
          DataQualityLambdaParameterParser.processVariableDeclaration(param);
      } else if (
        DataQualityLambdaParameterParser.isSupportedPrimitive(param._type)
      ) {
        func.parameters.otherParams.push(
          DataQualityLambdaParameterParser.processPrimitiveParameter(
            param,
            this.graph,
            this.observerContext,
          ),
        );
      } else if (param._type === SUPPORTED_TYPES.COLLECTION) {
        func.parameters.otherParams.push(
          DataQualityLambdaParameterParser.processCollectionParameter(
            param,
            this.graph,
            this.observerContext,
          ),
        );
      } else {
        throw new UnsupportedOperationError(
          `Cannot process type: ${param._type}`,
        );
      }
    });
  }

  visitFilterCondition(func: DataQualityValidationFilterCondition) {
    assertTrue(
      this.filterBody !== undefined,
      'Expected filter body to be present',
    );

    const {
      processedParameters: [property, ...otherParams],
    } = DataQualityLambdaParameterParser.processFunctionParameter(
      this.filterBody as LambdaBody,
      this.graph,
      this.observerContext,
    );

    func.parameters.otherParams = otherParams as (
      | PrimitiveInstanceValue
      | CollectionInstanceValue
    )[];
    func.parameters.property = property as AbstractPropertyExpression;
    observe_DataQualityValidationFilterCondition(func);
  }

  visitLogicalGroup(func: DataQualityValidationLogicalGroupFunction) {
    assertTrue(Boolean(this.filterBody), 'Expected filter body to be present');

    const filterBody = this.filterBody as LambdaBody;
    const { parameters = [] } = filterBody;

    if (parameters.length < 2) {
      throw new UnsupportedOperationError(
        'Logical group must have at least 2 parameters (left and right)',
      );
    }

    const factory = new DataQualityValidationFunctionFactory(
      this.graph,
      this.observerContext,
    );

    const leftParam = parameters[0];

    if (!leftParam || leftParam._type !== SUPPORTED_TYPES.FUNCTION) {
      throw new UnsupportedOperationError(
        `Expected function for left parameter, got ${leftParam?._type}`,
      );
    }

    const leftFunctionName = leftParam.function ?? '';

    if (this.isLogicalFunction(leftFunctionName)) {
      func.parameters.left = factory.createLogicalFunction(
        leftFunctionName as DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
      );
      this.filterBody = leftParam;
      func.parameters.left.accept(this);
    } else {
      func.parameters.left =
        factory.createFilterConditionFunction(leftFunctionName);
      this.filterBody = leftParam;
      func.parameters.left.accept(this);
    }

    const rightParam = parameters[1];

    if (!rightParam || rightParam._type !== SUPPORTED_TYPES.FUNCTION) {
      throw new UnsupportedOperationError(
        `Expected function for right parameter, got ${rightParam?._type}`,
      );
    }

    const rightFunctionName = rightParam.function ?? '';

    if (this.isLogicalFunction(rightFunctionName)) {
      func.parameters.right = factory.createLogicalFunction(
        rightFunctionName as DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
      );
      this.filterBody = rightParam;
      func.parameters.right.accept(this);
    } else {
      func.parameters.right =
        factory.createFilterConditionFunction(rightFunctionName);
      this.filterBody = rightParam;
      func.parameters.right.accept(this);
    }

    observe_DataQualityValidationLogicalGroupFunction(func);
  }

  private isLogicalFunction(name: string = '') {
    return matchFunctionName(
      name,
      Object.values(DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS),
    );
  }
}
