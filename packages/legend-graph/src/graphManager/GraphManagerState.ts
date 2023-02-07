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
import { action, computed, makeObservable, observable } from 'mobx';
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
import type { Profile } from '../graph/metamodel/pure/packageableElements/domain/Profile.js';
import type { Enumeration } from '../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Measure } from '../graph/metamodel/pure/packageableElements/domain/Measure.js';
import type { Class } from '../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { Association } from '../graph/metamodel/pure/packageableElements/domain/Association.js';
import type { ConcreteFunctionDefinition } from '../graph/metamodel/pure/packageableElements/domain/ConcreteFunctionDefinition.js';
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

  get usableClassPropertyTypes(): Type[] {
    return [
      ...this.graph.primitiveTypes.filter(
        (type) => type !== PrimitiveType.LATESTDATE,
      ),
      ...this.graph.ownTypes,
      ...this.collectExposedSystemElements(this.graph.systemModel.ownTypes),
      ...this.graph.dependencyManager.types,
    ];
  }

  get usableProfiles(): Profile[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownProfiles),
      ...this.graph.dependencyManager.profiles,
      ...this.graph.ownProfiles,
    ];
  }
  get usableEnumerations(): Enumeration[] {
    return [
      ...this.collectExposedSystemElements(
        this.graph.systemModel.ownEnumerations,
      ),
      ...this.graph.dependencyManager.enumerations,
      ...this.graph.ownEnumerations,
    ];
  }
  get usableMeasures(): Measure[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownMeasures),
      ...this.graph.dependencyManager.measures,
      ...this.graph.ownMeasures,
    ];
  }
  get usableClasses(): Class[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownClasses),
      ...this.graph.dependencyManager.classes,
      ...this.graph.ownClasses,
    ];
  }
  get usableAssociationPropertyClasses(): Class[] {
    return [...this.graph.dependencyManager.classes, ...this.graph.ownClasses];
  }

  get usableAssociations(): Association[] {
    return [
      ...this.collectExposedSystemElements(
        this.graph.systemModel.ownAssociations,
      ),
      ...this.graph.dependencyManager.associations,
      ...this.graph.ownAssociations,
    ];
  }
  get usableFunctions(): ConcreteFunctionDefinition[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownFunctions),
      ...this.graph.dependencyManager.functions,
      ...this.graph.ownFunctions,
    ];
  }
  get usableStores(): Store[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownStores),
      ...this.graph.dependencyManager.stores,
      ...this.graph.ownStores,
    ];
  }
  get usableDatabases(): Database[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownDatabases),
      ...this.graph.dependencyManager.databases,
      ...this.graph.ownDatabases,
    ];
  }
  get usableMappings(): Mapping[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownMappings),
      ...this.graph.dependencyManager.mappings,
      ...this.graph.ownMappings,
    ];
  }
  get usableServices(): Service[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownServices),
      ...this.graph.dependencyManager.services,
      ...this.graph.ownServices,
    ];
  }
  get usableRuntimes(): PackageableRuntime[] {
    return [
      ...this.collectExposedSystemElements(this.graph.systemModel.ownRuntimes),
      ...this.graph.dependencyManager.runtimes,
      ...this.graph.ownRuntimes,
    ];
  }
  get usableConnections(): PackageableConnection[] {
    return [
      ...this.collectExposedSystemElements(
        this.graph.systemModel.ownConnections,
      ),
      ...this.graph.dependencyManager.connections,
      ...this.graph.ownConnections,
    ];
  }
  get usableDataElements(): DataElement[] {
    return [
      ...this.collectExposedSystemElements(
        this.graph.systemModel.ownDataElements,
      ),
      ...this.graph.dependencyManager.dataElements,
      ...this.graph.ownDataElements,
    ];
  }
  get usableGenerationSpecifications(): GenerationSpecification[] {
    return [
      ...this.collectExposedSystemElements(
        this.graph.systemModel.ownGenerationSpecifications,
      ),
      ...this.graph.dependencyManager.generationSpecifications,
      ...this.graph.ownGenerationSpecifications,
    ];
  }
  get usableFileGenerations(): FileGenerationSpecification[] {
    return [
      ...this.collectExposedSystemElements(
        this.graph.systemModel.ownFileGenerations,
      ),
      ...this.graph.dependencyManager.fileGenerations,
      ...this.graph.ownFileGenerations,
    ];
  }
  get usableElements(): PackageableElement[] {
    return [
      ...this.collectExposedSystemElements(
        this.graph.systemModel.allOwnElements,
      ),
      ...this.graph.dependencyManager.allOwnElements,
      ...this.graph.ownMeasures,
    ];
  }
}
