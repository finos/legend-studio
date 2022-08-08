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
  type AbstractPropertyExpression,
  type ExecutionResult,
  type ValueSpecification,
  PrimitiveInstanceValue,
  PRIMITIVE_TYPE,
  TdsExecutionResult,
} from '@finos/legend-graph';
import { guaranteeType, isNonNullable, isString } from '@finos/legend-shared';
import { QueryBuilderPostFilterOperator_StartWith } from './postFilterOperators/QueryBuilderPostFilterOperator_StartWith.js';
import type { QueryBuilderAggregateColumnState } from './QueryBuilderAggregationState.js';
import {
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from './QueryBuilderPostFilterState.js';
import {
  QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './QueryBuilderProjectionState.js';
import { QueryBuilderState } from './QueryBuilderState.js';

const SEARCH_TAKE = 200;
const START_LENGTH = 2;

const createAndSetupQueryBuilderStateForTypeAhead = (
  queryBuilderState: QueryBuilderState,
): QueryBuilderState => {
  // builderState to build dummy query
  const builderState = new QueryBuilderState(
    queryBuilderState.applicationStore,
    queryBuilderState.graphManagerState,
    queryBuilderState.mode,
  );
  // setup
  builderState.querySetupState = queryBuilderState.querySetupState;
  // result modifiers
  builderState.resultSetModifierState.distinct = true;
  builderState.resultSetModifierState.limit = SEARCH_TAKE;
  return builderState;
};

const buildColumnTypeAheadQuery = (
  builderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): QueryBuilderState => {
  // projection column
  let projectionState;
  if (columnState instanceof QueryBuilderProjectionColumnState) {
    projectionState = columnState;
  } else {
    projectionState = columnState.projectionColumnState;
    const aggregationState =
      builderState.fetchStructureState.projectionState.aggregationState;
    aggregationState.columns = [columnState];
  }
  builderState.fetchStructureState.projectionState.columns = [projectionState];
  // post filter
  const postConditionState = new PostFilterConditionState(
    builderState.postFilterState,
    columnState,
    value,
    new QueryBuilderPostFilterOperator_StartWith(),
  );
  const postFilterNode = new QueryBuilderPostFilterTreeConditionNodeData(
    undefined,
    postConditionState,
  );
  builderState.postFilterState.addNodeFromNode(postFilterNode, undefined);
  return builderState;
};

export const buildPropertyTypeAheadQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  value: ValueSpecification | undefined,
): QueryBuilderState => {
  // builderState to build dummy query
  const builderState =
    createAndSetupQueryBuilderStateForTypeAhead(queryBuilderState);
  const projectionState = new QueryBuilderSimpleProjectionColumnState(
    builderState.fetchStructureState.projectionState,
    propertyExpression,
    false,
  );
  return buildColumnTypeAheadQuery(builderState, projectionState, value);
};

export const buildProjectionColumnTypeAheadQuery = (
  queryBuilderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): QueryBuilderState => {
  // builderState to build dummy query
  const builderState =
    createAndSetupQueryBuilderStateForTypeAhead(queryBuilderState);
  return buildColumnTypeAheadQuery(builderState, columnState, value);
};

export const buildTypeAheadOptions = (result: ExecutionResult): string[] => {
  const tdsResult = guaranteeType(
    result,
    TdsExecutionResult,
    'Type ahead search is only supported for tds result sets',
  );
  const options: string[] = [];
  tdsResult.result.rows
    .map((r) => r.values[0])
    .filter(isNonNullable)
    .forEach((r) => {
      if (isString(r)) {
        options.push(r);
      }
    });
  return options;
};

export const performTypeAhead = (
  val: ValueSpecification | undefined,
): boolean => {
  if (val instanceof PrimitiveInstanceValue) {
    const _type = val.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING: {
        const value = val.values[0] as string;
        return value.length >= START_LENGTH;
      }
      default:
        return false;
    }
  }
  return false;
};
