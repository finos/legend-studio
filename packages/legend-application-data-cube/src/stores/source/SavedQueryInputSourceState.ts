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
  LegendDataCubeInputSourceState,
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
import { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import {
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  QueryLoaderState,
} from '@finos/legend-query-builder';
import { action, makeObservable, observable } from 'mobx';

export class SavedQueryInputSourceState extends LegendDataCubeInputSourceState {
  query: LightQuery | undefined;
  // queryLoaderState: QueryLoaderState;

  constructor() {
    super();
    makeObservable(this, {
      query: observable,
      buildCubeEngineState: observable,
      setQuery: action,
    });
    // this.queryLoaderState = new QueryLoaderState(
    //   this.context.application,
    //   this.context.graphManager,
    //   {
    //     loadQuery: (query: LightQuery): void => {
    //       this.setQuery(query);
    //     },
    //     decorateSearchSpecification: (val) => val,
    //     fetchDefaultQueries: async (): Promise<LightQuery[]> => {
    //       const searchSpecification = new QuerySearchSpecification();
    //       searchSpecification.limit = QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT;
    //       return this.context.graphManager.graphManager.searchQueries(
    //         QuerySearchSpecification.createDefault(undefined),
    //       );
    //     },
    //     isReadOnly: true,
    //   },
    // );
  }

  setQuery(query: LightQuery): void {
    this.query = query;
  }

  // override process(): DataCubeGenericSource {
  //   assertTrue(this.isValid);
  //   return new LegendQueryDataCubeSource(guaranteeNonNullable(this.query).id);
  // }

  override get openActionable(): boolean {
    return false;
  }

  // static override builder(
  //   context: LegendDataCubeStoreContext,
  // ): LegendDataCubeInputSourceState {
  //   return new SavedQueryInputSourceState(context);
  // }
  override get label(): DataCubeSourceType {
    return DataCubeSourceType.LEGEND_QUERY;
  }
  override setup(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  override buildCubeEngine(): Promise<DataCubeEngine | undefined> {
    throw new Error('Method not implemented.');
  }

  // async buildCubeEngine(): Promise<DataCubeEngine | undefined> {
  //   this.buildCubeEngineState.inProgress();
  //   const queryInfo = await this.context.graphManager.graphManager.getQueryInfo(
  //     guaranteeNonNullable(this.query).id,
  //   );
  //   const execConext =
  //     (await this.context.graphManager.graphManager.resolveQueryInfoExecutionContext(
  //       queryInfo,
  //       () =>
  //         this.context.depotServerClient.getVersionEntities(
  //           queryInfo.groupId,
  //           queryInfo.artifactId,
  //           queryInfo.versionId,
  //         ),
  //     )) as { mapping: string | undefined; runtime: string };
  //   const lambda =
  //     (await this.context.graphManager.graphManager.pureCodeToLambda(
  //       queryInfo.content,
  //     )) as unknown as RawLambda;
  //   this.context.graphManager.graph.setOrigin(
  //     new LegendSDLC(
  //       queryInfo.groupId,
  //       queryInfo.artifactId,
  //       resolveVersion(queryInfo.versionId),
  //     ),
  //   );
  //   // TODO: we should be able to call engine and convert lambda to relation if not one.
  //   const engine = new LegendDataCubeDataCubeEngine(
  //     lambda,
  //     undefined,
  //     execConext.mapping,
  //     execConext.runtime,
  //     this.context.graphManager,
  //   );
  //   this.buildCubeEngineState.complete();
  //   return engine;
  // }

  override get isValid(): boolean {
    return isNonNullable(this.query);
  }
}
