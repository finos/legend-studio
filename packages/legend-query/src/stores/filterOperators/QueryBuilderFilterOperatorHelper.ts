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

import type {
  Enumeration,
  PrimitiveType,
  Type,
  ValueSpecification,
} from '@finos/legend-graph';
import {
  extractElementNameFromPath,
  matchFunctionName,
  LambdaFunctionInstanceValue,
  VariableExpression,
  AbstractPropertyExpression,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  SimpleFunctionExpression,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-graph';
import {
  guaranteeType,
  guaranteeNonNullable,
  assertTrue,
  generateEnumerableNameFromToken,
  addUniqueEntry,
} from '@finos/legend-shared';
import type {
  QueryBuilderFilterState,
  QueryBuilderFilterOperator,
} from '../QueryBuilderFilterState';
import { FilterConditionState } from '../QueryBuilderFilterState';
import { SUPPORTED_FUNCTIONS } from '../../QueryBuilder_Const';
import { buildGenericLambdaFunctionInstanceValue } from '../QueryBuilderValueSpecificationBuilderHelper';

export const buildPrimitiveInstanceValue = (
  filterConditionState: FilterConditionState,
  type: PRIMITIVE_TYPE,
  value: unknown,
): PrimitiveInstanceValue => {
  const multiplicityOne =
    filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(
        filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
          type,
        ),
      ),
    ),
    multiplicityOne,
  );
  instance.values = [value];
  return instance;
};

const getPropertyExpressionChainVariable = (
  propertyExpression: AbstractPropertyExpression,
): VariableExpression => {
  let currentExpression: ValueSpecification = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    currentExpression = guaranteeNonNullable(
      currentExpression.parametersValues[0],
    );
  }
  return guaranteeType(currentExpression, VariableExpression);
};

const buildFilterConditionExpressionWithExists = (
  filterConditionState: FilterConditionState,
  operatorFunctionFullPath: string,
): ValueSpecification => {
  const multiplicityOne =
    filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  assertTrue(
    filterConditionState.propertyExpressionState.requiresExistsHandling,
  );

  // 1. Decompose property expression
  const pes: AbstractPropertyExpression[] = [];
  let currentPropertyExpression: ValueSpecification =
    filterConditionState.propertyExpressionState.propertyExpression;
  while (currentPropertyExpression instanceof AbstractPropertyExpression) {
    const pe = new AbstractPropertyExpression('', multiplicityOne);
    pe.func = currentPropertyExpression.func;
    pe.parametersValues =
      currentPropertyExpression.parametersValues.length > 1
        ? // NOTE: we must retain the rest of the parameters as those are derived property parameters
          currentPropertyExpression.parametersValues.slice(1)
        : [];
    pes.push(pe);
    currentPropertyExpression = guaranteeNonNullable(
      currentPropertyExpression.parametersValues[0],
    );
  }
  const rootVariable = guaranteeType(
    currentPropertyExpression,
    VariableExpression,
  );

  // 2. Traverse the list of decomposed property expression backward, every time we encounter a property of
  // multiplicity many, create a new property expression and keep track of it to later form the lambda chain
  const existsLambdaParamNames = [
    ...filterConditionState.existsLambdaParamNames,
  ];
  const existsLambdaPropertyChains: ValueSpecification[] = [rootVariable];
  let currentParamNameIndex = 0;

  for (let i = pes.length - 1; i >= 0; --i) {
    const pe = pes[i] as AbstractPropertyExpression;
    // just keep adding to the property chain
    pe.parametersValues.unshift(
      existsLambdaPropertyChains[
        existsLambdaPropertyChains.length - 1
      ] as ValueSpecification,
    );
    existsLambdaPropertyChains[existsLambdaPropertyChains.length - 1] = pe;
    // ... but if the property is of multiplicity multiple, start a new property chain
    if (
      pe.func.multiplicity.upperBound === undefined ||
      pe.func.multiplicity.upperBound > 1
    ) {
      // NOTE: we need to find/generate the property chain variable name
      // here, by doing this, we try our best to respect original/user-input variable name
      if (currentParamNameIndex > existsLambdaParamNames.length - 1) {
        existsLambdaParamNames.push(
          generateEnumerableNameFromToken(
            existsLambdaParamNames,
            filterConditionState.filterState.lambdaParameterName,
          ),
        );
        assertTrue(currentParamNameIndex === existsLambdaParamNames.length - 1);
      }
      existsLambdaPropertyChains.push(
        new VariableExpression(
          existsLambdaParamNames[currentParamNameIndex] as string,
          multiplicityOne,
        ),
      );
      currentParamNameIndex++;
    }
  }

  // 3. Build each property chain into an exists() simple function expression
  const simpleFunctionExpressions: SimpleFunctionExpression[] = [];
  for (let i = 0; i < existsLambdaPropertyChains.length - 1; ++i) {
    const simpleFunctionExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(SUPPORTED_FUNCTIONS.EXISTS),
      multiplicityOne,
    );
    simpleFunctionExpression.parametersValues.push(
      existsLambdaPropertyChains[i] as ValueSpecification,
    );
    simpleFunctionExpressions.push(simpleFunctionExpression);
  }
  // build the leaf simple function expression which uses the operator
  const operatorEpression = new SimpleFunctionExpression(
    extractElementNameFromPath(operatorFunctionFullPath),
    multiplicityOne,
  );
  operatorEpression.parametersValues.push(
    existsLambdaPropertyChains[
      existsLambdaPropertyChains.length - 1
    ] as ValueSpecification,
  );
  // NOTE: there are simple operators which do not require any params (e.g. isEmpty)
  if (filterConditionState.value) {
    operatorEpression.parametersValues.push(filterConditionState.value);
  }
  simpleFunctionExpressions.push(operatorEpression);

  // 4. Build the exists() lambda chain
  assertTrue(simpleFunctionExpressions.length >= 2);
  for (let i = simpleFunctionExpressions.length - 2; i >= 0; --i) {
    const currentSFE = simpleFunctionExpressions[i] as SimpleFunctionExpression;
    const childSFE = simpleFunctionExpressions[
      i + 1
    ] as SimpleFunctionExpression;
    // build child SFE lambda
    const _existsLambdaVariable = childSFE.parametersValues[0];
    const existsLambdaVariable =
      _existsLambdaVariable instanceof AbstractPropertyExpression
        ? getPropertyExpressionChainVariable(_existsLambdaVariable)
        : guaranteeType(_existsLambdaVariable, VariableExpression);
    const existsLambda = buildGenericLambdaFunctionInstanceValue(
      existsLambdaVariable.name,
      [childSFE],
      filterConditionState.filterState.queryBuilderState.graphManagerState
        .graph,
    );
    // add the child SFE lambda to the current SFE parameters
    currentSFE.parametersValues.push(existsLambda);
  }

  return simpleFunctionExpressions[0] as SimpleFunctionExpression;
};

export const buildFilterConditionExpression = (
  filterConditionState: FilterConditionState,
  operatorFunctionFullPath: string,
): ValueSpecification => {
  const multiplicityOne =
    filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  if (filterConditionState.propertyExpressionState.requiresExistsHandling) {
    return buildFilterConditionExpressionWithExists(
      filterConditionState,
      operatorFunctionFullPath,
    );
  }
  const expression = new SimpleFunctionExpression(
    extractElementNameFromPath(operatorFunctionFullPath),
    multiplicityOne,
  );
  expression.parametersValues.push(
    filterConditionState.propertyExpressionState.propertyExpression,
  );
  // NOTE: there are simple operators which do not require any params (e.g. isEmpty)
  if (filterConditionState.value) {
    expression.parametersValues.push(filterConditionState.value);
  }
  return expression;
};

/**
 * Handling exists() lambda found in the filter condition expression.
 * The general approach for handling exists() is we will flat out the chain
 * of exists() expressions into a normal filter condition state.
 *
 * When we build the condition function expression from the filter condition state,
 * we walk the property expression chain, find property with multiplitiy upper bound
 * other than 1 and create an exists() lambda there
 *
 * NOTE: to ensure we respect user's choice of variable name, as we build the state
 * we record the lambda parameter names, so we can use those while re-building the function
 * If for some reason, this list is stale, we can start adding our own parameter names
 */
const buildFilterConditionStateWithExists = (
  filterState: QueryBuilderFilterState,
  expression: SimpleFunctionExpression,
  operatorFunctionFullPath: string,
): [FilterConditionState | undefined, SimpleFunctionExpression | undefined] => {
  if (matchFunctionName(expression.functionName, SUPPORTED_FUNCTIONS.EXISTS)) {
    // 1. Decompose the exists() lambda chain into property expression chains
    const existsLambdaParameterNames: string[] = [];
    const propertyExpressions: AbstractPropertyExpression[] = [];
    let currentExpression: SimpleFunctionExpression = expression;
    while (
      matchFunctionName(
        currentExpression.functionName,
        SUPPORTED_FUNCTIONS.EXISTS,
      )
    ) {
      const existsLambda = guaranteeNonNullable(
        guaranteeType(
          currentExpression.parametersValues[1],
          LambdaFunctionInstanceValue,
        ).values[0],
        `Can't process exists() expression: exists() lambda is missing`,
      );
      assertTrue(
        existsLambda.expressionSequence.length === 1,
        `Can't process exists() expression: exists() lambda body should hold an expression`,
      );
      currentExpression = guaranteeType(
        existsLambda.expressionSequence[0],
        SimpleFunctionExpression,
        `Can't process exists() expression: exists() lambda body should hold an expression`,
      );

      // record the lambda parameter name
      assertTrue(
        existsLambda.functionType.parameters.length === 1,
        `Can't process exists() function expression: exists() lambda should have 1 parameter`,
      );
      existsLambdaParameterNames.push(
        guaranteeType(
          existsLambda.functionType.parameters[0],
          VariableExpression,
          `Can't process exists() expression: exists() lambda should have 1 parameter`,
        ).name,
      );

      // record the lambda property expression
      if (
        currentExpression.parametersValues[0] instanceof
        AbstractPropertyExpression
      ) {
        propertyExpressions.push(
          guaranteeType(
            currentExpression.parametersValues[0],
            AbstractPropertyExpression,
          ),
        );
      }
    }
    // NOTE: make sure that the inner most function expression is the one we support
    if (
      !matchFunctionName(
        currentExpression.functionName,
        operatorFunctionFullPath,
      )
    ) {
      return [undefined, undefined];
    }

    // 2. Build the property expression
    const multiplicityOne =
      filterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    const initialPropertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
    );
    let propertyExpression = new AbstractPropertyExpression(
      '',
      multiplicityOne,
    );
    propertyExpression.func = initialPropertyExpression.func;
    propertyExpression.parametersValues =
      initialPropertyExpression.parametersValues;
    for (const currentPropertyExpression of propertyExpressions) {
      // when rebuilding the property expression chain, disregard the initial variable that starts the chain
      const pes: AbstractPropertyExpression[] = [];
      let currentPe: ValueSpecification = currentPropertyExpression;
      while (currentPe instanceof AbstractPropertyExpression) {
        const pe = new AbstractPropertyExpression('', multiplicityOne);
        pe.func = currentPe.func;
        pe.parametersValues =
          currentPe.parametersValues.length > 1
            ? // NOTE: we must retain the rest of the parameters as those are derived property parameters
              currentPe.parametersValues.slice(1)
            : [];
        pes.push(pe);
        currentPe = guaranteeNonNullable(currentPe.parametersValues[0]);
      }
      assertTrue(
        pes.length > 0,
        `Can't process exists() function expression: exists() usage with non-chain property expression is not supported`,
      );
      for (let i = 0; i < pes.length - 1; ++i) {
        (pes[i] as AbstractPropertyExpression).parametersValues.unshift(
          pes[i + 1] as AbstractPropertyExpression,
        );
      }
      (
        pes[pes.length - 1] as AbstractPropertyExpression
      ).parametersValues.unshift(propertyExpression);
      propertyExpression = pes[0] as AbstractPropertyExpression;
    }

    // 3. Build the filter condition state with the simplified property expression
    const filterConditionState = new FilterConditionState(
      filterState,
      propertyExpression,
    );
    existsLambdaParameterNames.forEach((paramName) =>
      filterConditionState.addExistsLambdaParamNames(paramName),
    );
    return [filterConditionState, currentExpression];
  }
  return [undefined, undefined];
};

export const buildFilterConditionState = (
  filterState: QueryBuilderFilterState,
  expression: SimpleFunctionExpression,
  operatorFunctionFullPath: string,
  operator: QueryBuilderFilterOperator,
  /**
   * Use this flag for operator that does not require any param (e.g. isEmpty)
   * NOTE: this is not the cleanest way to do this, if we find ourselves adding more and more customization
   * to this utility function, we should just create a bunch of different methods
   */
  hasNoValue = false,
): FilterConditionState | undefined => {
  let filterConditionState: FilterConditionState | undefined;
  // This is the simple expression of form `{property} {operator} {value}`
  // This is used for post-build checks (useful when this expression is nested inside a longer
  // chain of expression, e.g. ->exists($x|x == 'something'), etc.)
  let mainExpressionWithOperator: SimpleFunctionExpression | undefined;

  if (matchFunctionName(expression.functionName, operatorFunctionFullPath)) {
    assertTrue(
      expression.parametersValues.length === (hasNoValue ? 1 : 2),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expects ${hasNoValue ? 'no argument' : '1 argument'}`,
    );

    const propertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects property expression in lambda body`,
    );

    const variableName =
      getPropertyExpressionChainVariable(propertyExpression).name;
    assertTrue(
      filterState.lambdaParameterName === variableName,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects variable used in lambda body '${variableName}' to match lambda parameter '${
        filterState.lambdaParameterName
      }'`,
    );

    filterConditionState = new FilterConditionState(
      filterState,
      propertyExpression,
    );
    mainExpressionWithOperator = expression;
  } else if (
    matchFunctionName(expression.functionName, SUPPORTED_FUNCTIONS.EXISTS)
  ) {
    [filterConditionState, mainExpressionWithOperator] =
      buildFilterConditionStateWithExists(
        filterState,
        expression,
        operatorFunctionFullPath,
      );
  }

  // Post-build check: make sure the simple filter condition LHS, RHS, and operator are compatible
  // and set the value of the condition in the state accordingly.
  if (filterConditionState && mainExpressionWithOperator) {
    assertTrue(
      operator.isCompatibleWithFilterConditionProperty(filterConditionState),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: property is not compatible with operator`,
    );
    filterConditionState.setOperator(operator);
    filterConditionState.setValue(
      hasNoValue ? undefined : mainExpressionWithOperator.parametersValues[1],
    );
    if (!operator.isCompatibleWithFilterConditionValue(filterConditionState)) {
      filterConditionState.setValue(
        operator.getDefaultFilterConditionValue(filterConditionState),
      );
    }
    return filterConditionState;
  }
  return undefined;
};

export const buildNotExpression = (
  filterConditionState: FilterConditionState,
  expression: ValueSpecification,
): ValueSpecification => {
  const multiplicityOne =
    filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  const expressionNot = new SimpleFunctionExpression(
    extractElementNameFromPath(SUPPORTED_FUNCTIONS.NOT),
    multiplicityOne,
  );
  expressionNot.parametersValues.push(expression);
  return expressionNot;
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
  filterConditionState: FilterConditionState,
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
            filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRING,
            ),
          );
          break;
        case PRIMITIVE_TYPE.INTEGER:
        case PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.FLOAT:
        case PRIMITIVE_TYPE.NUMBER:
          addUniqueEntry(
            valuePrimitiveTypes,
            filterConditionState.filterState.queryBuilderState.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.NUMBER,
            ),
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
