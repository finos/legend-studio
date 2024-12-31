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
  QUERY_LOADER_DEFAULT_QUERY_SEARCH_LIMIT,
  QueryLoaderState,
} from '@finos/legend-query-builder';
import { BaseQuerySetupStore } from './QuerySetupStore.js';
import type { DepotServerClient } from '@finos/legend-server-depot';
import { quantifyList } from '@finos/legend-shared';
import { LegendQueryUserDataHelper } from '../__lib__/LegendQueryUserDataHelper.js';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { QuerySearchSpecification, type LightQuery } from '@finos/legend-graph';
import { generateExistingQueryEditorRoute } from '../__lib__/LegendQueryNavigation.js';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';

export class EditExistingQuerySetupStore extends BaseQuerySetupStore {
  readonly queryLoaderState: QueryLoaderState;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, depotServerClient);

    this.queryLoaderState = new QueryLoaderState(
      applicationStore,
      this.graphManagerState.graphManager,
      {
        loadQuery: (query: LightQuery): void => {
          this.queryLoaderState.setQueryLoaderDialogOpen(false);
          this.applicationStore.navigationService.navigator.goToLocation(
            generateExistingQueryEditorRoute(query.id),
            { ignoreBlocking: true },
          );
        },
        fetchDefaultQueries: async (): Promise<LightQuery[]> => {
          const recentQueries =
            await this.graphManagerState.graphManager.getQueries(
              LegendQueryUserDataHelper.getRecentlyViewedQueries(
                this.applicationStore.userDataService,
              ),
            );
          if (!recentQueries.length) {
            const searchSpecification = new QuerySearchSpecification();
            searchSpecification.limit = QUERY_LOADER_DEFAULT_QUERY_SEARCH_LIMIT;
            return this.graphManagerState.graphManager.searchQueries(
              searchSpecification,
            );
          }
          return recentQueries;
        },
        generateDefaultQueriesSummaryText: (queries) =>
          queries.length
            ? `Showing ${quantifyList(
                queries,
                'recently viewed query',
                'recently viewed queries',
              )}`
            : `No recently viewed queries`,
        onQueryDeleted: (queryId): void =>
          LegendQueryUserDataHelper.removeRecentlyViewedQuery(
            this.applicationStore.userDataService,
            queryId,
          ),
        onQueryRenamed: (query): void => {
          LegendQueryTelemetryHelper.logEvent_RenameQuerySucceeded(
            applicationStore.telemetryService,
            {
              query: {
                id: query.id,
                name: query.name,
                groupId: query.groupId,
                artifactId: query.artifactId,
                versionId: query.versionId,
              },
            },
          );
        },
        handleFetchDefaultQueriesFailure: (): void =>
          LegendQueryUserDataHelper.removeRecentlyViewedQueries(
            this.applicationStore.userDataService,
          ),
      },
    );
  }
}
