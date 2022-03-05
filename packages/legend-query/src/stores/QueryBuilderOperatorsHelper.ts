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
  type PrimitiveType,
  type Enumeration,
  type Type,
  type PureModel,
  type ValueSpecification,
  GenericType,
  PRIMITIVE_TYPE,
  GenericTypeExplicitReference,
  extractElementNameFromPath,
  matchFunctionName,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  VariableExpression,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { SUPPORTED_FUNCTIONS } from '../QueryBuilder_Const';
import type { QueryBuilderState } from './QueryBuilderState';

export enum QUERY_BUILDER_GROUP_OPERATION {
  AND = 'and',
  OR = 'or',
}

export const fromGroupOperation = (
  operation: QUERY_BUILDER_GROUP_OPERATION,
): string => {
  switch (operation) {
    case QUERY_BUILDER_GROUP_OPERATION.AND:
      return SUPPORTED_FUNCTIONS.AND;
    case QUERY_BUILDER_GROUP_OPERATION.OR:
      return SUPPORTED_FUNCTIONS.OR;
    default:
      throw new UnsupportedOperationError(
        `Can't derive function name from group operation '${operation}'`,
      );
  }
};

export const toGroupOperation = (
  functionName: string,
): QUERY_BUILDER_GROUP_OPERATION => {
  if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.AND)) {
    return QUERY_BUILDER_GROUP_OPERATION.AND;
  } else if (matchFunctionName(functionName, SUPPORTED_FUNCTIONS.OR)) {
    return QUERY_BUILDER_GROUP_OPERATION.OR;
  }
  throw new UnsupportedOperationError(
    `Can't derive group operation from function name '${functionName}'`,
  );
};

export const getNonCollectionValueSpecificationType = (
  valueSpecification: ValueSpecification,
): Type | undefined => {
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    return valueSpecification.genericType.value.rawType;
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return guaranteeNonNullable(valueSpecification.values[0]).value.owner;
  } else if (valueSpecification instanceof VariableExpression) {
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
        guaranteeNonNullable(val.values[0]).value.owner,
      );
    });
    if (valueEnumerationTypes.length > 1) {
      return undefined;
    }
    return valueEnumerationTypes[0];
  }
  return undefined;
};
export const buildPrimitiveInstanceValue = (
  queryBuilderState: QueryBuilderState,
  type: PRIMITIVE_TYPE,
  value: unknown,
): PrimitiveInstanceValue => {
  const multiplicityOne =
    queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(
        queryBuilderState.graphManagerState.graph.getPrimitiveType(type),
      ),
    ),
    multiplicityOne,
  );
  instance.values = [value];
  return instance;
};

export const unwrapNotExpression = (
  expression: SimpleFunctionExpression,
): SimpleFunctionExpression | undefined => {
  if (matchFunctionName(expression.functionName, SUPPORTED_FUNCTIONS.NOT)) {
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
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.NOT),
    multiplicityOne,
  );
  expressionNot.parametersValues.push(expression);
  return expressionNot;
};
