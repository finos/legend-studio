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
import { DepotServerClient } from '@finos/legend-server-depot';
import type { LegendDataCubeApplicationConfig } from '../application/LegendDataCubeApplicationConfig.js';
import { GraphManagerState } from '@finos/legend-graph';
import { LegendDataCubeSourceBuilder } from './source/LegendDataCubeSourceBuilder.js';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import { LegendCubeViewer } from './source/LegendCubeViewer.js';
import type { CubeInputSource } from './source/CubeInputSource.js';
import type { DataCubeEngine } from '@finos/legend-data-cube';

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

  constructor(applicationStore: LegendDataCubeApplicationStore) {
    makeObservable(this, {
      cubeViewer: observable,
      sourceSelector: observable,
      initializeView: action,
    });
    this.applicationStore = applicationStore;
    this.pluginManager = applicationStore.pluginManager;
    this.context = new LegendDataCubeStoreContext(applicationStore);
    this.sourceSelector = new LegendDataCubeSourceBuilder(this.context);
  }

  initializeView(source: CubeInputSource, engine: DataCubeEngine): void {
    this.cubeViewer = new LegendCubeViewer(source, engine);
  }
}
