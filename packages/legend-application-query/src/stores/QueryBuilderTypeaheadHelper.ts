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
  type RawLambda,
} from '@finos/legend-graph';
import { guaranteeType, isNonNullable, isString } from '@finos/legend-shared';
import { QueryBuilderPostFilterOperator_StartWith } from './fetch-structure/projection/post-filter/operators/QueryBuilderPostFilterOperator_StartWith.js';
import type { QueryBuilderAggregateColumnState } from './fetch-structure/projection/aggregation/QueryBuilderAggregationState.js';
import {
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from './fetch-structure/projection/post-filter/QueryBuilderPostFilterState.js';
import {
  QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './fetch-structure/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { QueryBuilderProjectionState } from './fetch-structure/projection/QueryBuilderProjectionState.js';

const TYPEAHEAD_TAKE_LIMIT = 10;
const START_LENGTH = 3;

const createAndSetupQueryBuilderStateForTypeahead = (
  queryBuilderState: QueryBuilderState,
): QueryBuilderState => {
  const builderState = queryBuilderState.cloneQueryBuilderState();
  builderState.querySetupState = queryBuilderState.querySetupState;
  const projectionState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderProjectionState,
  );
  projectionState.resultSetModifierState.distinct = true;
  projectionState.resultSetModifierState.limit = TYPEAHEAD_TAKE_LIMIT;
  return builderState;
};

const buildColumnTypeaheadQuery = (
  builderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): RawLambda => {
  const projectionState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderProjectionState,
  );
  let projectionColumnState;
  if (columnState instanceof QueryBuilderProjectionColumnState) {
    projectionColumnState = columnState;
  } else {
    projectionColumnState = columnState.projectionColumnState;
    const aggregationState = projectionState.aggregationState;
    aggregationState.columns = [columnState];
  }
  projectionState.columns = [projectionColumnState];
  const postConditionState = new PostFilterConditionState(
    projectionState.postFilterState,
    columnState,
    value,
    new QueryBuilderPostFilterOperator_StartWith(),
  );
  const postFilterNode = new QueryBuilderPostFilterTreeConditionNodeData(
    undefined,
    postConditionState,
  );
  projectionState.postFilterState.addNodeFromNode(postFilterNode, undefined);
  return builderState.resultState.buildExecutionRawLambda();
};

export const buildPropertyTypeaheadQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  value: ValueSpecification | undefined,
): RawLambda => {
  const builderState =
    createAndSetupQueryBuilderStateForTypeahead(queryBuilderState);
  const projectionState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderProjectionState,
  );
  const columnState = new QueryBuilderSimpleProjectionColumnState(
    projectionState,
    propertyExpression,
    false,
  );
  return buildColumnTypeaheadQuery(builderState, columnState, value);
};

export const buildProjectionColumnTypeaheadQuery = (
  queryBuilderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): RawLambda => {
  const builderState =
    createAndSetupQueryBuilderStateForTypeahead(queryBuilderState);
  return buildColumnTypeaheadQuery(builderState, columnState, value);
};

export const buildTypeaheadOptions = (result: ExecutionResult): string[] => {
  const tdsResult = guaranteeType(
    result,
    TdsExecutionResult,
    'Typeahead search is only supported for TDS result sets',
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

export const performTypeahead = (
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
