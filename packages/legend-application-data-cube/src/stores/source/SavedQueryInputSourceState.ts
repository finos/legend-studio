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
  assertTrue,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import {
  LegendSavedQuerySource,
  type CubeInputSource,
} from './CubeInputSource.js';
import {
  CubeInputSourceState,
  DataCubeSourceType,
} from './CubeInputSourceLoader.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';
import {
  LegendSDLC,
  QuerySearchSpecification,
  type RawLambda,
  type LightQuery,
} from '@finos/legend-graph';
import { resolveVersion } from '@finos/legend-server-depot';
import { LegendExecutionDataCubeEngine } from '../engine/LegendExecutionDataCubeEngine.js';
import type { LegendDataCubeStoreContext } from '../LegendDataCubeEditorStore.js';
import {
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  QueryLoaderState,
} from '@finos/legend-query-builder';
import { action, makeObservable, observable } from 'mobx';

export class SavedQueryInputSourceState extends CubeInputSourceState {
  query: LightQuery | undefined;
  queryLoaderState: QueryLoaderState;

  constructor(context: LegendDataCubeStoreContext) {
    super(context);
    makeObservable(this, {
      query: observable,
      buildCubeEngineState: observable,
      setQuery: action,
    });
    this.queryLoaderState = new QueryLoaderState(
      this.context.applicationStore,
      this.context.graphManagerState,
      {
        loadQuery: (query: LightQuery): void => {
          this.setQuery(query);
        },
        decorateSearchSpecification: (val) => val,
        fetchDefaultQueries: async (): Promise<LightQuery[]> => {
          const searchSpecification = new QuerySearchSpecification();
          searchSpecification.limit = QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT;
          return this.context.graphManagerState.graphManager.searchQueries(
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

  override process(): CubeInputSource {
    assertTrue(this.isValid);
    return new LegendSavedQuerySource(guaranteeNonNullable(this.query).id);
  }

  override get openActionable(): boolean {
    return false;
  }

  static override builder(
    context: LegendDataCubeStoreContext,
  ): CubeInputSourceState {
    return new SavedQueryInputSourceState(context);
  }
  override get label(): DataCubeSourceType {
    return DataCubeSourceType.LEGEND_QUERY;
  }
  override setup(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async buildCubeEngine(): Promise<DataCubeEngine | undefined> {
    this.buildCubeEngineState.inProgress();
    const queryInfo =
      await this.context.graphManagerState.graphManager.getQueryInfo(
        guaranteeNonNullable(this.query).id,
      );
    const execConext =
      (await this.context.graphManagerState.graphManager.resolveQueryInfoExecutionContext(
        queryInfo,
        () =>
          this.context.depotServerClient.getVersionEntities(
            queryInfo.groupId,
            queryInfo.artifactId,
            queryInfo.versionId,
          ),
      )) as { mapping: string | undefined; runtime: string };
    const lambda =
      (await this.context.graphManagerState.graphManager.pureCodeToLambda(
        queryInfo.content,
      )) as unknown as RawLambda;
    this.context.graphManagerState.graph.setOrigin(
      new LegendSDLC(
        queryInfo.groupId,
        queryInfo.artifactId,
        resolveVersion(queryInfo.versionId),
      ),
    );
    // TODO: we should be able to call engine and convert lambda to relation if not one.
    const engine = new LegendExecutionDataCubeEngine(
      lambda,
      undefined,
      execConext.mapping,
      execConext.runtime,
      this.context.graphManagerState,
    );
    this.buildCubeEngineState.complete();
    return engine;
  }

  override get isValid(): boolean {
    return isNonNullable(this.query);
  }
}
