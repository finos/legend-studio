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
  type ValueSpecification,
} from '@finos/legend-graph';
import {
  assertTrue,
  assertType,
  guaranteeIsString,
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { QueryBuilderDerivationProjectionColumnState } from '../projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderTDSColumnState } from '../QueryBuilderTDSColumnState.js';
import {
  getTDSColumnDerivedProperyFromType,
  getTDSColumnState,
} from '../QueryBuilderTDSHelper.js';
import type { QueryBuilderPostFilterOperator } from './QueryBuilderPostFilterOperator.js';
import {
  type QueryBuilderPostFilterState,
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
  getTypeFromDerivedProperty,
  PostFilterValueSpecConditionValueState,
  PostFilterTDSColumnValueConditionValueState,
} from './QueryBuilderPostFilterState.js';
import {
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  TDS_COLUMN_GETTER,
} from '../../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderState } from '../../../QueryBuilderState.js';
import { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { toGroupOperation } from '../../../QueryBuilderGroupOperationHelper.js';
import { simplifyValueExpression } from '../../../QueryBuilderValueSpecificationHelper.js';
import { QueryBuilderAggregateColumnState } from '../aggregation/QueryBuilderAggregationState.js';

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
    } else if (
      columnState instanceof QueryBuilderAggregateColumnState &&
      columnState.projectionColumnState instanceof
        QueryBuilderDerivationProjectionColumnState
    ) {
      const type = getTypeFromDerivedProperty(
        tdsColumnGetter,
        postFilterState.tdsState.queryBuilderState.graphManagerState.graph,
      );
      if (type) {
        columnState.handleUsedPostFilterType(type);
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

const buildPostFilterConditionValueState = (
  rightVal: ValueSpecification | undefined,
  conditionState: PostFilterConditionState,
): void => {
  if (rightVal instanceof AbstractPropertyExpression) {
    const rightCol = returnUndefOnError(() =>
      findProjectionColumnState(rightVal, conditionState.postFilterState),
    );
    if (rightCol) {
      conditionState.setRightConditionVal(
        new PostFilterTDSColumnValueConditionValueState(
          conditionState,
          rightCol,
        ),
      );
      return;
    }
  }
  const val = rightVal
    ? simplifyValueExpression(
        rightVal,
        conditionState.postFilterState.tdsState.queryBuilderState
          .observerContext,
      )
    : undefined;
  conditionState.setRightConditionVal(
    new PostFilterValueSpecConditionValueState(conditionState, val),
  );
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
    const paramValue = expression.parametersValues[0];
    let columnState: QueryBuilderTDSColumnState;
    if (paramValue instanceof AbstractPropertyExpression) {
      columnState = findProjectionColumnState(paramValue, postFilterState);
    } else if (paramValue instanceof FunctionExpression) {
      const columnName = paramValue.functionName;
      columnState = getTDSColumnState(postFilterState.tdsState, columnName);
    } else {
      throw new UnsupportedOperationError(
        `Can't process ${extractElementNameFromPath(
          operatorFunctionFullPath,
        )}() expression: expects property expression in lambda body`,
      );
    }

    // get operation value specification
    const rightSide = expression.parametersValues[1];

    // create state
    postConditionState = new PostFilterConditionState(
      postFilterState,
      columnState,
      operator,
    );

    buildPostFilterConditionValueState(rightSide, postConditionState);

    //post checks
    assertTrue(
      operator.isCompatibleWithPostFilterColumn(postConditionState),
      `Can't process ${extractElementNameFromPath(
        operatorFunctionFullPath,
      )}() expression: property is not compatible with post-filter operator`,
    );
    assertTrue(
      operator.isCompatibleWithConditionValue(postConditionState),
      `Operator '${operator.getLabel()}' not compatible with value specification ${rightSide?.toString()}`,
    );
  }
  return postConditionState;
};

const processPostFilterTree = (
  expression: FunctionExpression,
  postFilterState: QueryBuilderPostFilterState,
  parentPostFilterNodeId: string | undefined,
): void => {
  // // NOTE: This checks if the expression is a simple function expression of Minus
  // // since negative numbers are returned as a SimpleFunctionExpression of minus(number)
  // // rather than a PrimitiveInstanceValue of -number, so here
  // // we replace the parameter value of the expression directly with a PrimitiveInstanceValue
  // if (
  //   expression.parametersValues[1] instanceof SimpleFunctionExpression &&
  //   expression.parametersValues[1].functionName === MINUS_STRING &&
  //   expression.parametersValues[1].parametersValues[0] instanceof
  //     PrimitiveInstanceValue
  // ) {
  //   expression.parametersValues[1].parametersValues[0].values[0] =
  //     parseFloat(
  //       expression.parametersValues[1].parametersValues[0].values[0] as string,
  //     ) * -1;
  //   expression.parametersValues[1] =
  //     expression.parametersValues[1].parametersValues[0];
  // }

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
