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
  type LogService,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { CoreModel, SystemModel, PureModel } from '../graph/PureModel.js';
import type {
  AbstractPureGraphManager,
  GraphBuilderOptions,
} from '../graph-manager/AbstractPureGraphManager.js';
import type { GraphManagerPluginManager } from './GraphManagerPluginManager.js';
import type { PackageableElement } from '../graph/metamodel/pure/packageableElements/PackageableElement.js';
import { buildPureGraphManager } from '../graph-manager/protocol/pure/PureGraphManagerBuilder.js';
import type { Profile } from '../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { Enumeration } from '../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Measure } from '../graph/metamodel/pure/packageableElements/domain/Measure.js';
import type { Class } from '../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Association } from '../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { ConcreteFunctionDefinition } from '../graph/metamodel/pure/packageableElements/function/ConcreteFunctionDefinition.js';
import type { Store } from '../graph/metamodel/pure/packageableElements/store/Store.js';
import type { Database } from '../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import type { Mapping } from '../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { Service } from '../graph/metamodel/pure/packageableElements/service/Service.js';
import type { PackageableRuntime } from '../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import type { PackageableConnection } from '../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import type { DataElement } from '../graph/metamodel/pure/packageableElements/data/DataElement.js';
import type { FileGenerationSpecification } from '../graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
import type { GenerationSpecification } from '../graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
import type { Type } from '../graph/metamodel/pure/packageableElements/domain/Type.js';
import { PrimitiveType } from '../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';

export class BasicGraphManagerState {
  readonly pluginManager: GraphManagerPluginManager;
  readonly logService: LogService;

  graphManager: AbstractPureGraphManager;

  constructor(
    pluginManager: GraphManagerPluginManager,
    logService: LogService,
    graphManager?: AbstractPureGraphManager,
  ) {
    this.pluginManager = pluginManager;
    this.logService = logService;
    this.graphManager =
      graphManager ?? buildPureGraphManager(this.pluginManager, logService);
  }
}

export class GraphManagerState extends BasicGraphManagerState {
  readonly coreModel: CoreModel;
  readonly systemModel: SystemModel;

  readonly systemBuildState = ActionState.create();
  readonly dependenciesBuildState = ActionState.create();
  readonly graphBuildState = ActionState.create();
  readonly generationsBuildState = ActionState.create();

  graph: PureModel;

  constructor(
    pluginManager: GraphManagerPluginManager,
    logService: LogService,
    graphManager?: AbstractPureGraphManager,
  ) {
    super(pluginManager, logService, graphManager);

    makeObservable(this, {
      graph: observable,

      usableClassPropertyTypes: computed,

      usableProfiles: computed,
      usableEnumerations: computed,
      usableMeasures: computed,
      usableClasses: computed,
      usableAssociationPropertyClasses: computed,
      usableAssociations: computed,
      usableFunctions: computed,
      usableStores: computed,
      usableDatabases: computed,
      usableMappings: computed,
      usableServices: computed,
      usableRuntimes: computed,
      usableConnections: computed,
      usableDataElements: computed,
      usableGenerationSpecifications: computed,
      usableFileGenerations: computed,
      usableElements: computed,

      resetGraph: action,
    });

    this.systemModel = new SystemModel(
      this.pluginManager.getPureGraphPlugins(),
    );
    this.coreModel = new CoreModel(this.pluginManager.getPureGraphPlugins());
    this.graph = this.createNewGraph();
    this.graphManager = buildPureGraphManager(this.pluginManager, logService);

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
    this.graph = this.createNewGraph();
  }

  createNewGraph(): PureModel {
    return new PureModel(
      this.coreModel,
      this.systemModel,
      this.pluginManager.getPureGraphPlugins(),
    );
  }
  /**
   * NOTE: for all elements the ordering of usable elements will be own elements, system elements, dependency elements.
   * Exception is made for types and profiles where we will show primitive and system elements first as those will be
   * leveraged most by users
   */
  get usableClassPropertyTypes(): Type[] {
    return [
      ...this.graph.primitiveTypes.filter(
        (type) =>
          type !== PrimitiveType.LATESTDATE && type !== PrimitiveType.BINARY,
      ),
      ...this.graph.ownTypes,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownTypes,
      ),
      ...this.graph.dependencyManager.types,
    ];
  }

  get usableProfiles(): Profile[] {
    return [
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownProfiles,
      ),
      ...this.graph.ownProfiles,
      ...this.graph.dependencyManager.profiles,
    ];
  }
  get usableEnumerations(): Enumeration[] {
    return [
      ...this.graph.ownEnumerations,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownEnumerations,
      ),
      ...this.graph.dependencyManager.enumerations,
    ];
  }
  get usableMeasures(): Measure[] {
    return [
      ...this.graph.ownMeasures,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownMeasures,
      ),
      ...this.graph.dependencyManager.measures,
    ];
  }
  get usableClasses(): Class[] {
    return [
      ...this.graph.ownClasses,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownClasses,
      ),
      ...this.graph.dependencyManager.classes,
    ];
  }
  get usableAssociationPropertyClasses(): Class[] {
    return [...this.graph.ownClasses, ...this.graph.dependencyManager.classes];
  }

  get usableAssociations(): Association[] {
    return [
      ...this.graph.ownAssociations,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownAssociations,
      ),
      ...this.graph.dependencyManager.associations,
    ];
  }
  get usableFunctions(): ConcreteFunctionDefinition[] {
    return [
      ...this.graph.ownFunctions,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownFunctions,
      ),
      ...this.graph.dependencyManager.functions,
    ];
  }
  get usableStores(): Store[] {
    return [
      ...this.graph.ownStores,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownStores,
      ),
      ...this.graph.dependencyManager.stores,
    ];
  }
  get usableDatabases(): Database[] {
    return [
      ...this.graph.ownDatabases,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownDatabases,
      ),
      ...this.graph.dependencyManager.databases,
    ];
  }
  get usableMappings(): Mapping[] {
    return [
      ...this.graph.ownMappings,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownMappings,
      ),
      ...this.graph.dependencyManager.mappings,
    ];
  }
  get usableServices(): Service[] {
    return [
      ...this.graph.ownServices,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownServices,
      ),
      ...this.graph.dependencyManager.services,
    ];
  }
  get usableRuntimes(): PackageableRuntime[] {
    return [
      ...this.graph.ownRuntimes,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownRuntimes,
      ),
      ...this.graph.dependencyManager.runtimes,
    ];
  }
  get usableConnections(): PackageableConnection[] {
    return [
      ...this.graph.ownConnections,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownConnections,
      ),
      ...this.graph.dependencyManager.connections,
    ];
  }
  get usableDataElements(): DataElement[] {
    return [
      ...this.graph.ownDataElements,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownDataElements,
      ),
      ...this.graph.dependencyManager.dataElements,
    ];
  }
  get usableGenerationSpecifications(): GenerationSpecification[] {
    return [
      ...this.graph.ownGenerationSpecifications,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownGenerationSpecifications,
      ),
      ...this.graph.dependencyManager.generationSpecifications,
    ];
  }
  get usableFileGenerations(): FileGenerationSpecification[] {
    return [
      ...this.graph.ownFileGenerations,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.ownFileGenerations,
      ),
      ...this.graph.dependencyManager.fileGenerations,
    ];
  }
  get usableElements(): PackageableElement[] {
    return [
      ...this.graph.ownMeasures,
      ...this.graphManager.collectExposedSystemElements(
        this.graph.systemModel.allOwnElements,
      ),
      ...this.graph.dependencyManager.allOwnElements,
    ];
  }
}
