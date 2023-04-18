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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { makeObservable, observable, action, computed } from 'mobx';
import { QUERY_BUILDER_STATE_HASH_STRUCTURE } from '../QueryBuilderStateHashUtils.js';
import type { QueryBuilderState } from '../QueryBuilderState.js';

export class QueryBuilderCheckEntitlementsState implements Hashable {
  readonly queryBuilderState: QueryBuilderState;
  isCheckingEntitlements = false;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      isCheckingEntitlements: observable,
      setIsCheckingEntitlements: action,
      hashCode: computed,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setIsCheckingEntitlements(val: boolean): void {
    this.isCheckingEntitlements = val;
  }

  get hashCode(): string {
    return hashArray([
      QUERY_BUILDER_STATE_HASH_STRUCTURE.CHECK_ENTITLEMENTS_STATE,
      this.isCheckingEntitlements,
    ]);
  }
}
