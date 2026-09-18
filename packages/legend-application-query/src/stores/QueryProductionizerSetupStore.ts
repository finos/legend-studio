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

import type { LightQuery } from '@finos/legend-graph';
import { QueryLoaderState } from '@finos/legend-query-builder';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import { parseProjectIdentifier } from '@finos/legend-storage';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl } from '../__lib__/LegendQueryNavigation.js';
import { BaseQuerySetupStore } from './QuerySetupStore.js';
import { LegendQueryUserDataHelper } from '../__lib__/LegendQueryUserDataHelper.js';
import { buildQueryLoaderLifecycleTelemetryHandlers } from '../__lib__/LegendQueryLifecycleTelemetry.js';
import { LegendQueryTelemetryHelper } from '../__lib__/LegendQueryTelemetryHelper.js';
import { quantifyList } from '@finos/legend-shared';

export class QueryProductionizerSetupStore extends BaseQuerySetupStore {
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
          this.loadQueryProductionizer(query).catch(
            applicationStore.alertUnhandledError,
          );
        },
        fetchDefaultQueries: () =>
          this.graphManagerState.graphManager.getQueries(
            LegendQueryUserDataHelper.getRecentlyViewedQueries(
              this.applicationStore.userDataService,
            ),
          ),
        generateDefaultQueriesSummaryText: (queries) =>
          queries.length
            ? `Showing ${quantifyList(
                queries,
                'recently viewed query',
                'recently viewed queries',
              )}`
            : `No recently viewed queries`,
        ...buildQueryLoaderLifecycleTelemetryHandlers(this.applicationStore, {
          onQueryDeleted: (queryId): void =>
            LegendQueryUserDataHelper.removeRecentlyViewedQuery(
              this.applicationStore.userDataService,
              queryId,
            ),
        }),
        handleFetchDefaultQueriesFailure: (): void =>
          LegendQueryUserDataHelper.removeRecentlyViewedQueries(
            this.applicationStore.userDataService,
          ),
      },
    );
  }

  async loadQueryProductionizer(selectedQuery: LightQuery): Promise<void> {
    // fetch project data
    const project = StoreProjectData.serialization.fromJson(
      await this.depotServerClient.getProject(
        selectedQuery.groupId,
        selectedQuery.artifactId,
      ),
    );

    // find the matching SDLC instance
    const projectIDPrefix = parseProjectIdentifier(project.projectId).prefix;
    const matchingSDLCEntry = this.applicationStore.config.studioInstances.find(
      (entry) => entry.sdlcProjectIDPrefix === projectIDPrefix,
    );
    if (matchingSDLCEntry) {
      this.applicationStore.alertService.setBlockingAlert({
        message: `Loading query...`,
        prompt: 'Please do not close the application',
        showLoading: true,
      });
      // emitted at the actual handoff to studio — the setup landing action
      // that lands us on this route is upstream and may be abandoned before
      // the user picks a query, so emitting here counts real launches only
      LegendQueryTelemetryHelper.logEvent_ProductionizeQueryLaunched(
        this.applicationStore.telemetryService,
        {
          query: {
            id: selectedQuery.id,
            name: selectedQuery.name,
            groupId: selectedQuery.groupId,
            artifactId: selectedQuery.artifactId,
            versionId: selectedQuery.versionId,
          },
        },
      );
      this.applicationStore.navigationService.navigator.goToAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl(
          matchingSDLCEntry.url,
          selectedQuery.id,
        ),
      );
    } else {
      this.applicationStore.notificationService.notifyWarning(
        `Can't find the corresponding SDLC instance to productionize the query`,
      );
    }
  }
}
