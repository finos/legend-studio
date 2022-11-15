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
  type LambdaFunction,
  GraphFetchTreeInstanceValue,
  matchFunctionName,
  RootGraphFetchTree,
  SimpleFunctionExpression,
} from '@finos/legend-graph';
import { assertTrue, guaranteeType } from '@finos/legend-shared';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '../../../graphManager/QueryBuilderSupportedFunctions.js';
import type { QueryBuilderState } from '../../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../../QueryBuilderStateBuilder.js';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../QueryBuilderFetchStructureImplementationState.js';
import { QueryBuilderGraphFetchTreeState } from './QueryBuilderGraphFetchTreeState.js';
import { buildGraphFetchTreeData } from './QueryBuilderGraphFetchTreeUtil.js';

export const processGraphFetchExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  const functionName = expression.functionName;

  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process ${functionName}() expression: ${functionName}() expects 1 argument`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process ${functionName}() expression: only support ${functionName}() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_ALL,
    ]),
    `Can't process ${functionName}(): only support ${functionName}() immediately following either getAll() or filter()`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderGraphFetchTreeState
  ) {
    const graphFetchTreeState =
      queryBuilderState.fetchStructureState.implementation;
    graphFetchTreeState.setChecked(
      matchFunctionName(
        expression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
      ),
    );
  }
};

export const processGraphFetchSerializeExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // update fetch-structure
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process serialize() expression: serialize() expects 1 argument`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process serialize() expression: only support serialize() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.GRAPH_FETCH_CHECKED,
    ]),
    `Can't process serialize() expression: only support serialize() in graph-fetch expression`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderGraphFetchTreeState
  ) {
    const graphFetchTreeState =
      queryBuilderState.fetchStructureState.implementation;
    const graphFetchTree = guaranteeType(
      expression.parametersValues[1],
      GraphFetchTreeInstanceValue,
      `Can't process serialize() expression: serialize() graph-fetch is missing`,
    );
    const graphFetchTreeRoot = guaranteeType(
      graphFetchTree.values[0],
      RootGraphFetchTree,
      `Can't process serialize() expression: serialize() graph-fetch tree root is missing`,
    );
    graphFetchTreeState.setGraphFetchTree(
      buildGraphFetchTreeData(graphFetchTreeRoot),
    );
  }
};
