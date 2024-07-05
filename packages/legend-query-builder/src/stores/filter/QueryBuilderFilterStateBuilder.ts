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
  AbstractPropertyExpression,
  extractElementNameFromPath,
  LambdaFunction,
  LambdaFunctionInstanceValue,
  matchFunctionName,
  SimpleFunctionExpression,
  type ValueSpecification,
  VariableExpression,
} from '@finos/legend-graph';
import {
  assertTrue,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';
import { toGroupOperation } from '../QueryBuilderGroupOperationHelper.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';
import { validatePropertyExpressionChain } from '../QueryBuilderValueSpecificationHelper.js';
import {
  type QueryBuilderFilterState,
  QueryBuilderFilterTreeConditionNodeData,
  QueryBuilderFilterTreeGroupNodeData,
  QueryBuilderFilterTreeExistsNodeData,
  QueryBuilderFilterTreeOperationNodeData,
} from './QueryBuilderFilterState.js';

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

const processFilterTree = (
  expression: SimpleFunctionExpression,
  filterState: QueryBuilderFilterState,
  parentFilterNodeId: string | undefined,
): void => {
  const parentNode = parentFilterNodeId
    ? filterState.getNode(parentFilterNodeId)
    : undefined;
  if (
    matchFunctionName(expression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.AND,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.OR,
    ])
  ) {
    const groupNode = new QueryBuilderFilterTreeGroupNodeData(
      parentFilterNodeId,
      toGroupOperation(expression.functionName),
    );
    filterState.nodes.set(groupNode.id, groupNode);
    if (parentNode) {
      groupNode.lambdaParameterName = guaranteeType(
        parentNode,
        QueryBuilderFilterTreeOperationNodeData,
      ).lambdaParameterName;
    }
    expression.parametersValues.forEach((filterExpression) =>
      processFilterTree(
        guaranteeType(
          filterExpression,
          SimpleFunctionExpression,
          `Can't process filter group expression: each child expression must be a function expression`,
        ),
        filterState,
        groupNode.id,
      ),
    );
    filterState.addNodeFromNode(groupNode, parentNode);
  } else if (
    matchFunctionName(expression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXISTS,
    ])
  ) {
    const propertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
    );
    if (
      propertyExpression.func.value.multiplicity.upperBound === undefined ||
      propertyExpression.func.value.multiplicity.upperBound > 1
    ) {
      const existsNode = new QueryBuilderFilterTreeExistsNodeData(
        filterState,
        parentFilterNodeId,
      );
      const lambdaFunctionInstance = guaranteeType(
        expression.parametersValues[1],
        LambdaFunctionInstanceValue,
        `Can't process filter expression: only supports exists with second paramter as LambdaFunctionInstanceValue`,
      );
      const lambdaFunction = guaranteeType(
        lambdaFunctionInstance.values[0],
        LambdaFunction,
      );
      const filterExpression = guaranteeType(
        lambdaFunction.expressionSequence[0],
        SimpleFunctionExpression,
      );
      existsNode.setPropertyExpression(propertyExpression);
      existsNode.lambdaParameterName =
        lambdaFunction.functionType.parameters[0]?.name;
      filterState.nodes.set(existsNode.id, existsNode);
      processFilterTree(filterExpression, filterState, existsNode.id);
      filterState.addNodeFromNode(existsNode, parentNode);
    } else {
      // Build property chain if we have exists filter() and the multiplicity of the property
      // is of multiplicity less than or equal to one. This will auto-fix the exists into the
      // desired filter expression

      // 1. Decompose the exists() lambda chain into property expression chains
      const existsLambdaParameterNames: string[] = [];

      const existsLambdaExpressions: AbstractPropertyExpression[] = [];
      let mainFilterExpression: SimpleFunctionExpression = expression;
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
            AbstractPropertyExpression &&
          !(
            mainFilterExpression.parametersValues[0].func.value.multiplicity
              .upperBound === undefined ||
            mainFilterExpression.parametersValues[0].func.value.multiplicity
              .upperBound > 1
          )
        ) {
          existsLambdaExpressions.push(
            mainFilterExpression.parametersValues[0],
          );
        } else {
          break;
        }
      }

      // 2. Build the property expression
      const initialPropertyExpression = guaranteeType(
        expression.parametersValues[0],
        AbstractPropertyExpression,
      );
      let flattenedPropertyExpressionChain = new AbstractPropertyExpression('');
      flattenedPropertyExpressionChain.func = initialPropertyExpression.func;
      flattenedPropertyExpressionChain.parametersValues = [
        ...initialPropertyExpression.parametersValues,
      ];
      for (const exp of existsLambdaExpressions) {
        // when rebuilding the property expression chain, disregard the initial variable that starts the chain
        const expressions: (
          | AbstractPropertyExpression
          | SimpleFunctionExpression
        )[] = [];
        let currentExpression: ValueSpecification = exp;
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
            const propertyExp = new AbstractPropertyExpression('');
            propertyExp.func = currentExpression.func;
            // NOTE: we must retain the rest of the parameters as those are derived property parameters
            propertyExp.parametersValues =
              currentExpression.parametersValues.length > 1
                ? currentExpression.parametersValues.slice(1)
                : [];
            expressions.push(propertyExp);
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
      mainFilterExpression.parametersValues =
        mainFilterExpression.parametersValues.map((p) => {
          if (
            p instanceof SimpleFunctionExpression &&
            p.parametersValues[0] instanceof AbstractPropertyExpression
          ) {
            p.parametersValues[0].parametersValues[0] =
              flattenedPropertyExpressionChain;
          } else if (p instanceof AbstractPropertyExpression) {
            p.parametersValues[0] = guaranteeNonNullable(
              flattenedPropertyExpressionChain.parametersValues[0],
            );
          } else if (p instanceof VariableExpression) {
            return flattenedPropertyExpressionChain;
          }
          return p;
        });
      processFilterTree(mainFilterExpression, filterState, parentFilterNodeId);
    }
  } else {
    const propertyExpression = expression.parametersValues[0];
    if (propertyExpression instanceof AbstractPropertyExpression) {
      const currentPropertyExpression = propertyExpression.parametersValues[0];
      if (currentPropertyExpression instanceof AbstractPropertyExpression) {
        validatePropertyExpressionChain(
          currentPropertyExpression,
          filterState.queryBuilderState.graphManagerState.graph,
          filterState.queryBuilderState,
        );
      }
    }
    for (const operator of filterState.operators) {
      // NOTE: this allow plugin author to either return `undefined` or throw error
      // if there is a problem with building the lambda. Either case, the plugin is
      // considered as not supporting the lambda.
      const filterConditionState = returnUndefOnError(() =>
        operator.buildFilterConditionState(filterState, expression),
      );
      if (filterConditionState) {
        const variableName = getPropertyExpressionChainVariable(
          filterConditionState.propertyExpressionState.propertyExpression,
        ).name;
        const parentLambdaVariableName =
          parentNode instanceof QueryBuilderFilterTreeOperationNodeData &&
          parentNode.lambdaParameterName
            ? parentNode.lambdaParameterName
            : filterState.lambdaParameterName;
        assertTrue(
          parentLambdaVariableName === variableName,
          `Can't process ${extractElementNameFromPath(
            filterConditionState.operator.getLabel(filterConditionState),
          )}() expression: expects variable used in lambda body '${variableName}' to match lambda parameter '${parentLambdaVariableName}'`,
        );
        filterState.addNodeFromNode(
          new QueryBuilderFilterTreeConditionNodeData(
            undefined,
            filterConditionState,
          ),
          parentNode,
        );
        return;
      }
    }
    throw new UnsupportedOperationError(
      `Can't process filter() expression: no compatible filter operator processer available from plugins`,
    );
  }
};

export const processFilterExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  const filterState = queryBuilderState.filterState;
  const filterLambda = expression.parametersValues[1];
  assertType(
    filterLambda,
    LambdaFunctionInstanceValue,
    `Can't process filter() expression: filter() expects argument #1 to be a lambda function`,
  );

  const lambdaFunc = guaranteeNonNullable(
    filterLambda.values[0],
    `Can't process filter() lambda: filter() lambda function is missing`,
  );
  assertTrue(
    lambdaFunc.expressionSequence.length === 1,
    `Can't process filter() lambda: only support filter() lambda body with 1 expression`,
  );
  const rootExpression = guaranteeType(
    lambdaFunc.expressionSequence[0],
    SimpleFunctionExpression,
    `Can't process filter() lambda: only support filter() lambda body with 1 expression`,
  );

  assertTrue(
    lambdaFunc.functionType.parameters.length === 1,
    `Can't process filter() lambda: only support filter() lambda with 1 parameter`,
  );
  filterState.setLambdaParameterName(
    guaranteeType(
      lambdaFunc.functionType.parameters[0],
      VariableExpression,
      `Can't process filter() lambda: only support filter() lambda with 1 parameter`,
    ).name,
  );

  processFilterTree(rootExpression, filterState, undefined);

  /**
   * NOTE: Since group operations like and/or do not take more than 2 parameters, if there are
   * more than 2 clauses in each group operations, then these clauses are converted into an
   * unbalanced tree. However, this would look quite bad for UX, as such, we simplify the tree.
   * After building the filter state.
   */
  filterState.simplifyTree();
};

export const processFilterLambda = (
  lambdaFunc: LambdaFunction,
  queryBuilderState: QueryBuilderState,
): void => {
  const filterState = queryBuilderState.filterState;

  assertTrue(
    lambdaFunc.expressionSequence.length === 1,
    `Can't process filter() lambda: only support filter() lambda body with 1 expression`,
  );
  const rootExpression = guaranteeType(
    lambdaFunc.expressionSequence[0],
    SimpleFunctionExpression,
    `Can't process filter() lambda: only support filter() lambda body with 1 expression`,
  );

  assertTrue(
    lambdaFunc.functionType.parameters.length === 1,
    `Can't process filter() lambda: only support filter() lambda with 1 parameter`,
  );
  filterState.setLambdaParameterName(
    guaranteeType(
      lambdaFunc.functionType.parameters[0],
      VariableExpression,
      `Can't process filter() lambda: only support filter() lambda with 1 parameter`,
    ).name,
  );

  processFilterTree(rootExpression, filterState, undefined);

  /**
   * NOTE: Since group operations like and/or do not take more than 2 parameters, if there are
   * more than 2 clauses in each group operations, then these clauses are converted into an
   * unbalanced tree. However, this would look quite bad for UX, as such, we simplify the tree.
   * After building the filter state.
   */
  filterState.simplifyTree();
};
