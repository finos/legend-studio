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

import { computed, isObservable, makeObservable, observable } from 'mobx';
import type { BasicModel } from '../../../graph/BasicModel';
import type { DependencyManager } from '../../../graph/DependencyManager';
import type { PureGraphExtension } from '../../../graph/PureGraphExtension';
import type { PureModel } from '../../../graph/PureModel';
import type { PackageableElement } from '../../../models/metamodels/pure/packageableElements/PackageableElement';
import { type ObserverContext, skipObserved } from './CoreObserverHelper';
import { observe_PackageTree } from './DomainObserverHelper';

const observe_PureGraphExtension = skipObserved(
  <T extends PackageableElement>(
    metamodel: PureGraphExtension<T>,
  ): PureGraphExtension<T> =>
    makeObservable<PureGraphExtension<T>, 'index'>(metamodel, {
      index: observable,
      elements: computed,
    }),
);

const observe_Abstract_BasicModel = (metamodel: BasicModel): void => {
  makeObservable<
    BasicModel,
    | 'elementSectionMap'
    | 'sectionIndicesIndex'
    | 'profilesIndex'
    | 'typesIndex'
    | 'associationsIndex'
    | 'functionsIndex'
    | 'storesIndex'
    | 'mappingsIndex'
    | 'connectionsIndex'
    | 'runtimesIndex'
    | 'servicesIndex'
    | 'generationSpecificationsIndex'
    | 'fileGenerationsIndex'
    | 'dataElementsIndex'
  >(metamodel, {
    elementSectionMap: observable,
    sectionIndicesIndex: observable,
    profilesIndex: observable,
    typesIndex: observable,
    associationsIndex: observable,
    functionsIndex: observable,
    storesIndex: observable,
    mappingsIndex: observable,
    connectionsIndex: observable,
    runtimesIndex: observable,
    servicesIndex: observable,
    generationSpecificationsIndex: observable,
    fileGenerationsIndex: observable,
    dataElementsIndex: observable,
    extensions: observable,

    allOwnElements: computed,
    ownSectionIndices: computed,
    ownProfiles: computed,
    ownEnumerations: computed,
    ownMeasures: computed,
    ownClasses: computed,
    ownTypes: computed,
    ownAssociations: computed,
    ownFunctions: computed,
    ownStores: computed,
    ownFlatDatas: computed,
    ownDatabases: computed,
    ownMappings: computed,
    ownServices: computed,
    ownRuntimes: computed,
    ownConnections: computed,
    ownFileGenerations: computed,
    ownGenerationSpecifications: computed,
    ownDataElements: computed,
  });

  metamodel.extensions.forEach(observe_PureGraphExtension);
};

export const observe_DependencyManager = skipObserved(
  (metamodel: DependencyManager): DependencyManager =>
    makeObservable(metamodel, {
      root: observable,
      projectDependencyModelsIndex: observable,
      allOwnElements: computed,
      dependencyGraphs: computed,
      sectionIndices: computed,
      profiles: computed,
      enumerations: computed,
      measures: computed,
      classes: computed,
      types: computed,
      associations: computed,
      functions: computed,
      stores: computed,
      databases: computed,
      mappings: computed,
      services: computed,
      runtimes: computed,
      connections: computed,
      generationSpecifications: computed,
      fileGenerations: computed,
      dataElements: computed,
    }),
);

/**
 * NOTE: when we observe the graph, it is important to do this synchronously
 * to not mess with `mobx`. Since most of the indices of the graph are computed values
 * we have seen cases where asynchronousity hurts us and causes really ellusive bugs
 * since `mobx` observabilty does not track in asynchronous context and `makeObservable`
 * is sort of equivalent to triggering observability.
 *
 * See https://mobx.js.org/understanding-reactivity.html#understanding-reactivity
 * See https://github.com/finos/legend-studio/issues/1121
 *
 * On the other hand, for performance purpose, we would need to observe all of graph
 * elements asynchronously, as such, we would do that separately in the method
 * {@link observe_GraphElements}
 */
export const observe_Graph = (metamodel: PureModel): PureModel => {
  if (isObservable(metamodel)) {
    return metamodel;
  }
  observe_Abstract_BasicModel(metamodel);

  makeObservable(metamodel, {
    generationModel: observable,
    dependencyManager: observable,
  });

  observe_DependencyManager(metamodel.dependencyManager);

  return metamodel;
};

/**
 * This method is designed for performance purpose.
 *
 * NOTE: this might have some impact on `mobx` observability, see the note
 * of {@link observe_Graph}
 */
export const observe_GraphElements = async (
  metamodel: PureModel,
  context: ObserverContext,
): Promise<void> => {
  /**
   * A note on performance here. We could observe the package tree recursively synchronously
   * we have tried before and it does not take a long time, but at the risk of
   * blocking the main thread, we parallize this anyway, hence we must make this method asynchronous.
   */
  await observe_PackageTree(metamodel.root, context);
};
