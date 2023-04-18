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

import { isNonNullable, guaranteeNonNullable } from '@finos/legend-shared';
import {
  type ValueSpecification,
  type LambdaFunction,
  extractElementNameFromPath,
  SimpleFunctionExpression,
} from '@finos/legend-graph';
import { buildGenericLambdaFunctionInstanceValue } from '../QueryBuilderValueSpecificationHelper.js';
import { fromGroupOperation } from '../QueryBuilderGroupOperationHelper.js';
import {
  type QueryBuilderFilterState,
  QueryBuilderFilterTreeConditionNodeData,
  QueryBuilderFilterTreeGroupNodeData,
  type QueryBuilderFilterTreeNodeData,
} from './QueryBuilderFilterState.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../graph/QueryBuilderMetaModelConst.js';

const buildFilterConditionExpression = (
  filterState: QueryBuilderFilterState,
  node: QueryBuilderFilterTreeNodeData,
): ValueSpecification | undefined => {
  if (node instanceof QueryBuilderFilterTreeConditionNodeData) {
    return node.condition.operator.buildFilterConditionExpression(
      node.condition,
    );
  } else if (node instanceof QueryBuilderFilterTreeGroupNodeData) {
    const func = new SimpleFunctionExpression(
      extractElementNameFromPath(fromGroupOperation(node.groupOperation)),
    );
    const clauses = node.childrenIds
      .map((e) => filterState.nodes.get(e))
      .filter(isNonNullable)
      .map((e) => buildFilterConditionExpression(filterState, e))
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

export const buildFilterExpression = (
  filterState: QueryBuilderFilterState,
  lambdaFunction: LambdaFunction,
): void => {
  const filterConditionExpressions = filterState.rootIds
    .map((e) => guaranteeNonNullable(filterState.nodes.get(e)))
    .map((e) => buildFilterConditionExpression(filterState, e))
    .filter(isNonNullable);

  if (!filterConditionExpressions.length) {
    return;
  }
  // main filter expression
  const filterExpression = new SimpleFunctionExpression(
    extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER),
  );
  const currentExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
  );
  // param [0]
  filterExpression.parametersValues.push(currentExpression);
  // param [1]
  filterExpression.parametersValues.push(
    buildGenericLambdaFunctionInstanceValue(
      filterState.lambdaParameterName,
      filterConditionExpressions,
      filterState.queryBuilderState.graphManagerState.graph,
    ),
  );
  // reprocess filter as main expression
  lambdaFunction.expressionSequence[0] = filterExpression;
};
