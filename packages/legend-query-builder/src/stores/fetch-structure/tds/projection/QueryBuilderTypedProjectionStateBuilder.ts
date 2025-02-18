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
  SimpleFunctionExpression,
  matchFunctionName,
  ColSpecArrayInstance,
} from '@finos/legend-graph';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../../QueryBuilderFetchStructureImplementationState.js';
import { assertTrue, assertType, guaranteeType } from '@finos/legend-shared';
import {
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type QueryBuilderState,
} from '../../../QueryBuilderState.js';
import {
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../../../../graph/QueryBuilderMetaModelConst.js';
import { QueryBuilderValueSpecificationProcessor } from '../../../QueryBuilderStateBuilder.js';

export const processTypedTDSProjectExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process typed project() expression: typed project() expects 2 arguments`,
  );
  // update fetch-structure
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.TABULAR_DATA_STRUCTURE,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process typed project() expression: only support typed project() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.WATERMARK,
    ]),
    `Can't process typed project() expression: only support typed project() immediately following either getAll(), filter(), or forWatermark()`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );
  // check columns
  const classInstance = expression.parametersValues[1];
  assertType(
    classInstance,
    ColSpecArrayInstance,
    `Can't process typed project() expression: typed project() expects argument #1 to be a ColSpec Array Instance`,
  );
  queryBuilderState.setLambdaWriteMode(
    QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
  );
  QueryBuilderValueSpecificationProcessor.processChild(
    classInstance,
    expression,
    parentLambda,
    queryBuilderState,
  );
};

export const isTypedProjectionExpression = (
  expression: SimpleFunctionExpression,
): boolean => {
  return (
    expression.functionName ===
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT ||
    (matchFunctionName(expression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_PROJECT,
    ]) &&
      expression.parametersValues.length === 2 &&
      expression.parametersValues[1] instanceof ColSpecArrayInstance)
  );
};
