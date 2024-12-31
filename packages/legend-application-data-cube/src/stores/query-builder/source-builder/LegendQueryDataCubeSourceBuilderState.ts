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
  assertErrorThrown,
  IllegalStateError,
  LogEvent,
} from '@finos/legend-shared';
import {
  QuerySearchSpecification,
  V1_Query,
  type LightQuery,
} from '@finos/legend-graph';
import {
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  QueryLoaderState,
} from '@finos/legend-query-builder';
import { action, makeObservable, observable, runInAction } from 'mobx';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import { RawLegendQueryDataCubeSource } from '../../model/LegendQueryDataCubeSource.js';
import type { LegendDataCubeNewQueryState } from '../LegendDataCubeNewQueryState.js';
import { APPLICATION_EVENT } from '@finos/legend-application';

export class LegendQueryDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  readonly queryLoaderState: QueryLoaderState;

  query?: LightQuery | undefined;
  queryCode?: string | undefined;

  constructor(newQueryState: LegendDataCubeNewQueryState) {
    super(newQueryState);

    makeObservable(this, {
      query: observable,
      unsetQuery: action,

      queryCode: observable,
    });

    this.queryLoaderState = new QueryLoaderState(
      this.application,
      newQueryState.engine.graphManager,
      {
        loadQuery: (query) => {
          this.setQuery(query).catch((error) =>
            this.engine.alertUnhandledError(error),
          );
        },
        decorateSearchSpecification: (val) => val,
        fetchDefaultQueries: async () => {
          const searchSpecification = new QuerySearchSpecification();
          searchSpecification.limit = QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT;
          return newQueryState.engine.graphManager.searchQueries(
            QuerySearchSpecification.createDefault(undefined),
          );
        },
        isReadOnly: true,
      },
    );
  }

  async setQuery(lightQuery: LightQuery) {
    try {
      const processedQuery = V1_Query.serialization.fromJson(
        await this.engine.engineServerClient.getQuery(lightQuery.id),
      );
      const queryCode = await this.engine.getValueSpecificationCode(
        await this.engine.parseValueSpecification(processedQuery.content),
        true,
      );
      runInAction(() => {
        this.query = lightQuery;
        this.queryCode = queryCode;
      });
    } catch (error) {
      assertErrorThrown(error);
      this.engine.logError(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        `Can't get code for query with ID '${lightQuery.id}'`,
      );
      runInAction(() => {
        this.query = lightQuery;
        this.queryCode = undefined;
      });
    }
  }

  unsetQuery(): void {
    this.query = undefined;
    this.queryCode = undefined;
  }

  override get label() {
    return LegendDataCubeSourceBuilderType.LEGEND_QUERY;
  }

  override get isValid(): boolean {
    return Boolean(this.query);
  }

  override async build() {
    if (!this.query) {
      throw new IllegalStateError('Query is missing');
    }
    const source = new RawLegendQueryDataCubeSource();
    source.queryId = this.query.id;
    return RawLegendQueryDataCubeSource.serialization.toJson(source);
  }
}
