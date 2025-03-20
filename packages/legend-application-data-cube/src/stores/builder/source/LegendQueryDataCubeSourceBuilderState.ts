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
  guaranteeType,
  IllegalStateError,
  LogEvent,
} from '@finos/legend-shared';
import {
  QuerySearchSpecification,
  type V1_EngineServerClient,
  type V1_PureGraphManager,
  V1_Query,
  type LightQuery,
  V1_Lambda,
  V1_Variable,
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
import { APPLICATION_EVENT } from '@finos/legend-application';
import type { LegendDataCubeDataCubeEngine } from '../../LegendDataCubeDataCubeEngine.js';
import type { LegendDataCubeApplicationStore } from '../../LegendDataCubeBaseStore.js';
import type {
  DataCubeAlertService,
  DataCubeConfiguration,
} from '@finos/legend-data-cube';

export class LegendQueryDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  private readonly _engineServerClient: V1_EngineServerClient;
  private readonly _graphManager: V1_PureGraphManager;

  readonly queryLoader: QueryLoaderState;

  query?: LightQuery | undefined;
  queryCode?: string | undefined;
  queryParameters?: V1_Variable[] | undefined;

  constructor(
    application: LegendDataCubeApplicationStore,
    engine: LegendDataCubeDataCubeEngine,
    engineServerClient: V1_EngineServerClient,
    graphManager: V1_PureGraphManager,
    alertService: DataCubeAlertService,
  ) {
    super(application, engine, alertService);

    makeObservable(this, {
      query: observable,
      unsetQuery: action,

      queryCode: observable,
    });

    this._graphManager = graphManager;
    this._engineServerClient = engineServerClient;

    this.queryLoader = new QueryLoaderState(
      this._application,
      this._graphManager,
      {
        loadQuery: (query) => {
          this.setQuery(query).catch((error) =>
            this._alertService.alertUnhandledError(error),
          );
        },
        decorateSearchSpecification: (val) => val,
        fetchDefaultQueries: async () => {
          const searchSpecification = new QuerySearchSpecification();
          searchSpecification.limit = QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT;
          return this._graphManager.searchQueries(
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
        await this._engineServerClient.getQuery(lightQuery.id),
      );
      const queryLambda = guaranteeType(
        await this._engine.parseValueSpecification(processedQuery.content),
        V1_Lambda,
        'Expected query content to be a V1_Lambda',
      );
      const queryCode = await this._engine.getValueSpecificationCode(
        queryLambda,
        true,
      );
      const queryParameters = queryLambda.parameters;
      runInAction(() => {
        this.query = lightQuery;
        this.queryCode = queryCode;
        this.queryParameters = queryParameters;
      });
    } catch (error) {
      assertErrorThrown(error);
      this._application.logService.error(
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

  override async generateSourceData() {
    if (!this.query) {
      throw new IllegalStateError(
        `Can't generate source data: query is not set`,
      );
    }
    const source = new RawLegendQueryDataCubeSource();
    source.queryId = this.query.id;
    return RawLegendQueryDataCubeSource.serialization.toJson(source);
  }

  override finalizeConfiguration(configuration: DataCubeConfiguration) {
    if (this.query) {
      configuration.name = this.query.name;
    }
  }
}
