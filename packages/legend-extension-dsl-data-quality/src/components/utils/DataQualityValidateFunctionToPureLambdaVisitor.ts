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
  DATA_QUALITY_VALIDATION_PURE_FUNCTIONS,
  SUPPORTED_TYPES,
} from '../constants/DataQualityConstants.js';
import type { LambdaBody } from './DataQualityLambdaParameterParser.js';
import type {
  DataQualityValidationFilterFunction,
  DataQualityValidationCustomHelperFunction,
  DataQualityValidationAssertionFunction,
  DataQualityValidationFunctionVisitor,
  DataQualityValidationFilterCondition,
  DataQualityValidationLogicalGroupFunction,
} from './DataQualityValidationFunction.js';
import type {
  GraphManagerState,
  ValueSpecification,
} from '@finos/legend-graph';

const relationPropertyDeclaration = {
  _type: SUPPORTED_TYPES.VAR,
  name: 'row',
} as LambdaBody;

export const relationRelDeclaration = {
  _type: SUPPORTED_TYPES.VAR,
  name: 'rel',
} as LambdaBody;

export class DataQualityValidateFunctionToPureLambdaVisitor
  implements DataQualityValidationFunctionVisitor<LambdaBody>
{
  private graphManagerState: GraphManagerState;

  constructor(graphManagerState: GraphManagerState) {
    this.graphManagerState = graphManagerState;
  }

  private serializeValueSpecification(value: ValueSpecification) {
    return this.graphManagerState.graphManager.serializeValueSpecification(
      value,
    ) as LambdaBody;
  }

  visitFilter(func: DataQualityValidationFilterFunction): LambdaBody {
    const { lambda, variableDeclaration } = func.parameters;

    const filterLambda = {
      _type: SUPPORTED_TYPES.FUNCTION,
      function: DATA_QUALITY_VALIDATION_PURE_FUNCTIONS.FILTER,
      parameters: [relationRelDeclaration],
    };

    if (variableDeclaration) {
      filterLambda.parameters = [
        this.serializeValueSpecification(variableDeclaration),
      ];
    }

    const filterLambdaParameter = {
      _type: SUPPORTED_TYPES.LAMBDA,
      parameters: [relationPropertyDeclaration],
      body: [],
    } as LambdaBody;

    (filterLambdaParameter.body as LambdaBody[]).push(lambda.body.accept(this));

    if (lambda.variableDeclaration) {
      filterLambdaParameter.parameters = [
        this.serializeValueSpecification(lambda.variableDeclaration),
      ];
    }

    filterLambda.parameters.push(filterLambdaParameter);

    return filterLambda;
  }

  visitCustomHelper(
    func: DataQualityValidationCustomHelperFunction,
  ): LambdaBody {
    let parameters = [relationRelDeclaration];
    const { column, otherParams, variableDeclaration } = func.parameters;

    if (variableDeclaration) {
      parameters = [this.serializeValueSpecification(variableDeclaration)];
    }

    parameters.push(this.serializeValueSpecification(column));

    if (otherParams.length > 0) {
      otherParams.forEach((param) => {
        parameters.push(this.serializeValueSpecification(param));
      });
    }

    return {
      _type: SUPPORTED_TYPES.FUNCTION,
      function: func.name,
      parameters,
    };
  }

  visitAssertion(func: DataQualityValidationAssertionFunction): LambdaBody {
    const parameters: LambdaBody[] = [];
    const { columns, variableDeclaration, otherParam } = func.parameters;

    if (variableDeclaration) {
      parameters.push(this.serializeValueSpecification(variableDeclaration));
    }

    if (otherParam) {
      parameters.push(otherParam.accept(this));
    }

    parameters.push(this.serializeValueSpecification(columns));

    return {
      _type: SUPPORTED_TYPES.FUNCTION,
      function: func.name,
      parameters,
    };
  }

  visitFilterCondition(func: DataQualityValidationFilterCondition): LambdaBody {
    const { property, otherParams } = func.parameters;
    const functionParameters: LambdaBody[] = [];

    functionParameters.push(this.serializeValueSpecification(property));

    if (otherParams.length > 0) {
      otherParams.forEach((param) => {
        functionParameters.push(this.serializeValueSpecification(param));
      });
    }

    return {
      _type: SUPPORTED_TYPES.FUNCTION,
      function: func.name,
      parameters: functionParameters,
    } as LambdaBody;
  }

  visitLogicalGroup(
    func: DataQualityValidationLogicalGroupFunction,
  ): LambdaBody {
    const leftLambdaBody = func.parameters.left.accept(this);
    const rightLambdaBody = func.parameters.right.accept(this);

    return {
      _type: SUPPORTED_TYPES.FUNCTION,
      function: func.name,
      parameters: [leftLambdaBody, rightLambdaBody],
    } as LambdaBody;
  }
}
