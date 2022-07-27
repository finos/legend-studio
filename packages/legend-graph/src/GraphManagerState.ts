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
  type Log,
  uniq,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { DependencyManager } from './graph/DependencyManager.js';
import {
  CoreModel,
  GenerationModel,
  PureModel,
  SystemModel,
} from './graph/PureModel.js';
import type {
  AbstractPureGraphManager,
  GraphBuilderOptions,
} from './graphManager/AbstractPureGraphManager.js';
import type { GraphManagerPluginManager } from './GraphManagerPluginManager.js';
import { getElementRootPackage } from './helpers/DomainHelper.js';
import { getLeafSetImplementations } from './helpers/DSLMapping_Helper.js';
import { ROOT_PACKAGE_NAME } from './MetaModelConst.js';
import { AssociationImplementation } from './models/metamodels/pure/packageableElements/mapping/AssociationImplementation.js';
import type { EnumerationMapping } from './models/metamodels/pure/packageableElements/mapping/EnumerationMapping.js';
import { InstanceSetImplementation } from './models/metamodels/pure/packageableElements/mapping/InstanceSetImplementation.js';
import { OperationSetImplementation } from './models/metamodels/pure/packageableElements/mapping/OperationSetImplementation.js';
import type { PropertyMapping } from './models/metamodels/pure/packageableElements/mapping/PropertyMapping.js';
import type { SetImplementation } from './models/metamodels/pure/packageableElements/mapping/SetImplementation.js';
import type { PackageableElement } from './models/metamodels/pure/packageableElements/PackageableElement.js';
import { EmbeddedFlatDataPropertyMapping } from './models/metamodels/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import { EmbeddedRelationalInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import { InlineEmbeddedRelationalInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation.js';
import { OtherwiseEmbeddedRelationalInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation.js';
import { buildPureGraphManager } from './models/protocols/pure/PureGraphManagerBuilder.js';

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
   * NOTE: Notice how this utility draws resources from all of metamodels and uses `instanceof` to classify behavior/response.
   * As such, methods in this utility cannot be placed in place they should belong to.
   *
   * For example: `getSetImplemetnationType` cannot be placed in `SetImplementation` because of circular module dependency
   * So this utility is born for such purpose, to avoid circular module dependency, and it should just be used for only that
   * Other utilities that really should reside in the domain-specific meta model should be placed in the meta model module.
   *
   * NOTE: We expect the need for these methods will eventually go away as we complete modularization. But we need these
   * methods here so that we can load plugins.
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

  getInstanceSetImplementationPropertyMappings(
    instanceSetImpl: InstanceSetImplementation,
  ): PropertyMapping[] {
    if (
      instanceSetImpl instanceof
      InlineEmbeddedRelationalInstanceSetImplementation
    ) {
      return this.getMappingElementPropertyMappings(
        instanceSetImpl.inlineSetImplementation,
      );
    } else if (
      instanceSetImpl instanceof
      OtherwiseEmbeddedRelationalInstanceSetImplementation
    ) {
      // NOTE: for now we will grab all property mappings from the main otherwise embedded mapping and the otherwise property mapping.
      // In the future we may want to incorporate some smartness as to when the otherwise set implementation isinvoked.
      const otherwisePropertyMappings = instanceSetImpl.otherwisePropertyMapping
        .targetSetImplementation?.value
        ? this.getMappingElementPropertyMappings(
            instanceSetImpl.otherwisePropertyMapping.targetSetImplementation
              .value,
          )
        : [];
      return [
        ...instanceSetImpl.propertyMappings,
        ...otherwisePropertyMappings,
      ];
    }
    return instanceSetImpl.propertyMappings;
  }

  getMappingElementPropertyMappings(
    mappingElement:
      | EnumerationMapping
      | SetImplementation
      | AssociationImplementation,
  ): PropertyMapping[] {
    let mappedProperties: PropertyMapping[] = [];
    if (this.isInstanceSetImplementation(mappingElement)) {
      mappedProperties =
        this.getInstanceSetImplementationPropertyMappings(mappingElement);
    } else if (mappingElement instanceof AssociationImplementation) {
      mappedProperties = mappingElement.propertyMappings;
    } else if (mappingElement instanceof OperationSetImplementation) {
      mappedProperties = getLeafSetImplementations(mappingElement)
        .filter((me): me is InstanceSetImplementation =>
          this.isInstanceSetImplementation(me),
        )
        .map((si) => si.propertyMappings)
        .flat();
    }
    return uniq(mappedProperties);
  }

  /**
   * Filter the list of system elements that will be shown in selection options
   * to users. This is helpful to avoid overwhelming and confusing users in form
   * mode since many system elements are needed to build the graph, but should
   * not present at all as selection options in form mode.
   */
  filterSystemElementOptions<T extends PackageableElement>(
    systemElements: T[],
  ): T[] {
    const allowedSystemElements = this.pluginManager
      .getPureGraphManagerPlugins()
      .flatMap((plugin) => plugin.getExtraExposedSystemElementPath?.() ?? []);
    return systemElements.filter((element) =>
      allowedSystemElements.includes(element.path),
    );
  }

  isElementReadOnly(element: PackageableElement): boolean {
    return getElementRootPackage(element).name !== ROOT_PACKAGE_NAME.MAIN;
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
