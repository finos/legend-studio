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

import type { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import {
  GraphManagerState,
  type RawLambda,
  type QueryInfo,
} from '@finos/legend-graph';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import { QueryBuilderDataCubeEngine } from '@finos/legend-query-builder';
import { flow, makeObservable, observable } from 'mobx';

export class ExistingQueryDataCubeEditorStore {
  readonly applicationStore: LegendQueryApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: GraphManagerState;
  readonly queryId: string;
  engine: QueryBuilderDataCubeEngine | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    queryId: string,
  ) {
    makeObservable(this, {
      initialize: flow,
      engine: observable,
    });
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.queryId = queryId;
  }

  *initialize(): GeneratorFn<void> {
    try {
      // initialize the graph manager
      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      );
      const queryInfo = (yield this.graphManagerState.graphManager.getQueryInfo(
        this.queryId,
      )) as unknown as QueryInfo;
      const content = queryInfo.content;
      const execConext =
        (yield this.graphManagerState.graphManager.resolveQueryInfoExecutionContext(
          queryInfo,
          () =>
            this.depotServerClient.getVersionEntities(
              queryInfo.groupId,
              queryInfo.artifactId,
              queryInfo.versionId,
            ),
        )) as { mapping: string | undefined; runtime: string };
      const lambda =
        (yield this.graphManagerState.graphManager.pureCodeToLambda(
          content,
        )) as unknown as RawLambda;
      // TODO: we should be able to call engine and convert lambda to relation if not one.
      const engine = new QueryBuilderDataCubeEngine(
        lambda,
        undefined,
        execConext.mapping,
        execConext.runtime,
        this.graphManagerState,
      );
      this.engine = engine;
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to initialize cube with query ${this.queryId}: ${error.message}`,
      );
    }
  }
}
