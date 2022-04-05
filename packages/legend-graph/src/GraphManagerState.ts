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
  type GeneratorFn,
  type Log,
  LogEvent,
  uniq,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { DependencyManager } from './graph/DependencyManager';
import {
  CoreModel,
  GenerationModel,
  PureModel,
  SystemModel,
} from './graph/PureModel';
import type {
  AbstractPureGraphManager,
  GraphBuilderOptions,
} from './graphManager/AbstractPureGraphManager';
import { GRAPH_MANAGER_EVENT } from './graphManager/GraphManagerEvent';
import type { GraphPluginManager } from './GraphPluginManager';
import { ROOT_PACKAGE_NAME } from './MetaModelConst';
import { AssociationImplementation } from './models/metamodels/pure/packageableElements/mapping/AssociationImplementation';
import type { EnumerationMapping } from './models/metamodels/pure/packageableElements/mapping/EnumerationMapping';
import { InstanceSetImplementation } from './models/metamodels/pure/packageableElements/mapping/InstanceSetImplementation';
import { OperationSetImplementation } from './models/metamodels/pure/packageableElements/mapping/OperationSetImplementation';
import type { PropertyMapping } from './models/metamodels/pure/packageableElements/mapping/PropertyMapping';
import type { SetImplementation } from './models/metamodels/pure/packageableElements/mapping/SetImplementation';
import type { PackageableElement } from './models/metamodels/pure/packageableElements/PackageableElement';
import { EmbeddedFlatDataPropertyMapping } from './models/metamodels/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import { EmbeddedRelationalInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import { InlineEmbeddedRelationalInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation';
import { OtherwiseEmbeddedRelationalInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation';
import { getGraphManager } from './models/protocols/pure/Pure';

export class GraphManagerState {
  pluginManager: GraphPluginManager;
  log: Log;

  coreModel: CoreModel;
  systemModel: SystemModel;
  graph: PureModel;
  graphManager: AbstractPureGraphManager;

  initSystemState = ActionState.create();

  constructor(pluginManager: GraphPluginManager, log: Log) {
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
    this.graphManager = getGraphManager(this.pluginManager, log);
  }

  /**
   * NOTE: this is temporary. System entities might eventually be collected from a metadata project.
   * Right now the essential profiles have been extracted from Pure to load the minimum system models.
   * We might add more system entities as needed until the system model project(s) are setup.
   */
  async initializeSystem(options?: GraphBuilderOptions): Promise<void> {
    if (!this.initSystemState.isInInitialState) {
      return;
    }
    try {
      this.initSystemState.inProgress();
      await this.graphManager.buildSystem(
        this.coreModel,
        this.systemModel,
        options,
      );
      this.systemModel.initializeAutoImports();
      this.initSystemState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.initSystemState.fail();
      throw error;
    }
  }

  resetGraph(): void {
    this.graph = this.createEmptyGraph();
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
      const otherwiseSetImpl =
        instanceSetImpl.otherwisePropertyMapping.targetSetImplementation;
      const otherwisePropertyMappings = otherwiseSetImpl
        ? this.getMappingElementPropertyMappings(otherwiseSetImpl)
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
      mappedProperties = mappingElement.leafSetImplementations
        .filter((me): me is InstanceSetImplementation =>
          this.isInstanceSetImplementation(me),
        )
        .map((si) => si.propertyMappings)
        .flat();
    }
    return uniq(mappedProperties);
  }

  /**
   * Call `get hashCode()` on each element once so we trigger the first time we compute the hash for that element.
   * This plays well with `keepAlive` flag on each of the element `get hashCode()` function. This is due to
   * the fact that we want to get hashCode inside a `setTimeout()` to make this non-blocking, but that way `mobx` will
   * not trigger memoization on computed so we need to enable `keepAlive`
   */
  *precomputeHashes(): GeneratorFn<void> {
    const startTime = Date.now();
    if (this.graph.allOwnElements.length) {
      yield Promise.all<void>(
        this.graph.allOwnElements.map(
          (element) =>
            new Promise((resolve) =>
              setTimeout(() => {
                element.hashCode; // manually trigger hash code recomputation
                resolve();
              }, 0),
            ),
        ),
      );
    }
    this.log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_HASHES_PRECOMPUTED),
      '[ASYNC]',
      Date.now() - startTime,
      'ms',
    );
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
    return element.getRoot().path !== ROOT_PACKAGE_NAME.MAIN;
  }
}
