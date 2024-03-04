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

import { type RawLambda } from '@finos/legend-graph';
import {
  ActionState,
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { makeObservable, observable, computed, action } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';
import { QUERY_BUILDER_EVENT } from '../__lib__/QueryBuilderEvent.js';

export class QueryBuilderChangeHistoryState {
  readonly queryBuilderState: QueryBuilderState;
  readonly initState = ActionState.create();

  querySnapshotBuffer: RawLambda[] = [];
  currentQuery: RawLambda | undefined;
  pointer = -1;
  bufferSize = 10;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      currentQuery: observable,
      pointer: observable,
      querySnapshotBuffer: observable,
      initialize: action,
      undo: action,
      redo: action,
      setCurrentQuery: action,
      cacheNewQuery: action,
      canRedo: computed,
      canUndo: computed,
    });

    this.queryBuilderState = queryBuilderState;
  }

  get canRedo(): boolean {
    return this.pointer < this.querySnapshotBuffer.length - 1;
  }

  get canUndo(): boolean {
    return this.pointer > 0;
  }

  redo(): void {
    if (this.canRedo) {
      this.pointer = this.pointer + 1;
      const query = this.querySnapshotBuffer[this.pointer];
      this.setCurrentQuery(query);
      this.queryBuilderState.rebuildWithQuery(guaranteeNonNullable(query), {
        preserveParameterValues: true,
        preserveResult: true,
      });
    }
  }

  undo(): void {
    if (this.canUndo) {
      this.pointer = this.pointer - 1;
      const query = this.querySnapshotBuffer[this.pointer];
      this.setCurrentQuery(query);
      this.queryBuilderState.rebuildWithQuery(guaranteeNonNullable(query), {
        preserveParameterValues: true,
        preserveResult: true,
      });
    }
  }

  setCurrentQuery(query: RawLambda | undefined): void {
    this.currentQuery = query;
  }

  initialize(initialQuery: RawLambda): void {
    if (this.queryBuilderState.isQuerySupported) {
      this.initState.inProgress();
      this.currentQuery = initialQuery;
      this.querySnapshotBuffer.push(initialQuery);
      this.pointer = this.pointer + 1;
      this.initState.complete();
    }
  }

  cacheNewQuery(query: RawLambda): void {
    try {
      if (this.queryBuilderState.isQuerySupported) {
        if (query.hashCode !== this.currentQuery?.hashCode) {
          if (
            this.querySnapshotBuffer.length === this.bufferSize &&
            this.pointer === this.querySnapshotBuffer.length - 1
          ) {
            // only record 10 query snapshots
            this.querySnapshotBuffer = this.querySnapshotBuffer.slice(1);
          } else {
            this.querySnapshotBuffer = this.querySnapshotBuffer.slice(
              0,
              this.pointer + 1,
            );
          }
          this.querySnapshotBuffer.push(query);
          this.pointer = this.querySnapshotBuffer.length - 1;
          this.setCurrentQuery(query);
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.logService.error(
        LogEvent.create(QUERY_BUILDER_EVENT.CHANGE_HISTORY_ERROR),
        `Can't cache query in query builder change history buffer: ${error.message}`,
      );
    }
  }
}
