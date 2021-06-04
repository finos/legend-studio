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
} from '@finos/legend-studio';
import {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  VariableExpression,
  SUPPORTED_FUNCTIONS,
  AbstractPropertyExpression,
  GenericType,
  GenericTypeExplicitReference,
  PrimitiveInstanceValue,
  EnumValueInstanceValue,
  SimpleFunctionExpression,
  PRIMITIVE_TYPE,
  CORE_ELEMENT_PATH,
  TYPICAL_MULTIPLICITY_TYPE,
} from '@finos/legend-studio';
import {
  guaranteeType,
  UnsupportedOperationError,
  guaranteeNonNullable,
  assertTrue,
  generateEnumerableNameFromToken,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import type {
  QueryBuilderFilterState,
  QueryBuilderOperator,
} from '../QueryBuilderFilterState';
import { FilterConditionState } from '../QueryBuilderFilterState';
import format from 'date-fns/format';
import { DATE_FORMAT } from '@finos/legend-studio/lib/const';

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
  const multiplicityOne =
    filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
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

const getPropertyExpressionChainVariable = (
  propertyExpression: AbstractPropertyExpression,
): VariableExpression => {
  let currentPe: ValueSpecification = propertyExpression;
  while (currentPe instanceof AbstractPropertyExpression) {
    currentPe = currentPe.parametersValues[0];
  }
  return guaranteeType(currentPe, VariableExpression);
};

const buildFilterConditionExpressionWithExists = (
  filterConditionState: FilterConditionState,
  operatorFunctionName: string,
): ValueSpecification => {
  const multiplicityOne =
    filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  assertTrue(filterConditionState.propertyEditorState.requiresExistsHandling);

  // 1. Decompose property expression
  const pes: AbstractPropertyExpression[] = [];
  let currentPe: ValueSpecification =
    filterConditionState.propertyEditorState.propertyExpression;
  while (currentPe instanceof AbstractPropertyExpression) {
    const pe = new AbstractPropertyExpression('', multiplicityOne);
    pe.func = currentPe.func;
    pe.parametersValues =
      currentPe.parametersValues.length > 1
        ? // NOTE: we must retain the rest of the parameters as those are derived property parameters
          currentPe.parametersValues.slice(1)
        : [];
    pes.push(pe);
    currentPe = currentPe.parametersValues[0];
  }
  const rootVariable = guaranteeType(currentPe, VariableExpression);

  // 2. Traverse the list of decomposed property expression backward, every time we encounter a property of
  // multiplicity many, create a new property expression and keep track of it to later form the lambda chain
  const existsLambdaParamNames = [
    ...filterConditionState.existsLambdaParamNames,
  ];
  const existsLambdaPropertyChains: ValueSpecification[] = [rootVariable];
  let currentParamNameIndex = 0;

  for (let i = pes.length - 1; i >= 0; --i) {
    const pe = pes[i];
    // just keep adding to the property chain
    pe.parametersValues.unshift(
      existsLambdaPropertyChains[existsLambdaPropertyChains.length - 1],
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
            filterConditionState.filterState.lambdaVariableName,
          ),
        );
        assertTrue(currentParamNameIndex === existsLambdaParamNames.length - 1);
      }
      existsLambdaPropertyChains.push(
        new VariableExpression(
          existsLambdaParamNames[currentParamNameIndex],
          multiplicityOne,
        ),
      );
      currentParamNameIndex++;
    }
  }

  // 3. Build each property chain into an exists() simple function expression
  const simpleFunctionExpressions: SimpleFunctionExpression[] = [];
  const typeAny = filterConditionState.editorStore.graphState.graph.getClass(
    CORE_ELEMENT_PATH.ANY,
  );
  for (let i = 0; i < existsLambdaPropertyChains.length - 1; ++i) {
    const simpleFunctionExpression = new SimpleFunctionExpression(
      SUPPORTED_FUNCTIONS.EXISTS,
      multiplicityOne,
    );
    simpleFunctionExpression.parametersValues.push(
      existsLambdaPropertyChains[i],
    );
    simpleFunctionExpressions.push(simpleFunctionExpression);
  }
  // build the leaf simple function expression which uses the operator
  const operatorEpression = new SimpleFunctionExpression(
    operatorFunctionName,
    multiplicityOne,
  );
  operatorEpression.parametersValues.push(
    existsLambdaPropertyChains[existsLambdaPropertyChains.length - 1],
  );
  // NOTE: there are simple operators which do not require any params (e.g. isEmpty)
  if (filterConditionState.value) {
    operatorEpression.parametersValues.push(filterConditionState.value);
  }
  simpleFunctionExpressions.push(operatorEpression);

  // 4. Build the exists() lambda chain
  assertTrue(simpleFunctionExpressions.length >= 2);
  for (let i = simpleFunctionExpressions.length - 2; i >= 0; --i) {
    const currentSFE = simpleFunctionExpressions[i];
    const childSFE = simpleFunctionExpressions[i + 1];
    // build child SFE lambda
    const _existsLambdaVariable = childSFE.parametersValues[0];
    const existsLambdaVariable =
      _existsLambdaVariable instanceof AbstractPropertyExpression
        ? getPropertyExpressionChainVariable(_existsLambdaVariable)
        : guaranteeType(_existsLambdaVariable, VariableExpression);
    const existsLambda = new LambdaFunctionInstanceValue(multiplicityOne);
    const existsLambdaFunctionType = new FunctionType(typeAny, multiplicityOne);
    existsLambdaFunctionType.parameters.push(existsLambdaVariable);
    const existsLambdaFunction = new LambdaFunction(existsLambdaFunctionType);
    existsLambdaFunction.expressionSequence = [childSFE];
    existsLambda.values.push(existsLambdaFunction);
    // add the child SFE lambda to the current SFE parameters
    currentSFE.parametersValues.push(existsLambda);
  }

  return simpleFunctionExpressions[0];
};

export const buildFilterConditionExpression = (
  filterConditionState: FilterConditionState,
  operatorFunctionName: string,
): ValueSpecification => {
  const multiplicityOne =
    filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  if (filterConditionState.propertyEditorState.requiresExistsHandling) {
    return buildFilterConditionExpressionWithExists(
      filterConditionState,
      operatorFunctionName,
    );
  }
  const expression = new SimpleFunctionExpression(
    operatorFunctionName,
    multiplicityOne,
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
): [FilterConditionState | undefined, SimpleFunctionExpression | undefined] => {
  if (expression.functionName === SUPPORTED_FUNCTIONS.EXISTS) {
    // 1. Decompose the exists() lambda chain into property expression chains
    const existsLambdaParameterNames: string[] = [];
    const propertyExpressions: AbstractPropertyExpression[] = [];
    let currentExpression: SimpleFunctionExpression = expression;
    while (currentExpression.functionName === SUPPORTED_FUNCTIONS.EXISTS) {
      const existsLambda = guaranteeNonNullable(
        guaranteeType(
          currentExpression.parametersValues[1],
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
    // NOTE: make sure that the inner most function expression is the one we support
    if (currentExpression.functionName !== operatorFunctionName) {
      return [undefined, undefined];
    }

    // 2. Build the property expression
    const multiplicityOne =
      filterState.editorStore.graphState.graph.getTypicalMultiplicity(
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

    // 3. Build the filter condition state with the simplified property expression
    const filterConditionState = new FilterConditionState(
      filterState.editorStore,
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
  // We use this to keep track of the main expression that uses the operator. This is needed
  // for the post-build check logic
  // NOTE: this might be short-sighted design, if more complicated use case coming up
  // we probably should just move the post-build check logic into simple operator case
  let mainExpressionWithOperator: SimpleFunctionExpression | undefined;
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
    mainExpressionWithOperator = expression;
  } else if (expression.functionName === SUPPORTED_FUNCTIONS.EXISTS) {
    [filterConditionState, mainExpressionWithOperator] =
      buildFilterConditionStateWithExists(
        filterState,
        expression,
        operatorFunctionName,
      );
  }

  // Post-build check: make sure the simple filter condition LHS, RHS, and operator are compatible
  // otherwise, reset the value of the condition automatically.
  // TODO: consider if this is the good thing to do, or should we throw and redirect to text-mode?
  if (filterConditionState && mainExpressionWithOperator) {
    if (
      !operator.isCompatibleWithFilterConditionProperty(filterConditionState)
    ) {
      return undefined;
    }
    filterConditionState.setOperator(operator);
    if (!hasNoValue && mainExpressionWithOperator.parametersValues.length < 2) {
      return undefined;
    }
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
    filterConditionState.editorStore.graphState.graph.getTypicalMultiplicity(
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

export const getNonCollectionValueSpecificationType = (
  valueSpecification: ValueSpecification,
): Type | undefined => {
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    return valueSpecification.genericType.value.rawType;
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return guaranteeNonNullable(valueSpecification.values[0]).value.owner;
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
            filterConditionState.editorStore.graphState.graph.getPrimitiveType(
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
            filterConditionState.editorStore.graphState.graph.getPrimitiveType(
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
