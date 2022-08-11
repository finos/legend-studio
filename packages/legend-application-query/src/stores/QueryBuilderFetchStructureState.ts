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

import { action, makeAutoObservable } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { QueryBuilderGraphFetchTreeState } from './QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderProjectionState } from './QueryBuilderProjectionState.js';
import type { QueryBuilderAggregateOperator } from './QueryBuilderAggregationState.js';

export enum FETCH_STRUCTURE_MODE {
  PROJECTION = 'PROJECTION',
  GRAPH_FETCH = 'GRAPH_FETCH',
}

export class QueryBuilderFetchStructureState {
  queryBuilderState: QueryBuilderState;
  /**
   * NOTE: this is default to graph-fetch since if we default to projection
   * we will by default show an error when there are no columns specified
   * also, `getAll()` naturally works for graph-fetch case
   *
   * See https://github.com/finos/legend-studio/issues/1385
   */
  fetchStructureMode = FETCH_STRUCTURE_MODE.GRAPH_FETCH;
  projectionState: QueryBuilderProjectionState;
  graphFetchTreeState: QueryBuilderGraphFetchTreeState;

  constructor(
    queryBuilderState: QueryBuilderState,
    operators: QueryBuilderAggregateOperator[],
  ) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      setFetchStructureMode: action,
    });

    this.queryBuilderState = queryBuilderState;
    // TODO: we probably should modularize this a bit better
    // See https://github.com/finos/legend-studio/issues/731
    this.projectionState = new QueryBuilderProjectionState(
      queryBuilderState,
      operators,
    );
    this.graphFetchTreeState = new QueryBuilderGraphFetchTreeState(
      queryBuilderState,
    );
  }

  setFetchStructureMode(val: FETCH_STRUCTURE_MODE): void {
    this.fetchStructureMode = val;
  }

  isGraphFetchMode(): boolean {
    return this.fetchStructureMode === FETCH_STRUCTURE_MODE.GRAPH_FETCH;
  }

  isProjectionMode(): boolean {
    return this.fetchStructureMode === FETCH_STRUCTURE_MODE.PROJECTION;
  }
}
