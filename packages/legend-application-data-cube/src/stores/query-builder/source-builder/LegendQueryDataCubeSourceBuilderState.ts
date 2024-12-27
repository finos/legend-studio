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

import { IllegalStateError, isNonNullable } from '@finos/legend-shared';
import { QuerySearchSpecification, type LightQuery } from '@finos/legend-graph';
import {
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  QueryLoaderState,
} from '@finos/legend-query-builder';
import { action, makeObservable, observable } from 'mobx';
import {
  LegendDataCubeSourceBuilderState,
  LegendDataCubeSourceBuilderType,
} from './LegendDataCubeSourceBuilderState.js';
import type { LegendDataCubeBaseStore } from '../../LegendDataCubeBaseStore.js';
import { RawLegendQueryDataCubeSource } from '../../model/LegendQueryDataCubeSource.js';

export class LegendQueryDataCubeSourceBuilderState extends LegendDataCubeSourceBuilderState {
  readonly queryLoaderState: QueryLoaderState;

  query?: LightQuery | undefined;

  constructor(baseStore: LegendDataCubeBaseStore) {
    super(baseStore);

    makeObservable(this, {
      query: observable,
      setQuery: action,
    });

    this.queryLoaderState = new QueryLoaderState(
      this.application,
      this.graphManager,
      {
        loadQuery: (query: LightQuery): void => {
          this.setQuery(query);
        },
        decorateSearchSpecification: (val) => val,
        fetchDefaultQueries: async (): Promise<LightQuery[]> => {
          const searchSpecification = new QuerySearchSpecification();
          searchSpecification.limit = QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT;
          return this.graphManager.searchQueries(
            QuerySearchSpecification.createDefault(undefined),
          );
        },
        isReadOnly: true,
      },
    );
  }

  setQuery(query: LightQuery): void {
    this.query = query;
  }

  override get label(): LegendDataCubeSourceBuilderType {
    return LegendDataCubeSourceBuilderType.LEGEND_QUERY;
  }

  override get isValid(): boolean {
    return isNonNullable(this.query);
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
