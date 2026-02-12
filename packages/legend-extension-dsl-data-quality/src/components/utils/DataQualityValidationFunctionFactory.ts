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

import {
  ColSpecArray,
  matchFunctionName,
  type ObserverContext,
  type PureModel,
} from '@finos/legend-graph';
import {
  DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS,
  DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS,
  type DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
  DATA_QUALITY_VALIDATION_PURE_FUNCTIONS,
  SUPPORTED_TYPES,
} from '../constants/DataQualityConstants.js';
import {
  DataQualityValidationAssertionFunction,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationFilterCondition,
  DataQualityValidationFilterFunction,
  DataQualityValidationLogicalGroupFunction,
} from './DataQualityValidationFunction.js';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { DataQualityFunctionDefaults } from './DataQualityFunctionDefaults.js';
import {
  DataQualityLambdaParameterParser,
  type LambdaBody,
} from './DataQualityLambdaParameterParser.js';

export class DataQualityValidationFunctionFactory {
  private graph: PureModel;
  private observerContext: ObserverContext;

  constructor(graph: PureModel, observerContext: ObserverContext) {
    this.graph = graph;
    this.observerContext = observerContext;
  }

  createCustomHelperFunction(
    name: string,
  ): DataQualityValidationCustomHelperFunction {
    const otherParams = DataQualityFunctionDefaults.getHelperFunctionDefaults(
      name,
      this.graph,
      this.observerContext,
    );
    const column = DataQualityLambdaParameterParser.processColSpec(
      {
        value: '',
      } as LambdaBody,
      this.observerContext,
    );
    return new DataQualityValidationCustomHelperFunction(name, {
      otherParams,
      column,
    });
  }

  createFilterFunction(): DataQualityValidationFilterFunction {
    const body = this.createEmptyFilterConditionFunction();

    return new DataQualityValidationFilterFunction({
      lambda: {
        body,
      },
    });
  }

  createFilterConditionFunction(
    name: string,
  ): DataQualityValidationFilterCondition {
    const otherParams = DataQualityFunctionDefaults.getPureFunctionDefaults(
      name,
      this.graph,
      this.observerContext,
    );
    const property = DataQualityLambdaParameterParser.processPropertyParameter(
      {
        property: '',
        parameters: [
          {
            name: 'row',
            _type: SUPPORTED_TYPES.VAR,
          },
        ],
      } as LambdaBody,
      this.observerContext,
    );
    return new DataQualityValidationFilterCondition(name, {
      property,
      otherParams,
    });
  }

  createLogicalFunction(
    name: DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
  ): DataQualityValidationLogicalGroupFunction {
    return new DataQualityValidationLogicalGroupFunction(name, {
      left: this.createEmptyFilterConditionFunction(),
      right: this.createEmptyFilterConditionFunction(),
    });
  }

  createAssertionFunction(
    name: string,
  ): DataQualityValidationAssertionFunction {
    const columns = DataQualityLambdaParameterParser.processColSpecArray(
      {
        value: new ColSpecArray(),
      } as LambdaBody,
      this.observerContext,
    );
    return new DataQualityValidationAssertionFunction(name, { columns });
  }

  createEmptyFilterConditionFunction(): DataQualityValidationFilterCondition {
    const property = DataQualityLambdaParameterParser.processPropertyParameter(
      {
        property: '',
        parameters: [
          {
            name: 'row',
            _type: SUPPORTED_TYPES.VAR,
          },
        ],
      } as LambdaBody,
      this.observerContext,
    );
    return new DataQualityValidationFilterCondition('', {
      property,
      otherParams: [],
    });
  }

  createFunction(name: string) {
    if (
      matchFunctionName(name, DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.FILTER)
    ) {
      return this.createFilterFunction();
    }

    if (
      matchFunctionName(
        name,
        Object.values(DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS),
      )
    ) {
      return this.createCustomHelperFunction(name);
    }

    if (
      matchFunctionName(
        name,
        Object.values(DATA_QUALITY_TERMINAL_ASSERTION_HELPER_FUNCTIONS),
      )
    ) {
      return this.createAssertionFunction(name);
    }

    throw new UnsupportedOperationError(`Cannot process function: ${name}`);
  }

  createFilterChildFunction(name: string) {
    if (
      matchFunctionName(name, [
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.CONTAINS,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.ENDS_WITH,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.STARTS_WITH,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.EQUAL,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IN,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.GREATER_THAN_EQUAL,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.LESS_THAN_EQUAL,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IS_EMPTY,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.IS_NOT_EMPTY,
        DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.MATCHES,
      ])
    ) {
      return this.createFilterConditionFunction(name);
    }

    throw new UnsupportedOperationError(`Cannot process function: ${name}`);
  }
}
