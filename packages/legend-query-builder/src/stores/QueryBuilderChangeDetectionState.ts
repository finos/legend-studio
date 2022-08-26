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
  type GeneratorFn,
  LogEvent,
  assertErrorThrown,
  IllegalStateError,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import { QUERY_BUILDER_CHANGE_DETECTION_EVENT } from '../graphManager/QueryBuilderHashUtils.js';
import type { QueryBuilderState } from './QueryBuilderState.js';

export class QueryBuilderChangeDetectionState {
  querybuilderState: QueryBuilderState;
  hashCode?: string | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      hashCode: observable,
      setHashCode: action,
      start: flow,
    });

    this.querybuilderState = queryBuilderState;
  }

  setHashCode(val: string | undefined): void {
    this.hashCode = val;
  }

  *start(): GeneratorFn<void> {
    // build hash indexes
    try {
      const hashesIndex = this.querybuilderState.hashCode;
      this.setHashCode(hashesIndex);
    } catch (error) {
      assertErrorThrown(error);
      this.querybuilderState.applicationStore.log.error(
        LogEvent.create(
          QUERY_BUILDER_CHANGE_DETECTION_EVENT.CHANGE_DETECTION_FAILURE,
        ),
        `Can't build hashes index for query builder`,
      );
      this.setHashCode(undefined);
      throw new IllegalStateError(error);
    }
  }
}
