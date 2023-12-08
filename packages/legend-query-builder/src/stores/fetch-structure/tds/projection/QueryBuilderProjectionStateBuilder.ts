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
  type INTERNAL__UnknownValueSpecification,
  type ValueSpecification,
  type LambdaFunction,
  AbstractPropertyExpression,
  CollectionInstanceValue,
  DerivedProperty,
  matchFunctionName,
  RawLambda,
  SimpleFunctionExpression,
  V1_deserializeRawValueSpecification,
  V1_RawLambda,
  VariableExpression,
} from '@finos/legend-graph';
import {
  assertNonNullable,
  assertTrue,
  assertType,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import {
  COLUMN_SORT_TYPE,
  QUERY_BUILDER_SUPPORTED_FUNCTIONS,
  QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS,
} from '../../../../graph/QueryBuilderMetaModelConst.js';
import type { QueryBuilderState } from '../../../QueryBuilderState.js';
import { QueryBuilderValueSpecificationProcessor } from '../../../QueryBuilderStateBuilder.js';
import {
  extractNullableNumberFromInstanceValue,
  extractNullableStringFromInstanceValue,
  validatePropertyExpressionChain,
} from '../../../QueryBuilderValueSpecificationHelper.js';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../../QueryBuilderFetchStructureImplementationState.js';
import {
  QueryBuilderDerivationProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionColumnState.js';
import { QueryBuilderTDSState } from '../QueryBuilderTDSState.js';
import { SortColumnState } from '../QueryResultSetModifierState.js';

export const processTDSProjectExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // update fetch-structure
  queryBuilderState.fetchStructureState.changeImplementation(
    FETCH_STRUCTURE_IMPLEMENTATION.TABULAR_DATA_STRUCTURE,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 3,
    `Can't process project() expression: project() expects 2 arguments`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process project() expression: only support project() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS,
      QUERY_BUILDER_SUPPORTED_GET_ALL_FUNCTIONS.GET_ALL_VERSIONS_IN_RANGE,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.WATERMARK,
    ]),
    `Can't process project() expression: only support project() immediately following either getAll(), filter(), or forWatermark()`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // check columns
  const columnLambdas = expression.parametersValues[1];
  assertType(
    columnLambdas,
    CollectionInstanceValue,
    `Can't process project() expression: project() expects argument #1 to be a collection`,
  );
  columnLambdas.values.map((value) =>
    QueryBuilderValueSpecificationProcessor.processChild(
      value,
      expression,
      parentLambda,
      queryBuilderState,
    ),
  );

  // check column aliases
  const columnAliases = expression.parametersValues[2];
  assertType(
    columnAliases,
    CollectionInstanceValue,
    `Can't process project() expression: project() expects argument #2 to be a collection`,
  );
  assertTrue(
    columnLambdas.values.length === columnAliases.values.length,
    `Can't process project() expression: number of aliases does not match the number of columns`,
  );
  const aliases = columnAliases.values
    .map(extractNullableStringFromInstanceValue)
    .filter(isNonNullable);

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const tdsState = queryBuilderState.fetchStructureState.implementation;
    tdsState.projectionColumns.forEach((column, idx) =>
      column.setColumnName(aliases[idx] as string),
    );
  }
};

export const processTDSProjectionColumnPropertyExpression = (
  expression: AbstractPropertyExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const tdsState = queryBuilderState.fetchStructureState.implementation;
    // NOTE: we do this before creating the projection state, as we will
    // auto-fill arguments for derived properties when missing as part of building
    // the property expression state.
    let currentPropertyExpression: ValueSpecification = expression;
    while (currentPropertyExpression instanceof AbstractPropertyExpression) {
      const propertyExpression = currentPropertyExpression;
      validatePropertyExpressionChain(
        currentPropertyExpression,
        queryBuilderState.graphManagerState.graph,
      );
      currentPropertyExpression = guaranteeNonNullable(
        currentPropertyExpression.parametersValues[0],
      );
      // here we just do a simple check to ensure that if we encounter derived properties
      // the number of parameters and arguments provided match
      if (propertyExpression.func.value instanceof DerivedProperty) {
        assertTrue(
          (Array.isArray(propertyExpression.func.value.parameters)
            ? propertyExpression.func.value.parameters.length
            : 0) ===
            propertyExpression.parametersValues.length - 1,
          `Can't process property expression: derived property '${propertyExpression.func.value.name}' expects number of provided arguments to match number of parameters`,
        );
      }
      // Take care of chains of subtype (a pattern that is not useful, but we want to support and rectify)
      // $x.employees->subType(@Person)->subType(@Staff)
      while (
        currentPropertyExpression instanceof SimpleFunctionExpression &&
        matchFunctionName(
          currentPropertyExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.SUBTYPE,
        )
      ) {
        currentPropertyExpression = guaranteeNonNullable(
          currentPropertyExpression.parametersValues[0],
        );
      }
    }
    assertType(
      currentPropertyExpression,
      VariableExpression,
      `Can't process property expression: expects expression root to be a variable`,
    );

    const columnState = new QueryBuilderSimpleProjectionColumnState(
      tdsState,
      expression,
      false,
    );

    tdsState.addColumn(columnState, { skipSorting: true });

    // NOTE: technically we should set the lambda parameter name when we process
    // the lambda, not when we process the lambda body like this, but that requires
    // some setup, so it's easier to do it here. The validation of this should have
    // already been taken care of by the builder.
    columnState.setLambdaParameterName(currentPropertyExpression.name);
  }
};

export const processTDSProjectionDerivationExpression = (
  value: INTERNAL__UnknownValueSpecification,
  parentExpression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const projectionState =
      queryBuilderState.fetchStructureState.implementation;
    const rawLambdaProtocol = returnUndefOnError(() =>
      guaranteeType(
        V1_deserializeRawValueSpecification(value.content),
        V1_RawLambda,
      ),
    );
    assertNonNullable(
      rawLambdaProtocol,
      `Can't process unknown value: only support ${parentExpression.functionName}() column expression as a lambda`,
    );

    const columnState = new QueryBuilderDerivationProjectionColumnState(
      projectionState,
      new RawLambda(rawLambdaProtocol.parameters, rawLambdaProtocol.body),
    );
    projectionState.addColumn(columnState, { skipSorting: true });
  }
};

export const processTDSTakeExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process take() expression: take() expects 1 argument`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process take() expression: only support take() immediately following an expression`,
  );

  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
    ]),
    `Can't process take() expression: only support take() in TDS expression`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const projectionState =
      queryBuilderState.fetchStructureState.implementation;
    const takeValue = extractNullableNumberFromInstanceValue(
      guaranteeNonNullable(expression.parametersValues[1]),
    );
    projectionState.resultSetModifierState.setLimit(takeValue);
  }
};

export const processTDSDistinctExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check parameters
  assertTrue(
    expression.parametersValues.length === 1,
    `Can't process disctinct() expression: distinct() expects no parameter`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process distinct() expression: only support distinct() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
    ]),
    `Can't process distinct() expression: only support distinct() in TDS expression`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const projectionState =
      queryBuilderState.fetchStructureState.implementation;
    projectionState.resultSetModifierState.distinct = true;
  }
};

export const processTDSSortExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process sort() expression: sort() expects 1 argument`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    expression.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process sort() expression: only support sort() immediately following an expression`,
  );
  assertTrue(
    matchFunctionName(precedingExpression.functionName, [
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_TAKE,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_DISTINCT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_PROJECT,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_GROUP_BY,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_FILTER,
      QUERY_BUILDER_SUPPORTED_FUNCTIONS.OLAP_GROUPBY,
    ]),
    `Can't process sort() expression: only support sort() in TDS expression`,
  );
  QueryBuilderValueSpecificationProcessor.process(
    precedingExpression,
    parentLambda,
    queryBuilderState,
  );

  // check sort configuration
  const sortLambdas = expression.parametersValues[1];
  assertType(
    sortLambdas,
    CollectionInstanceValue,
    `Can't process sort() expression: sort() argument should be a collection`,
  );
  sortLambdas.values.map((value) =>
    QueryBuilderValueSpecificationProcessor.processChild(
      value,
      expression,
      parentLambda,
      queryBuilderState,
    ),
  );
};

export const processTDSSortDirectionExpression = (
  expression: SimpleFunctionExpression,
  parentExpression: SimpleFunctionExpression | undefined,
  queryBuilderState: QueryBuilderState,
): void => {
  const functionName = expression.functionName;

  // check parent expression
  assertTrue(
    Boolean(
      parentExpression &&
        matchFunctionName(
          parentExpression.functionName,
          QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_SORT,
        ),
    ),
    `Can't process ${functionName}() expression: only support ${functionName}() used within a sort() expression`,
  );

  // check parameters
  assertTrue(
    expression.parametersValues.length === 1,
    `Can't process ${functionName}() expression: ${functionName}() expects no argument`,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const projectionState =
      queryBuilderState.fetchStructureState.implementation;
    const sortColumnName = extractNullableStringFromInstanceValue(
      guaranteeNonNullable(expression.parametersValues[0]),
    );
    const queryBuilderProjectionColumnState = projectionState.tdsColumns.find(
      (e) => e.columnName === sortColumnName,
    );
    if (queryBuilderProjectionColumnState) {
      const sortColumnState = new SortColumnState(
        queryBuilderProjectionColumnState,
      );
      sortColumnState.sortType = matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.TDS_ASC,
      )
        ? COLUMN_SORT_TYPE.ASC
        : COLUMN_SORT_TYPE.DESC;
      projectionState.resultSetModifierState.addSortColumn(sortColumnState);
    }
  }
};
