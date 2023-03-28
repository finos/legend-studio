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
  type ValueSpecification,
  extractElementNameFromPath,
  matchFunctionName,
  LambdaFunctionInstanceValue,
  VariableExpression,
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  Multiplicity,
} from '@finos/legend-graph';
import {
  guaranteeType,
  guaranteeNonNullable,
  assertTrue,
  generateEnumerableNameFromToken,
} from '@finos/legend-shared';
import {
  FilterConditionState,
  type QueryBuilderFilterState,
} from '../QueryBuilderFilterState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import {
  buildGenericLambdaFunctionInstanceValue,
  simplifyValueExpression,
} from '../../QueryBuilderValueSpecificationHelper.js';
import type { QueryBuilderFilterOperator } from '../QueryBuilderFilterOperator.js';
import { buildPropertyExpressionChain } from '../../QueryBuilderValueSpecificationBuilderHelper.js';

const getPropertyExpressionChainVariable = (
  propertyExpression: AbstractPropertyExpression,
): VariableExpression => {
  let currentExpression: ValueSpecification = propertyExpression;
  while (currentExpression instanceof AbstractPropertyExpression) {
    currentExpression = guaranteeNonNullable(
      currentExpression.parametersValues[0],
    );
    // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
    // $x.employees->subType(@Person)->subType(@Staff)
    while (
      currentExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      )
    ) {
      currentExpression = guaranteeNonNullable(
        currentExpression.parametersValues[0],
      );
    }
  }
  return guaranteeType(currentExpression, VariableExpression);
};

const buildFilterConditionExpressionWithExists = (
  filterConditionState: FilterConditionState,
  operatorFunctionFullPath: string,
): ValueSpecification => {
  assertTrue(
    filterConditionState.propertyExpressionState.requiresExistsHandling,
  );
  // 1. Decompose property expression
  const expressions: (AbstractPropertyExpression | SimpleFunctionExpression)[] =
    [];
  let currentPropertyExpression: ValueSpecification =
    buildPropertyExpressionChain(
      filterConditionState.propertyExpressionState.propertyExpression,
      filterConditionState.propertyExpressionState.queryBuilderState,
      filterConditionState.filterState.lambdaParameterName,
    );
  while (
    currentPropertyExpression instanceof AbstractPropertyExpression ||
    (currentPropertyExpression instanceof SimpleFunctionExpression &&
      matchFunctionName(
        currentPropertyExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
      ))
  ) {
    let exp: AbstractPropertyExpression | SimpleFunctionExpression;
    if (currentPropertyExpression instanceof SimpleFunctionExpression) {
      exp = new SimpleFunctionExpression(
        extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE),
      );
    } else {
      exp = new AbstractPropertyExpression('');
      exp.func = currentPropertyExpression.func;
    }
    // NOTE: we must retain the rest of the parameters as those are derived property parameters
    exp.parametersValues =
      currentPropertyExpression.parametersValues.length > 1
        ? currentPropertyExpression.parametersValues.slice(1)
        : [];
    expressions.push(exp);
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

  for (let i = expressions.length - 1; i >= 0; --i) {
    const exp = expressions[i] as
      | AbstractPropertyExpression
      | SimpleFunctionExpression;
    // just keep adding to the property chain
    exp.parametersValues.unshift(
      existsLambdaPropertyChains[
        existsLambdaPropertyChains.length - 1
      ] as ValueSpecification,
    );
    existsLambdaPropertyChains[existsLambdaPropertyChains.length - 1] = exp;
    // ... but if the property is of multiplicity multiple, start a new property chain
    if (
      exp instanceof AbstractPropertyExpression &&
      (exp.func.value.multiplicity.upperBound === undefined ||
        exp.func.value.multiplicity.upperBound > 1)
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
          Multiplicity.ONE,
        ),
      );
      currentParamNameIndex++;
    }
  }

  // 3. Build each property chain into an exists() simple function expression
  const simpleFunctionExpressions: SimpleFunctionExpression[] = [];
  for (let i = 0; i < existsLambdaPropertyChains.length - 1; ++i) {
    const simpleFunctionExpression = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXISTS),
    );
    simpleFunctionExpression.parametersValues.push(
      existsLambdaPropertyChains[i] as ValueSpecification,
    );
    simpleFunctionExpressions.push(simpleFunctionExpression);
  }
  // build the leaf simple function expression which uses the operator
  const operatorEpression = new SimpleFunctionExpression(
    extractElementNameFromPath(operatorFunctionFullPath),
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
  if (filterConditionState.propertyExpressionState.requiresExistsHandling) {
    return buildFilterConditionExpressionWithExists(
      filterConditionState,
      operatorFunctionFullPath,
    );
  }
  const expression = new SimpleFunctionExpression(
    extractElementNameFromPath(operatorFunctionFullPath),
  );
  const propertyExpression = buildPropertyExpressionChain(
    filterConditionState.propertyExpressionState.propertyExpression,
    filterConditionState.propertyExpressionState.queryBuilderState,
    filterConditionState.filterState.lambdaParameterName,
  );
  expression.parametersValues.push(guaranteeNonNullable(propertyExpression));
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
  parentExpression: SimpleFunctionExpression,
  operatorFunctionFullPath: string,
): [FilterConditionState | undefined, SimpleFunctionExpression | undefined] => {
  if (
    matchFunctionName(
      parentExpression.functionName,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXISTS,
    )
  ) {
    // 1. Decompose the exists() lambda chain into property expression chains
    const existsLambdaParameterNames: string[] = [];

    // `existsLambdaExpressions` should be a list of `AbstractPropertyExpression`
    // e.g. |Firm.all()->filter(x|$x.employees->exists(x_1|$x_1->subType(@Develper).id->exists(x_2|$x_2 == 1))
    // In the first exists() lambda, `$x_1->subType(@Develper).id` is an `AbstractPropertyExpression`.
    const existsLambdaExpressions: AbstractPropertyExpression[] = [];
    let mainFilterExpression: SimpleFunctionExpression = parentExpression;
    while (
      matchFunctionName(
        mainFilterExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXISTS,
      )
    ) {
      const existsLambda = guaranteeNonNullable(
        guaranteeType(
          mainFilterExpression.parametersValues[1],
          LambdaFunctionInstanceValue,
        ).values[0],
        `Can't process exists() expression: exists() lambda is missing`,
      );
      assertTrue(
        existsLambda.expressionSequence.length === 1,
        `Can't process exists() expression: exists() lambda body should hold an expression`,
      );
      mainFilterExpression = guaranteeType(
        existsLambda.expressionSequence[0],
        SimpleFunctionExpression,
        `Can't process exists() expression: exists() lambda body should hold an expression`,
      );

      // record the lambda parameter name
      assertTrue(
        existsLambda.functionType.parameters.length === 1,
        `Can't process exists() expression: exists() lambda should have 1 parameter`,
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
        mainFilterExpression.parametersValues[0] instanceof
        AbstractPropertyExpression
      ) {
        existsLambdaExpressions.push(mainFilterExpression.parametersValues[0]);
      }
    }
    // NOTE: make sure that the inner most function expression is the one we support
    if (
      !matchFunctionName(
        mainFilterExpression.functionName,
        operatorFunctionFullPath,
      )
    ) {
      return [undefined, undefined];
    }

    // 2. Build the property expression
    const initialPropertyExpression = guaranteeType(
      parentExpression.parametersValues[0],
      AbstractPropertyExpression,
    );
    let flattenedPropertyExpressionChain = new AbstractPropertyExpression('');
    flattenedPropertyExpressionChain.func = initialPropertyExpression.func;
    flattenedPropertyExpressionChain.parametersValues = [
      ...initialPropertyExpression.parametersValues,
    ];

    for (const expression of existsLambdaExpressions) {
      // when rebuilding the property expression chain, disregard the initial variable that starts the chain
      const expressions: (
        | AbstractPropertyExpression
        | SimpleFunctionExpression
      )[] = [];
      let currentExpression: ValueSpecification = expression;
      while (
        currentExpression instanceof AbstractPropertyExpression ||
        (currentExpression instanceof SimpleFunctionExpression &&
          matchFunctionName(
            currentExpression.functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
          ))
      ) {
        if (currentExpression instanceof SimpleFunctionExpression) {
          const functionExpression = new SimpleFunctionExpression(
            extractElementNameFromPath(
              QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
            ),
          );
          functionExpression.parametersValues.unshift(
            guaranteeNonNullable(currentExpression.parametersValues[1]),
          );
          expressions.push(functionExpression);
        } else if (currentExpression instanceof AbstractPropertyExpression) {
          const propertyExpression = new AbstractPropertyExpression('');
          propertyExpression.func = currentExpression.func;
          // NOTE: we must retain the rest of the parameters as those are derived property parameters
          propertyExpression.parametersValues =
            currentExpression.parametersValues.length > 1
              ? currentExpression.parametersValues.slice(1)
              : [];
          expressions.push(propertyExpression);
        }
        currentExpression = guaranteeNonNullable(
          currentExpression.parametersValues[0],
        );
      }
      assertTrue(
        expressions.length > 0,
        `Can't process exists() expression: exists() usage with non-chain property expression is not supported`,
      );
      for (let i = 0; i < expressions.length - 1; ++i) {
        (
          expressions[i] as
            | AbstractPropertyExpression
            | SimpleFunctionExpression
        ).parametersValues.unshift(
          expressions[i + 1] as
            | AbstractPropertyExpression
            | SimpleFunctionExpression,
        );
      }
      (
        expressions[expressions.length - 1] as
          | AbstractPropertyExpression
          | SimpleFunctionExpression
      ).parametersValues.unshift(flattenedPropertyExpressionChain);
      flattenedPropertyExpressionChain = guaranteeType(
        expressions[0],
        AbstractPropertyExpression,
        `Can't process exists() expression: can't flatten to a property expression`,
      );
    }

    // 3. Build the filter condition state with the simplified property expression
    const filterConditionState = new FilterConditionState(
      filterState,
      flattenedPropertyExpressionChain,
    );
    existsLambdaParameterNames.forEach((paramName) =>
      filterConditionState.addExistsLambdaParamNames(paramName),
    );
    return [filterConditionState, mainFilterExpression];
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
    matchFunctionName(
      expression.functionName,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXISTS,
    )
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

    // value
    const value = mainExpressionWithOperator.parametersValues[1];
    if (hasNoValue || !value) {
      filterConditionState.setValue(undefined);
    } else {
      filterConditionState.setValue(
        simplifyValueExpression(
          value,
          filterConditionState.filterState.queryBuilderState.observerContext,
        ),
      );
    }
    if (!operator.isCompatibleWithFilterConditionValue(filterConditionState)) {
      filterConditionState.setValue(
        operator.getDefaultFilterConditionValue(filterConditionState),
      );
    }
    return filterConditionState;
  }
  return undefined;
};
