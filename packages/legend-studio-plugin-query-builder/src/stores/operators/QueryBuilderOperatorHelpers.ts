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

import type { Type, ValueSpecification } from '@finos/legend-studio';
import {
  LambdaFunctionInstanceValue,
  VariableExpression,
  SUPPORTED_FUNCTIONS,
  AbstractPropertyExpression,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-studio';
import {
  guaranteeType,
  UnsupportedOperationError,
  guaranteeNonNullable,
  assertTrue,
} from '@finos/legend-studio-shared';
import type {
  QueryBuilderFilterState,
  QueryBuilderOperator,
} from '../QueryBuilderFilterState';
import { FilterConditionState } from '../QueryBuilderFilterState';
import format from 'date-fns/format';
import { DATE_FORMAT } from '@finos/legend-studio/lib/const';

export interface QueryBuilderValueSpecificationInfo {
  type: Type;
  isCollection: boolean;
}

export const getDefaultPrimitiveInstanceValueForType = (
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
    case PRIMITIVE_TYPE.STRICTDATE:
      return format(new Date(Date.now()), DATE_FORMAT);
    default:
      throw new UnsupportedOperationError(
        `Can't get default value for primitive instance of type '${type}'`,
      );
  }
};

export const buildPrimitiveInstanceValue = (
  filterConditionState: FilterConditionState,
  type: PRIMITIVE_TYPE,
  value: unknown,
): PrimitiveInstanceValue => {
  const multiplicityOne = filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const instance = new PrimitiveInstanceValue(
    GenericTypeExplicitReference.create(
      new GenericType(
        filterConditionState.editorStore.graphState.graph.getPrimitiveType(
          type,
        ),
      ),
    ),
    multiplicityOne,
  );
  instance.values = [value];
  return instance;
};

export const buildFilterConditionExpression = (
  filterConditionState: FilterConditionState,
  functionName: string,
): ValueSpecification => {
  const multiplicity_ONE = filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  // if (filterConditionState.propertyEditorState.requiresExistsHandling) {
  //   const pes: AbstractPropertyExpression[] = [];
  //   let currentPe: ValueSpecification =
  //     filterConditionState.propertyEditorState.propertyExpression;
  //   while (currentPe instanceof AbstractPropertyExpression) {
  //     const pe = new AbstractPropertyExpression('', multiplicity_ONE);
  //     pe.func = currentPropertyExpression.func;
  //     pes.push(pe);
  //     currentPe = currentPe.parametersValues[0];
  //   }
  //   // generateTestName(): string {
  //   //   const generatedName = generateEnumerableNameFromToken(
  //   //     this.tests.map((test) => test.name),
  //   //     'test',
  //   //   );
  //   //   assertTrue(
  //   //     !this.tests.find((test) => test.name === generatedName),
  //   //     `Can't auto-generate test name for value '${generatedName}'`,
  //   //   );
  //   //   return generatedName;
  //   // }
  //   return new ValueSpecification();
  // }
  const expression = new SimpleFunctionExpression(
    functionName,
    multiplicity_ONE,
  );
  expression.parametersValues.push(
    filterConditionState.propertyEditorState.propertyExpression,
  );
  // NOTE: there are simple operators which do not require any params (e.g. isEmpty)
  if (filterConditionState.value) {
    expression.parametersValues.push(filterConditionState.value);
  }
  return expression;
};

// buildFilterExpression(
//   getAllFunc: SimpleFunctionExpression,
// ): SimpleFunctionExpression | undefined {
//   const lambdaVariable = new VariableExpression(
//     this.filterState.lambdaVariableName,
//     this.editorStore.graphState.graph.getTypicalMultiplicity(
//       TYPICAL_MULTIPLICITY_TYPE.ONE,
//     ),
//   );
//   const parameters = this.filterState.getParameterValues();
//   if (!parameters) {
//     return undefined;
//   }
//   const typeAny = this.editorStore.graphState.graph.getClass(
//     CORE_ELEMENT_PATH.ANY,
//   );
//   const multiplicityOne = this.editorStore.graphState.graph.getTypicalMultiplicity(
//     TYPICAL_MULTIPLICITY_TYPE.ONE,
//   );
//   // main filter expression
//   const filterExpression = new SimpleFunctionExpression(
//     SUPPORTED_FUNCTIONS.FILTER,
//     multiplicityOne,
//   );
//   // param [0]
//   filterExpression.parametersValues.push(getAllFunc);
//   // param [1]
//   const filterLambda = new LambdaFunctionInstanceValue(multiplicityOne);
//   const filterLambdaFunctionType = new FunctionType(typeAny, multiplicityOne);
//   filterLambdaFunctionType.parameters.push(lambdaVariable);
//   const colLambdaFunction = new LambdaFunction(filterLambdaFunctionType);
//   colLambdaFunction.expressionSequence = parameters;
//   filterLambda.values.push(colLambdaFunction);
//   filterExpression.parametersValues.push(filterLambda);
//   return filterExpression;
// }

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
  operatorFunctionName: string,
): FilterConditionState | undefined => {
  if (expression.functionName === SUPPORTED_FUNCTIONS.EXISTS) {
    const existsLambdaParameterNames: string[] = [];
    const propertyExpressions: AbstractPropertyExpression[] = [];
    let currentExpression: SimpleFunctionExpression = expression;
    while (currentExpression.functionName === SUPPORTED_FUNCTIONS.EXISTS) {
      // loop into and extract and build the property expression
      const existsLambda = guaranteeNonNullable(
        guaranteeType(
          expression.parametersValues[1],
          LambdaFunctionInstanceValue,
        ).values[0],
        'exists() lambda function is missing',
      );
      if (
        existsLambda.expressionSequence.length === 1 &&
        existsLambda.expressionSequence[0] instanceof
          SimpleFunctionExpression &&
        existsLambda.functionType.parameters.length === 1 &&
        existsLambda.functionType.parameters[0] instanceof VariableExpression
      ) {
        currentExpression = guaranteeType(
          existsLambda.expressionSequence[0],
          SimpleFunctionExpression,
        );
        // record the lambda parameter name
        existsLambdaParameterNames.push(
          guaranteeType(
            existsLambda.functionType.parameters[0],
            VariableExpression,
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
      } else {
        throw new Error(`Can't process exists() lambda function`);
      }
    }
    if (currentExpression.functionName !== operatorFunctionName) {
      return undefined;
    }
    const multiplicity_ONE = filterState.editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
    // form the property expression chain
    const initialPropertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
    );
    let propertyExpression = new AbstractPropertyExpression(
      '',
      multiplicity_ONE,
    );
    propertyExpression.func = initialPropertyExpression.func;
    propertyExpression.parametersValues =
      initialPropertyExpression.parametersValues;
    for (const currentPropertyExpression of propertyExpressions) {
      // when rebuilding the property expression chain, disregard the initial variable that starts the chain
      const pes: AbstractPropertyExpression[] = [];
      let currentPe: ValueSpecification = currentPropertyExpression;
      while (currentPe instanceof AbstractPropertyExpression) {
        const pe = new AbstractPropertyExpression('', multiplicity_ONE);
        pe.func = currentPe.func;
        pe.parametersValues =
          currentPe.parametersValues.length > 1
            ? // NOTE: we must retain the rest of the parameters as those are derived property parameters
              currentPe.parametersValues.slice(1)
            : [];
        pes.push(pe);
        currentPe = currentPe.parametersValues[0];
      }
      assertTrue(
        pes.length > 0,
        `exists() usage with non-chain property expression is not supported`,
      );
      for (let i = 0; i < pes.length - 1; ++i) {
        pes[i].parametersValues.unshift(pes[i + 1]);
      }
      pes[pes.length - 1].parametersValues.unshift(propertyExpression);
      propertyExpression = pes[0];
    }
    const filterConditionState = new FilterConditionState(
      filterState.editorStore,
      filterState,
      propertyExpression,
    );
    existsLambdaParameterNames.forEach((paramName) =>
      filterConditionState?.addExistsLambdaParamNames(paramName),
    );
    return filterConditionState;
  }
  return undefined;
};

const getPropertyExpressionChainVariable = (
  propertyExpression: AbstractPropertyExpression,
): VariableExpression => {
  let currentPe: ValueSpecification = propertyExpression;
  while (currentPe instanceof AbstractPropertyExpression) {
    currentPe = currentPe.parametersValues[0];
  }
  return guaranteeType(currentPe, VariableExpression);
};

export const buildFilterConditionState = (
  filterState: QueryBuilderFilterState,
  expression: SimpleFunctionExpression,
  operatorFunctionName: string,
  operator: QueryBuilderOperator,
  /**
   * Use this flag for operator that does not require any param (e.g. isEmpty)
   * NOTE: this is not the cleanest way to do this, if we find ourselves adding more and more customization
   * to this utility function, we should just create a bunch of different methods
   */
  hasNoValue = false,
): FilterConditionState | undefined => {
  let filterConditionState: FilterConditionState | undefined;
  if (expression.functionName === operatorFunctionName) {
    const propertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
    );
    // Make sure the variable name used in the property expression matches the lambda parameter
    if (
      filterState.lambdaVariableName !==
      getPropertyExpressionChainVariable(propertyExpression).name
    ) {
      return undefined;
    }
    filterConditionState = new FilterConditionState(
      filterState.editorStore,
      filterState,
      propertyExpression,
    );
  } else if (expression.functionName === SUPPORTED_FUNCTIONS.EXISTS) {
    filterConditionState = buildFilterConditionStateWithExists(
      filterState,
      expression,
      operatorFunctionName,
    );
  }
  // Do some check to make sure the simple filter condition LHS, RHS, and operator are compatible
  if (filterConditionState) {
    if (
      !operator.isCompatibleWithFilterConditionProperty(filterConditionState)
    ) {
      return undefined;
    }
    filterConditionState.setOperator(operator);
    if (!hasNoValue && expression.parametersValues.length < 2) {
      return undefined;
    }
    filterConditionState.setValue(
      hasNoValue ? undefined : expression.parametersValues[1],
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
  const multiplicityOne = filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
    TYPICAL_MULTIPLICITY_TYPE.ONE,
  );
  const expressionNot = new SimpleFunctionExpression(
    SUPPORTED_FUNCTIONS.NOT,
    multiplicityOne,
  );
  expressionNot.parametersValues.push(expression);
  return expressionNot;
};

export const unwrapNotExpression = (
  expression: SimpleFunctionExpression,
): SimpleFunctionExpression | undefined => {
  if (expression.functionName === SUPPORTED_FUNCTIONS.NOT) {
    return guaranteeType(
      expression.parametersValues[0],
      SimpleFunctionExpression,
    );
  }
  return undefined;
};

export const getValueSpecificationTypeInfo = (
  valueSpecification: ValueSpecification,
): QueryBuilderValueSpecificationInfo | undefined => {
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    return {
      type: valueSpecification.genericType.value.rawType,
      isCollection: false,
    };
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return {
      type: guaranteeNonNullable(valueSpecification.values[0]).value.owner,
      isCollection: false,
    };
  }
  // WIP-QB: support collection here
  return undefined;
};
