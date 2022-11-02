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
  LambdaFunctionInstanceValue,
  AbstractPropertyExpression,
  extractElementNameFromPath,
  PrimitiveInstanceValue,
  matchFunctionName,
  VariableExpression,
  FunctionExpression,
  type SimpleFunctionExpression,
} from '@finos/legend-graph';
import {
  assertTrue,
  assertType,
  guaranteeIsString,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QueryBuilderDerivationProjectionColumnState } from '../projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSColumnState } from '../QueryBuilderTDSColumnState.js';
import { getTDSColumnState } from '../QueryBuilderTDSHelper.js';
import type { QueryBuilderPostFilterOperator } from './QueryBuilderPostFilterOperator.js';
import {
  type QueryBuilderPostFilterState,
  getTDSColumnDerivedProperyFromType,
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
  TDS_COLUMN_GETTER,
  getTypeFromDerivedProperty,
} from './QueryBuilderPostFilterState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graphManager/QueryBuilderSupportedFunctions.js';
import type { QueryBuilderState } from '../../../QueryBuilderState.js';
import { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { toGroupOperation } from '../../../QueryBuilderGroupOperationHelper.js';

const findProjectionColumnState = (
  propertyExpression: AbstractPropertyExpression,
  postFilterState: QueryBuilderPostFilterState,
): QueryBuilderTDSColumnState => {
  const projectionState = postFilterState.tdsState;
  const properyExpressionName = propertyExpression.func.value.name;
  assertTrue(
    Object.values(TDS_COLUMN_GETTER).includes(
      properyExpressionName as TDS_COLUMN_GETTER,
    ),
    `Can't process TDS column expression: TDS column property '${properyExpressionName}' not supported. Supported types are ${Object.values(
      TDS_COLUMN_GETTER,
    ).join(',')}`,
  );
  const tdsColumnGetter = properyExpressionName as TDS_COLUMN_GETTER;
  const columnNameExpression = propertyExpression.parametersValues[1];
  const columnName = guaranteeIsString(
    guaranteeType(
      columnNameExpression,
      PrimitiveInstanceValue,
      'Can`t process TDS column expression: Column should be a primitive instance value',
    ).values[0],
    'Can`t process TDS column expression: Column should be a string primitive instance value',
  );
  const columnState = getTDSColumnState(projectionState, columnName);
  if (
    tdsColumnGetter !== TDS_COLUMN_GETTER.IS_NULL &&
    tdsColumnGetter !== TDS_COLUMN_GETTER.IS_NOT_NULL
  ) {
    if (columnState instanceof QueryBuilderDerivationProjectionColumnState) {
      const type = getTypeFromDerivedProperty(
        tdsColumnGetter,
        postFilterState.tdsState.queryBuilderState.graphManagerState.graph,
      );
      if (type) {
        columnState.setReturnType(type);
      }
      return columnState;
    }
    const columnType = guaranteeNonNullable(columnState.getColumnType());
    assertTrue(
      (getTDSColumnDerivedProperyFromType(columnType) as string) ===
        tdsColumnGetter,
      `Can't process TDS column expression: expected column type ${getTDSColumnDerivedProperyFromType(
        columnType,
      )} (got ${tdsColumnGetter})`,
    );
  }
  return columnState;
};

export const buildPostFilterConditionState = (
  postFilterState: QueryBuilderPostFilterState,
  expression: FunctionExpression,
  operatorFunctionFullPath: string | undefined,
  operator: QueryBuilderPostFilterOperator,
): PostFilterConditionState | undefined => {
  let postConditionState: PostFilterConditionState | undefined;
  const tdsColumnGetter = operator.getTDSColumnGetter();
  if (
    tdsColumnGetter &&
    expression instanceof AbstractPropertyExpression &&
    expression.func.value.name === tdsColumnGetter
  ) {
    const columnState = findProjectionColumnState(expression, postFilterState);
    postConditionState = new PostFilterConditionState(
      postFilterState,
      columnState,
      undefined,
      operator,
    );
    return postConditionState;
  } else if (
    operatorFunctionFullPath &&
    matchFunctionName(expression.functionName, operatorFunctionFullPath)
  ) {
    assertTrue(
      expression.parametersValues.length === 2,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expects '1 argument'`,
    );

    // get projection column
    const tdsColumnPropertyExpression = guaranteeType(
      expression.parametersValues[0],
      AbstractPropertyExpression,
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: expects property expression in lambda body`,
    );
    const columnState = findProjectionColumnState(
      tdsColumnPropertyExpression,
      postFilterState,
    );

    // get operation value specification
    const value = expression.parametersValues[1];
    // create state
    postConditionState = new PostFilterConditionState(
      postFilterState,
      columnState,
      value,
      operator,
    );

    //post checks
    assertTrue(
      operator.isCompatibleWithPostFilterColumn(postConditionState),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: property is not compatible with post-filter operator`,
    );
    assertTrue(
      operator.isCompatibleWithConditionValue(postConditionState),
      `Operator '${operator.getLabel()}' not compatible with value specification ${value?.toString()}`,
    );
  }
  return postConditionState;
};

const processPostFilterTree = (
  expression: FunctionExpression,
  postFilterState: QueryBuilderPostFilterState,
  parentPostFilterNodeId: string | undefined,
): void => {
  const parentNode = parentPostFilterNodeId
    ? postFilterState.getNode(parentPostFilterNodeId)
    : undefined;
  if (
    matchFunctionName(expression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.AND,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.OR,
    ])
  ) {
    const groupNode = new QueryBuilderPostFilterTreeGroupNodeData(
      parentPostFilterNodeId,
      toGroupOperation(expression.functionName),
    );
    postFilterState.nodes.set(groupNode.id, groupNode);
    expression.parametersValues.forEach((postFilterExpression) =>
      processPostFilterTree(
        guaranteeType(
          postFilterExpression,
          FunctionExpression,
          `Can't process post-filter group expression: each child expression must be a function expression`,
        ),
        postFilterState,
        groupNode.id,
      ),
    );
    postFilterState.addNodeFromNode(groupNode, parentNode);
  } else {
    for (const operator of postFilterState.operators) {
      // NOTE: this allow plugin author to either return `undefined`
      const postFilterConditionState = operator.buildPostFilterConditionState(
        postFilterState,
        expression,
      );
      if (postFilterConditionState) {
        postFilterState.addNodeFromNode(
          new QueryBuilderPostFilterTreeConditionNodeData(
            undefined,
            postFilterConditionState,
          ),
          parentNode,
        );
        return;
      }
    }
    throw new UnsupportedOperationError(
      `Can't process post-filter expression: no compatible post-filter operator processer available from plugins`,
    );
  }
};

export const processTDSPostFilterExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const tdsState = queryBuilderState.fetchStructureState.implementation;
    const postFilterState = tdsState.postFilterState;
    const fetchStructureState = tdsState.fetchStructureState;
    const postFilterLambda = expression.parametersValues[1];
    assertType(
      postFilterLambda,
      LambdaFunctionInstanceValue,
      `Can't process post-filter expression: expects argument #1 to be a lambda function`,
    );

    assertType(
      fetchStructureState.implementation,
      QueryBuilderTDSState,
      `Can't process post-filter lambda: post-filter lambda must use projection fetch structure`,
    );
    assertTrue(
      Boolean(tdsState.projectionColumns.length),
      `Can't process post-filter lambda: post-filter lambda must have at least one projection column `,
    );
    const lambdaFunc = guaranteeNonNullable(
      postFilterLambda.values[0],
      `Can't process post-filter lambda: post-filter lambda function is missing`,
    );
    assertTrue(
      lambdaFunc.expressionSequence.length === 1,
      `Can't process post-filter lambda: only support post-filter lambda body with 1 expression`,
    );
    const rootExpression = guaranteeType(
      lambdaFunc.expressionSequence[0],
      FunctionExpression,
      `Can't process post-filter lambda: only support post-filter lambda body of type 'FunctionExpression'`,
    );
    assertTrue(
      lambdaFunc.functionType.parameters.length === 1,
      `Can't process post-filter lambda: only support post-filter lambda with 1 parameter`,
    );
    postFilterState.setLambdaParameterName(
      guaranteeType(
        lambdaFunc.functionType.parameters[0],
        VariableExpression,
        `Can't process post-filter lambda: only support filter() lambda with 1 parameter of type 'VariableExpression'`,
      ).name,
    );
    processPostFilterTree(rootExpression, postFilterState, undefined);

    tdsState.setShowPostFilterPanel(true);
    postFilterState.simplifyTree();
  }
};
