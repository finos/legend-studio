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

import { QueryLoaderState } from '@finos/legend-query-builder';
import { BaseQuerySetupStore } from './QuerySetupStore.js';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { PlainObject } from '@finos/legend-shared';
import { LEGEND_QUERY_USER_DATA_KEY } from '../__lib__/LegendQueryUserData.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import {
  QueryStorageState,
  persistQueryIds,
  removePersistedQuery,
} from './QueryEditorStore.js';

export class EditExistingQuerySetupStore extends BaseQuerySetupStore {
  queryLoaderState: QueryLoaderState;
  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, depotServerClient);
    const queryStorage = applicationStore.userDataService.getValue(
      LEGEND_QUERY_USER_DATA_KEY.RECENTLY_VIEWED_QUERIES,
    );
    const queryStorageState = QueryStorageState.create(
      queryStorage ? (queryStorage as PlainObject<QueryStorageState>) : {},
    );
    this.queryLoaderState = new QueryLoaderState(
      applicationStore,
      queryStorageState.recentQueries,
      persistQueryIds,
      removePersistedQuery,
    );
  }
}
