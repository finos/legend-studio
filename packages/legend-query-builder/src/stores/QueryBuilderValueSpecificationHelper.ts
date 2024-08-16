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
  VariableExpression,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  matchFunctionName,
  type Type,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  SimpleFunctionExpression,
  PrimitiveType,
  type Enumeration,
  extractElementNameFromPath,
  AbstractPropertyExpression,
  isSuperType,
  Class,
  getMilestoneTemporalStereotype,
  DerivedProperty,
  PackageableElementExplicitReference,
  Multiplicity,
  CollectionInstanceValue,
  GenericTypeExplicitReference,
  GenericType,
  INTERNAL__PropagatedValue,
  isSubType,
  type ObserverContext,
  InstanceValue,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  formatDate,
  guaranteeNonNullable,
  guaranteeType,
  isNumber,
  isString,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../graph/QueryBuilderMetaModelConst.js';
import {
  getDerivedPropertyMilestoningSteoreotype,
  validateMilestoningPropertyExpressionChain,
} from './milestoning/QueryBuilderMilestoningHelper.js';
import { instanceValue_setValues } from './shared/ValueSpecificationModifierHelper.js';
import type { QueryBuilderState } from './QueryBuilderState.js';

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
    values.forEach((val) => {
      const primitiveType = val.genericType.value.rawType;
      switch (primitiveType.path) {
        case PRIMITIVE_TYPE.STRING:
          addUniqueEntry(valuePrimitiveTypes, PrimitiveType.STRING);
          break;
        case PRIMITIVE_TYPE.INTEGER:
        case PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.FLOAT:
        case PRIMITIVE_TYPE.NUMBER:
          addUniqueEntry(valuePrimitiveTypes, PrimitiveType.NUMBER);
          break;
        case PRIMITIVE_TYPE.DATE:
          addUniqueEntry(valuePrimitiveTypes, PrimitiveType.DATE);
          break;
        case PRIMITIVE_TYPE.STRICTDATE:
          addUniqueEntry(valuePrimitiveTypes, PrimitiveType.STRICTDATE);
          break;
        case PRIMITIVE_TYPE.DATETIME:
          addUniqueEntry(valuePrimitiveTypes, PrimitiveType.DATETIME);
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
    values.forEach((val) => {
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

export const isValidInstanceValue = (value: InstanceValue): boolean => {
  const isRequired = value.multiplicity.lowerBound >= 1;
  // required and no values provided. LatestDate doesn't have any values so we skip that check for it.
  if (
    isRequired &&
    value.genericType?.value.rawType !== PrimitiveType.LATESTDATE &&
    (!value.values.length ||
      value.values.some((val) => val === null || val === undefined))
  ) {
    return false;
  }
  // more values than allowed
  if (
    !(value instanceof CollectionInstanceValue) &&
    value.multiplicity.upperBound &&
    value.values.length > value.multiplicity.upperBound
  ) {
    return false;
  }
  // collection instance with invalid values
  if (
    value instanceof CollectionInstanceValue &&
    value.values.some(
      (val) => val instanceof InstanceValue && !isValidInstanceValue(val),
    )
  ) {
    return false;
  }
  return true;
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
  expression: ValueSpecification,
): ValueSpecification => {
  const expressionNot = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.NOT),
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
    if (propertyExpression.func.value.multiplicity.lowerBound === 0) {
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
      type.path === assignmentType.path ||
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
    case PRIMITIVE_TYPE.BYTE:
      return btoa('');
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.BINARY:
      return 0;
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return formatDate(new Date(Date.now()), DATE_FORMAT);
    case PRIMITIVE_TYPE.DATETIME:
      return formatDate(new Date(Date.now()), DATE_TIME_FORMAT);
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
  const functionInstanceValue = new LambdaFunctionInstanceValue();
  const functionType = new FunctionType(
    PackageableElementExplicitReference.create(
      graph.getType(CORE_PURE_PATH.ANY),
    ),
    Multiplicity.ONE,
  );
  functionType.parameters.push(
    new VariableExpression(lambdaParameterName, Multiplicity.ONE),
  );
  const lambdaFunction = new LambdaFunction(functionType);
  lambdaFunction.expressionSequence = lambdaBodyExpressions;
  functionInstanceValue.values.push(lambdaFunction);
  return functionInstanceValue;
};

/**
 * Checks if the milestoning property expression is valid in terms of number of parameter values provided
 * in relation to its milestoning type.
 *
 * NOTE: this takes date propgation into account. See the table below for all
 * the combination:
 *
 *             | [source] |          |          |          |          |
 * ----------------------------------------------------------------------
 *   [target]  |          |   NONE   |  PR_TMP  |  BI_TMP  |  BU_TMP  |
 * ----------------------------------------------------------------------
 *             |   NONE   |   N.A.   |   PRD    | PRD,BUD  |    BUD   |
 * ----------------------------------------------------------------------
 *             |  PR_TMP  |   N.A.   |    X     | PRD,BUD  |    BUD   |
 * ----------------------------------------------------------------------
 *             |  BI_TMP  |   N.A.   |    X     |    X     |    X     |
 * ----------------------------------------------------------------------
 *             |  BU_TMP  |   N.A.   |   PRD    | PRD,BUD  |    X     |
 * ----------------------------------------------------------------------
 *
 * Annotations:
 *
 * [source]: source temporal type
 * [target]: target temporal type
 *
 * PR_TMP  : processing temporal
 * BI_TMP  : bitemporal
 * BU_TMP  : business temporal
 *
 * X       : no default date propagated
 * PRD     : default processing date is propagated
 * BUD     : default business date is propgated
 */
export const validatePropertyExpressionChain = (
  propertyExpression: AbstractPropertyExpression,
  graph: PureModel,
  queryBuilderState: QueryBuilderState,
): void => {
  if (
    propertyExpression.func.value.genericType.value.rawType instanceof Class &&
    propertyExpression.func.value._OWNER._generatedMilestonedProperties
      .length !== 0
  ) {
    const name = propertyExpression.func.value.name;
    const func =
      propertyExpression.func.value._OWNER._generatedMilestonedProperties.find(
        (e) => e.name === name,
      );
    if (func) {
      const targetStereotype = getMilestoneTemporalStereotype(
        propertyExpression.func.value.genericType.value.rawType,
        graph,
      );

      if (targetStereotype) {
        const sourceStereotype = getDerivedPropertyMilestoningSteoreotype(
          guaranteeType(func, DerivedProperty),
          graph,
        );
        validateMilestoningPropertyExpressionChain(
          sourceStereotype,
          targetStereotype,
          propertyExpression,
          queryBuilderState,
        );
      }
    }
  }
};

export const extractNullableStringFromInstanceValue = (
  value: ValueSpecification,
): string | undefined => {
  if (value instanceof PrimitiveInstanceValue && isString(value.values[0])) {
    return value.values[0];
  }
  return undefined;
};

export const extractNullableNumberFromInstanceValue = (
  value: ValueSpecification,
): number | undefined => {
  if (value instanceof PrimitiveInstanceValue && isNumber(value.values[0])) {
    return value.values[0];
  }
  return undefined;
};

/**
 * NOTE: Pure doesn't have a nullish value, rather we use empty collection of type Nil
 */
export const createNullishValue = (graph: PureModel): CollectionInstanceValue =>
  new CollectionInstanceValue(
    Multiplicity.ZERO,
    GenericTypeExplicitReference.create(
      new GenericType(graph.getType(CORE_PURE_PATH.ANY)),
    ),
  );

export const isValueExpressionReferencedInValue = (
  variable: VariableExpression,
  value: ValueSpecification,
): boolean => {
  if (value instanceof VariableExpression) {
    return value.name === variable.name;
  } else if (value instanceof INTERNAL__PropagatedValue) {
    return isValueExpressionReferencedInValue(variable, value.getValue());
  }
  return false;
};

/**
 * Some expression which represents a value and can be simplified to make
 * editing experience easier
 *
 * e.g. -5 is often represented as minus(5), which is a function expression
 * but we want to simplify it to a primitive instance value with value -5
 */
export const simplifyValueExpression = (
  value: ValueSpecification,
  observerContext: ObserverContext,
): ValueSpecification => {
  if (
    value instanceof SimpleFunctionExpression &&
    matchFunctionName(
      value.functionName,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.MINUS,
    ) &&
    value.parametersValues.length === 1 &&
    value.parametersValues[0] instanceof PrimitiveInstanceValue
  ) {
    const val = value.parametersValues[0];
    if (isSubType(val.genericType.value.rawType, PrimitiveType.NUMBER)) {
      instanceValue_setValues(
        val,
        [(val.values[0] as number) * -1],
        observerContext,
      );
    }
    return val;
  }
  return value;
};
