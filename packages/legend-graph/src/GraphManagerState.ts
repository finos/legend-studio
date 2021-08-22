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

import type { GeneratorFn, Log } from '@finos/legend-shared';
import { ActionState, assertErrorThrown } from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { CoreModel, PureModel, SystemModel } from './graph/PureModel';
import type { AbstractPureGraphManager } from './graphManager/AbstractPureGraphManager';
import type { GraphPluginManager } from './GraphPluginManager';
import { getGraphManager } from './models/protocols/pure/Pure';

export class GraphManagerState {
  pluginManager: GraphPluginManager;

  coreModel: CoreModel;
  systemModel: SystemModel;
  graph: PureModel;
  graphManager: AbstractPureGraphManager;

  initSystemState = ActionState.create();

  constructor(pluginManager: GraphPluginManager, log: Log) {
    makeObservable(this, {
      graph: observable,
      resetGraph: action,
      initializeSystem: flow,
    });

    this.pluginManager = pluginManager;

    const extensionElementClasses = this.pluginManager
      .getPureGraphManagerPlugins()
      .flatMap((plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? []);
    this.systemModel = new SystemModel(extensionElementClasses);
    this.coreModel = new CoreModel(extensionElementClasses);
    this.graph = this.createEmptyGraph();
    this.graphManager = getGraphManager(this.pluginManager, log);
  }

  /**
   * NOTE: this is temporary. System entities might eventually be in a seperate SDLC project and compressed for performance.
   * Right now the essential profiles have been extracted from Pure to load the minimum system models.
   * We might add more system entities as needed until the SDLC project is setup.
   */
  *initializeSystem(): GeneratorFn<void> {
    if (!this.initSystemState.isInInitialState) {
      return;
    }
    try {
      this.initSystemState.inProgress();
      yield flowResult(
        this.graphManager.buildSystem(this.coreModel, this.systemModel),
      );
      this.systemModel.initializeAutoImports();
      this.initSystemState.pass();
    } catch (e: unknown) {
      assertErrorThrown(e);
      this.initSystemState.pass();
      throw e;
    }
  }

  createEmptyGraph(): PureModel {
    return new PureModel(
      this.coreModel,
      this.systemModel,
      this.pluginManager
        .getPureGraphManagerPlugins()
        .flatMap(
          (plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? [],
        ),
    );
  }

  resetGraph(): void {
    this.graph = this.createEmptyGraph();
  }
}
