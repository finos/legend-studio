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
import type { QueryBuilderState } from './QueryBuilderState.js';

const TYPEAHEAD_TAKE_LIMIT = 10;
const START_LENGTH = 3;

const createAndSetupQueryBuilderStateForTypeahead = (
  queryBuilderState: QueryBuilderState,
): QueryBuilderState => {
  const builderState = queryBuilderState.createBareBuilderState();
  builderState.querySetupState = queryBuilderState.querySetupState;
  builderState.resultSetModifierState.distinct = true;
  builderState.resultSetModifierState.limit = TYPEAHEAD_TAKE_LIMIT;
  return builderState;
};

const buildColumnTypeaheadQuery = (
  builderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): QueryBuilderState => {
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

export const buildPropertyTypeaheadQuery = (
  queryBuilderState: QueryBuilderState,
  propertyExpression: AbstractPropertyExpression,
  value: ValueSpecification | undefined,
): QueryBuilderState => {
  const builderState =
    createAndSetupQueryBuilderStateForTypeahead(queryBuilderState);
  const projectionState = new QueryBuilderSimpleProjectionColumnState(
    builderState.fetchStructureState.projectionState,
    propertyExpression,
    false,
  );
  return buildColumnTypeaheadQuery(builderState, projectionState, value);
};

export const buildProjectionColumnTypeaheadQuery = (
  queryBuilderState: QueryBuilderState,
  columnState:
    | QueryBuilderProjectionColumnState
    | QueryBuilderAggregateColumnState,
  value: ValueSpecification | undefined,
): QueryBuilderState => {
  const builderState =
    createAndSetupQueryBuilderStateForTypeahead(queryBuilderState);
  return buildColumnTypeaheadQuery(builderState, columnState, value);
};

export const buildTypeaheadOptions = (result: ExecutionResult): string[] => {
  const tdsResult = guaranteeType(
    result,
    TdsExecutionResult,
    'Typeahead search is only supported for tds result sets',
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
