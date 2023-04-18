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
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
} from '@finos/legend-application';
import {
  type LightQuery,
  type QueryInfo,
  QuerySearchSpecification,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
} from '@finos/legend-shared';
import { parseProjectIdentifier } from '@finos/legend-storage';
import { flow, makeObservable, observable } from 'mobx';
import type { LegendQueryApplicationStore } from './LegendQueryBaseStore.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl } from '../__lib__/LegendQueryNavigation.js';
import { BaseQuerySetupStore } from './QuerySetupStore.js';

export class QueryProductionizerSetupStore extends BaseQuerySetupStore {
  readonly loadQueriesState = ActionState.create();
  readonly loadQueryState = ActionState.create();
  queries: LightQuery[] = [];
  currentQuery?: LightQuery | undefined;
  currentQueryInfo?: QueryInfo | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    super(applicationStore, depotServerClient);

    makeObservable(this, {
      queries: observable,
      currentQuery: observable,
      currentQueryInfo: observable,
      setCurrentQuery: flow,
      loadQueries: flow,
    });
  }

  async loadQueryProductionizer(): Promise<void> {
    if (!this.currentQuery) {
      return;
    }

    // fetch project data
    const project = ProjectData.serialization.fromJson(
      await this.depotServerClient.getProject(
        this.currentQuery.groupId,
        this.currentQuery.artifactId,
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
      this.applicationStore.navigationService.navigator.goToAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateStudioProductionizeQueryUrl(
          matchingSDLCEntry.url,
          this.currentQuery.id,
        ),
      );
    } else {
      this.applicationStore.notificationService.notifyWarning(
        `Can't find the corresponding SDLC instance to productionize the query`,
      );
    }
  }

  *setCurrentQuery(queryId: string | undefined): GeneratorFn<void> {
    if (queryId) {
      try {
        this.loadQueryState.inProgress();
        this.currentQuery =
          (yield this.graphManagerState.graphManager.getLightQuery(
            queryId,
          )) as LightQuery;
        const queryInfo =
          (yield this.graphManagerState.graphManager.getQueryInfo(
            queryId,
          )) as QueryInfo;
        queryInfo.content =
          (yield this.graphManagerState.graphManager.prettyLambdaContent(
            queryInfo.content,
          )) as string;
        this.currentQueryInfo = queryInfo;
      } catch (error) {
        assertErrorThrown(error);
        this.applicationStore.notificationService.notifyError(error);
      } finally {
        this.loadQueryState.reset();
      }
    } else {
      this.currentQuery = undefined;
    }
  }

  *loadQueries(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadQueriesState.inProgress();
    try {
      const searchSpecification = new QuerySearchSpecification();
      searchSpecification.searchTerm = isValidSearchString
        ? searchText
        : undefined;
      searchSpecification.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
      this.queries = (yield this.graphManagerState.graphManager.searchQueries(
        searchSpecification,
      )) as LightQuery[];
      this.loadQueriesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.loadQueriesState.fail();
    }
  }
}
