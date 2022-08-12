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

import { type Log, ActionState, assertErrorThrown } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { DependencyManager } from '../graph/DependencyManager.js';
import {
  CoreModel,
  GenerationModel,
  PureModel,
  SystemModel,
} from '../graph/PureModel.js';
import type {
  AbstractPureGraphManager,
  GraphBuilderOptions,
} from '../graphManager/AbstractPureGraphManager.js';
import type { GraphManagerPluginManager } from './GraphManagerPluginManager.js';
import type { EnumerationMapping } from '../graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import { InstanceSetImplementation } from '../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import type { SetImplementation } from '../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import { EmbeddedFlatDataPropertyMapping } from '../graph/metamodel/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import { EmbeddedRelationalInstanceSetImplementation } from '../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import { buildPureGraphManager } from '../graphManager/protocol/pure/PureGraphManagerBuilder.js';
import type { AssociationImplementation } from '../graph/metamodel/pure/packageableElements/mapping/AssociationImplementation.js';

export class BasicGraphManagerState {
  pluginManager: GraphManagerPluginManager;
  log: Log;

  graphManager: AbstractPureGraphManager;

  constructor(pluginManager: GraphManagerPluginManager, log: Log) {
    this.pluginManager = pluginManager;
    this.log = log;
    this.graphManager = buildPureGraphManager(this.pluginManager, log);
  }

  // -------------------------------------------------- UTILITIES -----------------------------------------------------

  /**
   * Check if a mapping element is an instance set implementation
   *
   * NOTE: This would account for embedded property mappings as well
   * these are technically instance of `InstanceSetImplementation`
   * but since unlike Pure, Typescript cannot do multiple inheritance
   * we only can make embedded property mapping extends `PropertyMapping`
   *
   * Potentially, we might need to apply an extension mechanism on this
   */
  isInstanceSetImplementation(
    setImplementation:
      | EnumerationMapping
      | SetImplementation
      | AssociationImplementation,
  ): setImplementation is InstanceSetImplementation {
    return (
      setImplementation instanceof InstanceSetImplementation ||
      setImplementation instanceof EmbeddedFlatDataPropertyMapping ||
      setImplementation instanceof EmbeddedRelationalInstanceSetImplementation
    );
  }

  /**
   * Filter the list of system elements that will be shown in selection options
   * to users. This is helpful to avoid overwhelming and confusing users in form
   * mode since many system elements are needed to build the graph, but should
   * not present at all as selection options in form mode.
   */
  collectExposedSystemElements<T extends PackageableElement>(
    systemElements: T[],
  ): T[] {
    const allowedSystemElements = this.pluginManager
      .getPureGraphManagerPlugins()
      .flatMap((plugin) => plugin.getExtraExposedSystemElementPath?.() ?? []);
    return systemElements.filter((element) =>
      allowedSystemElements.includes(element.path),
    );
  }
}

export class GraphManagerState extends BasicGraphManagerState {
  coreModel: CoreModel;
  systemModel: SystemModel;
  graph: PureModel;

  systemBuildState = ActionState.create();
  dependenciesBuildState = ActionState.create();
  graphBuildState = ActionState.create();
  generationsBuildState = ActionState.create();

  constructor(pluginManager: GraphManagerPluginManager, log: Log) {
    super(pluginManager, log);

    makeObservable(this, {
      graph: observable,
      resetGraph: action,
    });

    this.pluginManager = pluginManager;
    this.log = log;

    const extensionElementClasses = this.pluginManager
      .getPureGraphPlugins()
      .flatMap((plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? []);
    this.systemModel = new SystemModel(extensionElementClasses);
    this.coreModel = new CoreModel(extensionElementClasses);
    this.graph = this.createEmptyGraph();
    this.graphManager = buildPureGraphManager(this.pluginManager, log);

    this.systemBuildState.setMessageFormatter(
      (message: string) => `[system] ${message}`,
    );
    this.dependenciesBuildState.setMessageFormatter(
      (message: string) => `[dependency] ${message}`,
    );
    this.generationsBuildState.setMessageFormatter(
      (message: string) => `[generation] ${message}`,
    );
  }

  /**
   * NOTE: this is temporary. System entities might eventually be collected from a metadata project.
   * Right now the essential models have been extracted from Pure to load the minimum system.
   * We might add more system entities as needed until the system model project(s) are setup.
   */
  async initializeSystem(options?: GraphBuilderOptions): Promise<void> {
    if (!this.systemBuildState.isInInitialState) {
      // NOTE: we must not build system again
      return;
    }
    try {
      await this.graphManager.buildSystem(
        this.coreModel,
        this.systemModel,
        this.systemBuildState,
        options,
      );
      this.systemModel.initializeAutoImports();
    } catch (error) {
      assertErrorThrown(error);
      throw error;
    }
  }

  resetGraph(): void {
    this.graph = this.createEmptyGraph();
  }

  createEmptyGraph(): PureModel {
    return new PureModel(
      this.coreModel,
      this.systemModel,
      this.pluginManager.getPureGraphPlugins(),
    );
  }

  createEmptyDependencyManager(): DependencyManager {
    return new DependencyManager(
      this.pluginManager
        .getPureGraphPlugins()
        .flatMap(
          (plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? [],
        ),
    );
  }

  createEmptyGenerationModel(): GenerationModel {
    return new GenerationModel(
      this.pluginManager
        .getPureGraphPlugins()
        .flatMap(
          (plugin) => plugin.getExtraPureGraphExtensionClasses?.() ?? [],
        ),
    );
  }
}
