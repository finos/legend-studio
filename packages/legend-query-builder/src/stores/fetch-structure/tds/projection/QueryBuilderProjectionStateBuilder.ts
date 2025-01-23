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
  PrimitiveInstanceValue,
  LambdaFunctionInstanceValue,
  ColSpecInstanceValue,
} from '@finos/legend-graph';
import {
  assertNonNullable,
  assertTrue,
  assertType,
  guaranteeIsNumber,
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
import { type QueryBuilderState } from '../../../QueryBuilderState.js';
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

const validateTDSProjectPrecedingExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
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
};

// process project() that uses col()
const processTDSProjectColExpression = (
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
    expression.parametersValues.length === 2,
    `Can't process project() expression: project() expects 2 arguments`,
  );

  validateTDSProjectPrecedingExpression(
    expression,
    queryBuilderState,
    parentLambda,
  );

  // check columns
  const columnLambdas = expression.parametersValues[1];
  if (columnLambdas instanceof CollectionInstanceValue) {
    columnLambdas.values.map((value) =>
      QueryBuilderValueSpecificationProcessor.processChild(
        value,
        expression,
        parentLambda,
        queryBuilderState,
      ),
    );
  } else {
    assertType(
      columnLambdas,
      SimpleFunctionExpression,
      `Can't process project() expression: project() expects argument #1 to be a function expression`,
    );
    QueryBuilderValueSpecificationProcessor.processChild(
      columnLambdas,
      expression,
      parentLambda,
      queryBuilderState,
    );
  }
};

/**
 *  process project()
 *  variants could be:
 *  Person.all()->project([x|x.firmID], ['Id'])
 *  Person.all()->project(x|x.firmID, ['Id'])
 *  Person.all()->project([x|x.firmID], 'Id')
 *  Person.all()->project(x|x.firmID, 'Id')
 *  Person.all()->project(col({p:my::Person[1]|$p.firmID}, 'Id'))
 *  Person.all()->project([ col({p:my::Person[1]|$p.firmID}, 'Id') ])
 */
export const processTDSProjectExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  if (expression.parametersValues.length === 2) {
    processTDSProjectColExpression(expression, queryBuilderState, parentLambda);
  } else {
    // update fetch-structure
    queryBuilderState.fetchStructureState.changeImplementation(
      FETCH_STRUCTURE_IMPLEMENTATION.TABULAR_DATA_STRUCTURE,
    );

    // check parameters
    assertTrue(
      expression.parametersValues.length === 3,
      `Can't process project() expression: project() expects 3 arguments`,
    );

    // check preceding expression
    validateTDSProjectPrecedingExpression(
      expression,
      queryBuilderState,
      parentLambda,
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
    let aliases: string[] = [];
    if (columnAliases instanceof CollectionInstanceValue) {
      assertType(
        columnAliases,
        CollectionInstanceValue,
        `Can't process project() expression: project() expects argument #2 to be a collection or a string`,
      );
      aliases = columnAliases.values
        .map(extractNullableStringFromInstanceValue)
        .filter(isNonNullable);
    } else {
      assertType(
        columnAliases,
        PrimitiveInstanceValue,
        `Can't process project() expression: project() expects argument #2 to be a collection or string`,
      );
      aliases = [columnAliases.values[0] as string];
    }
    assertTrue(
      columnLambdas.values.length === aliases.length,
      `Can't process project() expression: number of aliases does not match the number of columns`,
    );

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
  }
};

export const processTDSProjectionColumnPropertyExpression = (
  expression: AbstractPropertyExpression,
  columnName: string | undefined,
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
        queryBuilderState,
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
    if (columnName) {
      columnState.setColumnName(columnName);
    }
    // NOTE: technically we should set the lambda parameter name when we process
    // the lambda, not when we process the lambda body like this, but that requires
    // some setup, so it's easier to do it here. The validation of this should have
    // already been taken care of by the builder.
    columnState.setLambdaParameterName(currentPropertyExpression.name);
  }
};

export const processTDSProjectionDerivationExpression = (
  value: INTERNAL__UnknownValueSpecification,
  columnName: string | undefined,
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
    if (columnName) {
      columnState.setColumnName(columnName);
    }
  }
};

export const processTDSColExpression = (
  expression: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
): void => {
  // check parameters
  assertTrue(
    expression.parametersValues.length === 2,
    `Can't process col() func expression: col() expects 2 argument`,
  );
  // check preceding expression
  const lambdaFunc = guaranteeType(
    expression.parametersValues[0],
    LambdaFunctionInstanceValue,
    `Can't process col() func expressionn: only support col() immediately following an lambda function`,
  );
  const colNameInstance = guaranteeType(
    expression.parametersValues[1],
    PrimitiveInstanceValue,
    `Can't process col() func expression: the #2 argument of col() should be a string`,
  );
  processTDSProjectionColumnPropertyExpression(
    guaranteeType(
      lambdaFunc.values[0]?.expressionSequence[0],
      AbstractPropertyExpression,
      `Can't process col() func expression: lambda function of col() should contain AbstractPropertyExpression`,
    ),
    colNameInstance.values[0] as string,
    queryBuilderState,
  );
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const tdsState = queryBuilderState.fetchStructureState.implementation;
    tdsState.setUseColFunc(true);
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

export const processTDSSliceExpression = (
  exp: SimpleFunctionExpression,
  queryBuilderState: QueryBuilderState,
  parentLambda: LambdaFunction,
): void => {
  // check parameters
  assertTrue(
    exp.parametersValues.length === 3,
    `Can't process slice() expression: slice() expects 2 argument`,
  );

  // check preceding expression
  const precedingExpression = guaranteeType(
    exp.parametersValues[0],
    SimpleFunctionExpression,
    `Can't process slice() expression: only support slice() immediately following an expression`,
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
    `Can't process slice() expression: only support slice() in TDS expression`,
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
    const tdsState = queryBuilderState.fetchStructureState.implementation;
    const start = guaranteeIsNumber(
      guaranteeType(
        exp.parametersValues[1],
        PrimitiveInstanceValue,
        'Can`t process slice() function: first param should be a primitive instance value',
      ).values[0],
      'Can`t process slice() function: first param should be a number primitive instance value',
    );

    const end = guaranteeIsNumber(
      guaranteeType(
        exp.parametersValues[2],
        PrimitiveInstanceValue,
        'Can`t process slice() function: first param should be a primitive instance value',
      ).values[0],
      'Can`t process slice() function: first param should be a number primitive instance value',
    );
    tdsState.resultSetModifierState.setSlice([start, end]);
  }
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
    `Can't process ${functionName}() expression: ${functionName}() expects one argument`,
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

export const processRelationSortDirectionExpression = (
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
    `Can't process ${functionName}() expression: ${functionName}() expects one argument`,
  );

  // build state
  if (
    queryBuilderState.fetchStructureState.implementation instanceof
    QueryBuilderTDSState
  ) {
    const projectionState =
      queryBuilderState.fetchStructureState.implementation;
    const value = guaranteeType(
      expression.parametersValues[0],
      ColSpecInstanceValue,
    );
    assertTrue(
      value.values.length === 1,
      `Can't process ${functionName}() expression: Col Spec Instance Value expects one value`,
    );
    const sortColumnName = guaranteeNonNullable(
      value.values[0],
      `Col Spec value expected in Col Spec Instance Value`,
    ).name;
    const queryBuilderProjectionColumnState = projectionState.tdsColumns.find(
      (e) => e.columnName === sortColumnName,
    );
    if (queryBuilderProjectionColumnState) {
      const sortColumnState = new SortColumnState(
        queryBuilderProjectionColumnState,
      );
      sortColumnState.sortType = matchFunctionName(
        functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.RELATION_ASC,
      )
        ? COLUMN_SORT_TYPE.ASC
        : COLUMN_SORT_TYPE.DESC;
      projectionState.resultSetModifierState.addSortColumn(sortColumnState);
    }
  }
};
