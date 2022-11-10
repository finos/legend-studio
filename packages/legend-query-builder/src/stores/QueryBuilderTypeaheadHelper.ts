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
  TDSExecutionResult,
  type RawLambda,
} from '@finos/legend-graph';
import { guaranteeType, isNonNullable, isString } from '@finos/legend-shared';
import { QueryBuilderPostFilterOperator_StartWith } from './fetch-structure/tds/post-filter/operators/QueryBuilderPostFilterOperator_StartWith.js';
import type { QueryBuilderAggregateColumnState } from './fetch-structure/tds/aggregation/QueryBuilderAggregationState.js';
import {
  PostFilterConditionState,
  QueryBuilderPostFilterTreeConditionNodeData,
} from './fetch-structure/tds/post-filter/QueryBuilderPostFilterState.js';
import {
  QueryBuilderProjectionColumnState,
  QueryBuilderSimpleProjectionColumnState,
} from './fetch-structure/tds/projection/QueryBuilderProjectionColumnState.js';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { QueryBuilderTDSState } from './fetch-structure/tds/QueryBuilderTDSState.js';
import {
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';

const initializeQueryBuilderState = (
  queryBuilderState: QueryBuilderState,
): QueryBuilderState => {
  const builderState = queryBuilderState.INTERNAL__toBasicQueryBuilderState();
  const tdsState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderTDSState,
  );
  tdsState.resultSetModifierState.distinct = true;
  tdsState.resultSetModifierState.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
  return builderState;
};

const buildColumnTypeaheadQuery = (
  builderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): RawLambda => {
  const tdsState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderTDSState,
  );
  let projectionColumnState;
  if (columnState instanceof QueryBuilderProjectionColumnState) {
    projectionColumnState = columnState;
  } else {
    projectionColumnState = columnState.projectionColumnState;
    const aggregationState = tdsState.aggregationState;
    aggregationState.columns = [columnState];
  }
  tdsState.projectionColumns = [projectionColumnState];
  const postConditionState = new PostFilterConditionState(
    tdsState.postFilterState,
    columnState,
    value,
    new QueryBuilderPostFilterOperator_StartWith(),
  );
  const postFilterNode = new QueryBuilderPostFilterTreeConditionNodeData(
    undefined,
    postConditionState,
  );
  tdsState.postFilterState.addNodeFromNode(postFilterNode, undefined);
  return builderState.resultState.buildExecutionRawLambda();
};

export const buildPropertyTypeaheadQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  value: ValueSpecification | undefined,
): RawLambda => {
  const builderState = initializeQueryBuilderState(queryBuilderState);
  const tdsState = guaranteeType(
    builderState.fetchStructureState.implementation,
    QueryBuilderTDSState,
  );
  const columnState = new QueryBuilderSimpleProjectionColumnState(
    tdsState,
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
  const builderState = initializeQueryBuilderState(queryBuilderState);
  return buildColumnTypeaheadQuery(builderState, columnState, value);
};

export const buildTypeaheadOptions = (result: ExecutionResult): string[] => {
  const tdsResult = guaranteeType(
    result,
    TDSExecutionResult,
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
        return value.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
      }
      default:
        return false;
    }
  }
  return false;
};
