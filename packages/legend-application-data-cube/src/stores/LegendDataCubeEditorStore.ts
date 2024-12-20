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
  DEFAULT_TAB_SIZE,
  type ApplicationStore,
} from '@finos/legend-application';
import type { LegendDataCubePluginManager } from '../application/LegendDataCubePluginManager.js';
import { DepotServerClient, resolveVersion } from '@finos/legend-server-depot';
import type { LegendDataCubeApplicationConfig } from '../application/LegendDataCubeApplicationConfig.js';
import {
  GraphManagerState,
  LegendSDLC,
  SavedDataCubeQuery,
  type QueryInfo,
  type RawLambda,
} from '@finos/legend-graph';
import { LegendDataCubeSourceBuilder } from './source/LegendDataCubeSourceBuilder.js';
import {
  ActionState,
  UnsupportedOperationError,
  assertErrorThrown,
  guaranteeNonNullable,
  uuid,
  type GeneratorFn,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { LegendCubeViewer } from './source/LegendCubeViewer.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';
import type { DataCubeGenericSource } from './model/DataCubeGenericSource.js';
import {
  createQueryBuilderContent,
  deserializeDataCubeQueryConent,
  serializeDataCubeQueryConent,
} from './model/DataCubeGenericSourceHelper.js';
import { LegendSavedQuerySource } from './model/LegendSavedQuerySource.js';
import { LegendExecutionDataCubeEngine } from './engine/LegendExecutionDataCubeEngine.js';
import { generatedSavedQueryUrl } from '../__lib__/LegendDataCubeNavigation.js';

export type LegendDataCubeApplicationStore = ApplicationStore<
  LegendDataCubeApplicationConfig,
  LegendDataCubePluginManager
>;

export class LegendDataCubeStoreContext {
  readonly applicationStore: LegendDataCubeApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: GraphManagerState;
  initState = ActionState.create();

  constructor(applicationStore: LegendDataCubeApplicationStore) {
    makeObservable(this, {
      initialize: flow,
      initState: observable,
    });
    // server
    this.depotServerClient = new DepotServerClient({
      serverUrl: applicationStore.config.depotServerUrl,
    });
    this.depotServerClient.setTracerService(applicationStore.tracerService);
    this.graphManagerState = new GraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );
    this.applicationStore = applicationStore;
  }

  *initialize(): GeneratorFn<void> {
    if (!this.initState.isInInitialState) {
      return;
    }

    try {
      this.initState.inProgress();
      // TODO: when we genericize the way to initialize an application page
      this.applicationStore.assistantService.setIsHidden(true);

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
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
      this.initState.fail();
    }
  }
}

export class LegendDataCubeStore {
  readonly applicationStore: LegendDataCubeApplicationStore;
  readonly context: LegendDataCubeStoreContext;
  readonly pluginManager: LegendDataCubePluginManager;
  sourceSelector: LegendDataCubeSourceBuilder;
  cubeViewer: LegendCubeViewer | undefined;
  saveModal = false;
  saveModalState = ActionState.create();
  savedQuery: SavedDataCubeQuery | undefined;

  constructor(applicationStore: LegendDataCubeApplicationStore) {
    makeObservable(this, {
      cubeViewer: observable,
      sourceSelector: observable,
      saveModal: observable,
      setSaveModal: observable,
      saveModalState: observable,
      savedQuery: observable,
      initializeView: action,
      initialize: flow,
      saveQuery: flow,
    });
    this.applicationStore = applicationStore;
    this.pluginManager = applicationStore.pluginManager;
    this.context = new LegendDataCubeStoreContext(applicationStore);
    this.sourceSelector = new LegendDataCubeSourceBuilder(this.context);
  }

  setSaveModal(val: boolean): void {
    this.saveModal = val;
  }

  initializeView(source: DataCubeGenericSource, engine: DataCubeEngine): void {
    this.cubeViewer = new LegendCubeViewer(source, engine);
  }

  *initialize(id: string): GeneratorFn<void> {
    try {
      yield flowResult(this.context.initialize());
      const query =
        (yield this.context.graphManagerState.graphManager.getDataCubeQuery(
          id,
        )) as unknown as SavedDataCubeQuery;
      this.savedQuery = query;
      const source = deserializeDataCubeQueryConent(query.content).source;
      if (source instanceof LegendSavedQuerySource) {
        const queryInfo =
          (yield this.context.graphManagerState.graphManager.getQueryInfo(
            source.id,
          )) as unknown as QueryInfo;
        const execConext =
          (yield this.context.graphManagerState.graphManager.resolveQueryInfoExecutionContext(
            queryInfo,
            () =>
              this.context.depotServerClient.getVersionEntities(
                queryInfo.groupId,
                queryInfo.artifactId,
                queryInfo.versionId,
              ),
          )) as { mapping: string | undefined; runtime: string };
        const lambda =
          (yield this.context.graphManagerState.graphManager.pureCodeToLambda(
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
        this.initializeView(source, engine);
      } else {
        throw new UnsupportedOperationError('not supported');
      }
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to initialie query with id '${id}'`,
      );
    }
  }

  *saveQuery(name: string): GeneratorFn<void> {
    try {
      this.saveModalState.inProgress();
      const view = guaranteeNonNullable(this.cubeViewer);
      const content = serializeDataCubeQueryConent(
        createQueryBuilderContent(view.source),
      );
      const cubeQuery = new SavedDataCubeQuery();
      cubeQuery.content = content;
      cubeQuery.name = name;
      cubeQuery.id = uuid();
      const querySaved =
        (yield this.context.graphManagerState.graphManager.createQueryDataCube(
          cubeQuery,
        )) as unknown as SavedDataCubeQuery;
      this.savedQuery = querySaved;
      // TODO: fix reload
      this.applicationStore.navigationService.navigator.goToLocation(
        generatedSavedQueryUrl(querySaved.id),
      );
      this.setSaveModal(false);
      this.saveModalState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.saveModalState.fail();
      this.applicationStore.notificationService.notifyError(
        `Unable to save query`,
      );
    }
  }
}
