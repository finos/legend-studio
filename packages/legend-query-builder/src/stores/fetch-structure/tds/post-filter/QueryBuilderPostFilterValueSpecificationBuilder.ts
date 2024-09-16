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
  extractElementNameFromPath,
  SimpleFunctionExpression,
  type LambdaFunction,
  type ValueSpecification,
} from '@finos/legend-graph';
import { guaranteeNonNullable, isNonNullable } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../../graph/QueryBuilderMetaModelConst.js';
import { fromGroupOperation } from '../../../QueryBuilderGroupOperationHelper.js';
import { buildGenericLambdaFunctionInstanceValue } from '../../../QueryBuilderValueSpecificationHelper.js';
import {
  QueryBuilderPostFilterTreeConditionNodeData,
  QueryBuilderPostFilterTreeGroupNodeData,
  type QueryBuilderPostFilterTreeNodeData,
  type QueryBuilderPostFilterState,
} from './QueryBuilderPostFilterState.js';

const buildPostFilterExpression = (
  postFilterState: QueryBuilderPostFilterState,
  node: QueryBuilderPostFilterTreeNodeData,
  parentExpression: LambdaFunction | undefined,
): ValueSpecification | undefined => {
  if (node instanceof QueryBuilderPostFilterTreeConditionNodeData) {
    return node.condition.operator.buildPostFilterConditionExpression(
      node.condition,
      parentExpression,
    );
  } else if (node instanceof QueryBuilderPostFilterTreeGroupNodeData) {
    const func = new SimpleFunctionExpression(
      extractElementNameFromPath(fromGroupOperation(node.groupOperation)),
    );
    const clauses = node.childrenIds
      .map((e) => postFilterState.nodes.get(e))
      .filter(isNonNullable)
      .map((e) =>
        buildPostFilterExpression(postFilterState, e, parentExpression),
      )
      .filter(isNonNullable);
    /**
     * NOTE: Due to a limitation (or perhaps design decision) in the engine, group operations
     * like and/or do not take more than 2 parameters, as such, if we have more than 2, we need
     * to create a chain of this operation to accomondate.
     *
     * This means that in the read direction, we might need to flatten the chains down to group with
     * multiple clauses. This means user's intended grouping will not be kept.
     */
    if (clauses.length > 2) {
      const firstClause = clauses[0] as ValueSpecification;
      let currentClause: ValueSpecification = clauses[
        clauses.length - 1
      ] as ValueSpecification;
      for (let i = clauses.length - 2; i > 0; --i) {
        const clause1 = clauses[i] as ValueSpecification;
        const clause2 = currentClause;
        const groupClause = new SimpleFunctionExpression(
          extractElementNameFromPath(fromGroupOperation(node.groupOperation)),
        );
        groupClause.parametersValues = [clause1, clause2];
        currentClause = groupClause;
      }
      func.parametersValues = [firstClause, currentClause];
    } else {
      func.parametersValues = clauses;
    }
    return func.parametersValues.length ? func : undefined;
  }
  return undefined;
};

export const appendPostFilter = (
  postFilterState: QueryBuilderPostFilterState,
  lambdaFunction: LambdaFunction,
): LambdaFunction => {
  const postFilterConditionExpressions = postFilterState.rootIds
    .map((node) => guaranteeNonNullable(postFilterState.nodes.get(node)))
    .map((_node) =>
      buildPostFilterExpression(postFilterState, _node, lambdaFunction),
    )
    .filter(isNonNullable);
  if (
    !postFilterConditionExpressions.length ||
    lambdaFunction.expressionSequence.length !== 1
  ) {
    return lambdaFunction;
  }
  const filterLambda = buildGenericLambdaFunctionInstanceValue(
    postFilterState.lambdaParameterName,
    postFilterConditionExpressions,
    postFilterState.tdsState.queryBuilderState.graphManagerState.graph,
  );
  // main filter expression
  const filterExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER),
  );
  const currentExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
  );
  filterExpression.parametersValues = [currentExpression, filterLambda];
  lambdaFunction.expressionSequence[0] = filterExpression;
  return lambdaFunction;
};
