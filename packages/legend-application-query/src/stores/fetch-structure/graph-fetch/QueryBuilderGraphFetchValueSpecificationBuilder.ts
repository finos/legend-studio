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
  GenericType,
  GenericTypeExplicitReference,
  matchFunctionName,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  SimpleFunctionExpression,
  TYPICAL_MULTIPLICITY_TYPE,
  type ValueSpecification,
  type LambdaFunction,
  RootGraphFetchTreeInstanceValue,
} from '@finos/legend-graph';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../QueryBuilder_Const.js';
import type { QueryBuilderState } from '../../QueryBuilderState.js';
import type { QueryBuilderGraphFetchTreeState } from './QueryBuilderGraphFetchTreeState.js';
import { isGraphFetchTreeDataEmpty } from './QueryBuilderGraphFetchTreeUtil.js';

const appendTakeLimit = (
  queryBuilderState: QueryBuilderState,
  lambda: LambdaFunction,
  previewLimit?: number | undefined,
): LambdaFunction => {
  if (!previewLimit) {
    return lambda;
  }
  const multiplicityOne =
    queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );
  if (lambda.expressionSequence.length === 1) {
    const func = lambda.expressionSequence[0];
    if (func instanceof SimpleFunctionExpression) {
      if (
        matchFunctionName(
          func.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
        )
      ) {
        const limit = new PrimitiveInstanceValue(
          GenericTypeExplicitReference.create(
            new GenericType(
              queryBuilderState.graphManagerState.graph.getPrimitiveType(
                PRIMITIVE_TYPE.INTEGER,
              ),
            ),
          ),
          multiplicityOne,
        );
        limit.values = [previewLimit];
        const takeFunction = new SimpleFunctionExpression(
          extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.TAKE),
          multiplicityOne,
        );

        // NOTE: `take()` does not work on `graphFetch()` or `serialize()` so we need to
        // put it next to `all()`
        const serializeFunction = func;
        const graphFetchFunc = guaranteeType(
          serializeFunction.parametersValues[0],
          SimpleFunctionExpression,
        );
        const getAllFunc = graphFetchFunc
          .parametersValues[0] as ValueSpecification;
        takeFunction.parametersValues[0] = getAllFunc;
        takeFunction.parametersValues[1] = limit;
        graphFetchFunc.parametersValues = [
          takeFunction,
          graphFetchFunc.parametersValues[1] as ValueSpecification,
        ];
        return lambda;
      }
    }
  }
  return lambda;
};

export const appendGraphFetch = (
  graphFetchTreeState: QueryBuilderGraphFetchTreeState,
  lambdaFunction: LambdaFunction,
  options?: {
    /**
     * Set queryBuilderState to `true` when we construct query for execution within the app.
     * queryBuilderState will make the lambda function building process overrides several query values, such as the row limit.
     */
    isBuildingExecutionQuery?: boolean | undefined;
    keepSourceInformation?: boolean | undefined;
  },
): void => {
  const queryBuilderState = graphFetchTreeState.queryBuilderState;
  const precedingExpression = guaranteeNonNullable(
    lambdaFunction.expressionSequence[0],
    `Can't build graph-fetch tree expression: preceding expression is not defined`,
  );
  const multiplicityOne =
    queryBuilderState.graphManagerState.graph.getTypicalMultiplicity(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
    );

  // build graph-fetch tree
  if (
    graphFetchTreeState.treeData &&
    !isGraphFetchTreeDataEmpty(graphFetchTreeState.treeData)
  ) {
    const graphFetchInstance = new RootGraphFetchTreeInstanceValue(
      multiplicityOne,
    );
    graphFetchInstance.values = [graphFetchTreeState.treeData.tree];
    const serializeFunction = new SimpleFunctionExpression(
      extractElementNameFromPath(QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE),
      multiplicityOne,
    );
    const graphFetchFunc = new SimpleFunctionExpression(
      graphFetchTreeState.isChecked
        ? extractElementNameFromPath(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
          )
        : extractElementNameFromPath(
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
          ),
      multiplicityOne,
    );

    graphFetchFunc.parametersValues = [precedingExpression, graphFetchInstance];
    serializeFunction.parametersValues = [graphFetchFunc, graphFetchInstance];
    lambdaFunction.expressionSequence[0] = serializeFunction;
  }

  // build result set modifier: i.e. preview limit
  if (options?.isBuildingExecutionQuery) {
    appendTakeLimit(
      queryBuilderState,
      lambdaFunction,
      queryBuilderState.resultState.previewLimit,
    );
  }
};
