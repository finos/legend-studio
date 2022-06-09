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

import { DATE_FORMAT, DATE_TIME_FORMAT } from '@finos/legend-application';
import {
  type PureModel,
  type ValueSpecification,
  CORE_PURE_PATH,
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  VariableExpression,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { format } from 'date-fns';

export const generateDefaultValueForPrimitiveType = (
  type: PRIMITIVE_TYPE,
): unknown => {
  switch (type) {
    case PRIMITIVE_TYPE.STRING:
      return '';
    case PRIMITIVE_TYPE.BOOLEAN:
      return false;
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER:
      return 0;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return format(new Date(Date.now()), DATE_FORMAT);
    case PRIMITIVE_TYPE.DATETIME:
      return format(new Date(Date.now()), DATE_TIME_FORMAT);
    default:
      throw new UnsupportedOperationError(
        `Can't generate default value for primitive type '${type}'`,
      );
  }
};

export const buildGenericLambdaFunctionInstanceValue = (
  lambdaParameterName: string,
  lambdaBodyExpressions: ValueSpecification[],
  graph: PureModel,
): LambdaFunctionInstanceValue => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const typeAny = graph.getType(CORE_PURE_PATH.ANY);
  const aggregateLambda = new LambdaFunctionInstanceValue(multiplicityOne);
  const colLambdaFunctionType = new FunctionType(typeAny, multiplicityOne);
  colLambdaFunctionType.parameters.push(
    new VariableExpression(lambdaParameterName, multiplicityOne),
  );
  const colLambdaFunction = new LambdaFunction(colLambdaFunctionType);
  colLambdaFunction.expressionSequence = lambdaBodyExpressions;
  aggregateLambda.values.push(colLambdaFunction);
  return aggregateLambda;
};
