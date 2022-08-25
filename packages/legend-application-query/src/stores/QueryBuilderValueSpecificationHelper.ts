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
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  matchFunctionName,
  type Type,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  SimpleFunctionExpression,
  type PrimitiveType,
  type Enumeration,
  extractElementNameFromPath,
  AbstractPropertyExpression,
  isSuperType,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { format } from 'date-fns';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const.js';

export const getNonCollectionValueSpecificationType = (
  valueSpecification: ValueSpecification,
): Type | undefined => {
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    return valueSpecification.genericType.value.rawType;
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return guaranteeNonNullable(valueSpecification.values[0]).value._OWNER;
  } else if (valueSpecification instanceof VariableExpression) {
    return valueSpecification.genericType?.value.rawType;
  } else if (valueSpecification instanceof SimpleFunctionExpression) {
    return valueSpecification.genericType?.value.rawType;
  }
  return undefined;
};

export const getCollectionValueSpecificationType = (
  graph: PureModel,
  values: ValueSpecification[],
): Type | undefined => {
  if (values.every((val) => val instanceof PrimitiveInstanceValue)) {
    const valuePrimitiveTypes: (PrimitiveType | undefined)[] = [];
    (values as PrimitiveInstanceValue[]).forEach((val) => {
      const primitiveType = val.genericType.value.rawType;
      switch (primitiveType.path) {
        case PRIMITIVE_TYPE.STRING:
          addUniqueEntry(
            valuePrimitiveTypes,
            graph.getPrimitiveType(PRIMITIVE_TYPE.STRING),
          );
          break;
        case PRIMITIVE_TYPE.INTEGER:
        case PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.FLOAT:
        case PRIMITIVE_TYPE.NUMBER:
          addUniqueEntry(
            valuePrimitiveTypes,
            graph.getPrimitiveType(PRIMITIVE_TYPE.NUMBER),
          );
          break;
        default:
          valuePrimitiveTypes.push(undefined);
          break;
      }
    });
    if (valuePrimitiveTypes.length > 1) {
      return undefined;
    }
    return valuePrimitiveTypes[0] as PrimitiveType;
  } else if (values.every((val) => val instanceof EnumValueInstanceValue)) {
    const valueEnumerationTypes: Enumeration[] = [];
    (values as EnumValueInstanceValue[]).forEach((val) => {
      addUniqueEntry(
        valueEnumerationTypes,
        guaranteeNonNullable(val.values[0]).value._OWNER,
      );
    });
    if (valueEnumerationTypes.length > 1) {
      return undefined;
    }
    return valueEnumerationTypes[0];
  }
  return undefined;
};

export const unwrapNotExpression = (
  expression: SimpleFunctionExpression,
): SimpleFunctionExpression | undefined => {
  if (
    matchFunctionName(
      expression.functionName,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOT,
    )
  ) {
    return guaranteeType(
      expression.parametersValues[0],
      SimpleFunctionExpression,
    );
  }
  return undefined;
};

export const buildNotExpression = (
  graph: PureModel,
  expression: ValueSpecification,
): ValueSpecification => {
  const multiplicityOne = graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const expressionNot = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOT),
    multiplicityOne,
  );
  expressionNot.parametersValues.push(expression);
  return expressionNot;
};

export const isPropertyExpressionChainOptional = (
  expression: ValueSpecification | undefined,
): boolean => {
  let isOptional = false;
  let propertyExpression = expression;
  while (
    propertyExpression &&
    propertyExpression instanceof AbstractPropertyExpression
  ) {
    if (propertyExpression.func.multiplicity.lowerBound === 0) {
      isOptional = true;
      break;
    }
    propertyExpression = propertyExpression.parametersValues.at(0);
    while (propertyExpression instanceof SimpleFunctionExpression) {
      propertyExpression = propertyExpression.parametersValues.at(0);
    }
  }
  return isOptional;
};

export const isTypeCompatibleForAssignment = (
  type: Type | undefined,
  assignmentType: Type,
): boolean => {
  const NUMERIC_PRIMITIVE_TYPES = [
    PRIMITIVE_TYPE.NUMBER,
    PRIMITIVE_TYPE.INTEGER,
    PRIMITIVE_TYPE.DECIMAL,
    PRIMITIVE_TYPE.FLOAT,
  ] as string[];
  const DATE_PRIMITIVE_TYPES = [
    PRIMITIVE_TYPE.DATE,
    PRIMITIVE_TYPE.DATETIME,
    PRIMITIVE_TYPE.STRICTDATE,
    PRIMITIVE_TYPE.LATESTDATE,
  ] as string[];

  // When changing the return type for LHS, the RHS value should be adjusted accordingly.
  return (
    type !== undefined &&
    // Numeric value is handled loosely because of autoboxing
    // e.g. LHS (integer) = RHS (float) is acceptable
    ((NUMERIC_PRIMITIVE_TYPES.includes(type.path) &&
      NUMERIC_PRIMITIVE_TYPES.includes(assignmentType.path)) ||
      // Date value is handled loosely as well if the LHS is of type DateTime
      // This is because we would simulate auto-boxing for date by altering the
      // Pure function used for the operation
      // e.g. LHS(DateTime) = RHS(Date) -> we use isOnDay() instead of is()
      DATE_PRIMITIVE_TYPES.includes(type.path) ||
      type === assignmentType ||
      isSuperType(assignmentType, type))
  );
};

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
  const functionInstanceValue = new LambdaFunctionInstanceValue(
    multiplicityOne,
  );
  const functionType = new FunctionType(typeAny, multiplicityOne);
  functionType.parameters.push(
    new VariableExpression(lambdaParameterName, multiplicityOne),
  );
  const lambdaFunction = new LambdaFunction(functionType);
  lambdaFunction.expressionSequence = lambdaBodyExpressions;
  functionInstanceValue.values.push(lambdaFunction);
  return functionInstanceValue;
};
