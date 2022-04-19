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

import { ROOT_PACKAGE_NAME } from '../MetaModelConst';
import {
  type Clazz,
  ActionState,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { PackageableElement } from '../models/metamodels/pure/packageableElements/PackageableElement';
import type { Enumeration } from '../models/metamodels/pure/packageableElements/domain/Enumeration';
import type { Type } from '../models/metamodels/pure/packageableElements/domain/Type';
import type { Class } from '../models/metamodels/pure/packageableElements/domain/Class';
import type { Mapping } from '../models/metamodels/pure/packageableElements/mapping/Mapping';
import type { Profile } from '../models/metamodels/pure/packageableElements/domain/Profile';
import { Package } from '../models/metamodels/pure/packageableElements/domain/Package';
import type { ConcreteFunctionDefinition } from '../models/metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition';
import type { Store } from '../models/metamodels/pure/packageableElements/store/Store';
import type { Association } from '../models/metamodels/pure/packageableElements/domain/Association';
import type { Service } from '../models/metamodels/pure/packageableElements/service/Service';
import { BasicModel } from '../graph/BasicModel';
import type { PackageableRuntime } from '../models/metamodels/pure/packageableElements/runtime/PackageableRuntime';
import type { PackageableConnection } from '../models/metamodels/pure/packageableElements/connection/PackageableConnection';
import type { FileGenerationSpecification } from '../models/metamodels/pure/packageableElements/fileGeneration/FileGenerationSpecification';
import type { GenerationSpecification } from '../models/metamodels/pure/packageableElements/generationSpecification/GenerationSpecification';
import type { Measure } from '../models/metamodels/pure/packageableElements/domain/Measure';
import type { SectionIndex } from '../models/metamodels/pure/packageableElements/section/SectionIndex';
import type { Entity } from '@finos/legend-model-storage';
import type { Database } from '../models/metamodels/pure/packageableElements/store/relational/model/Database';

class DependencyModel extends BasicModel {
  constructor(
    extensionElementClasses: Clazz<PackageableElement>[],
    root: Package,
  ) {
    super(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT, extensionElementClasses);
    this.root = root;
  }
}

const buildDependencyElementGetter =
  <T extends PackageableElement>(
    dependencyManager: DependencyManager,
    elementGetter: (dependencyGraph: BasicModel, path: string) => T | undefined,
  ): ((path: string) => T | undefined) =>
  (path: string): T | undefined => {
    for (const dependencyGraph of dependencyManager.dependencyGraphs) {
      const element = elementGetter(dependencyGraph, path);
      if (element) {
        return element;
      }
    }
    return undefined;
  };

export class DependencyManager {
  root = new Package(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  projectDependencyModelsIndex = new Map<string, BasicModel>();

  // TODO: to be moved, this is graph-manager logic and should be moved elsewhere
  buildState = ActionState.create();

  private readonly extensionElementClasses: Clazz<PackageableElement>[];

  constructor(extensionElementClasses: Clazz<PackageableElement>[]) {
    this.extensionElementClasses = extensionElementClasses;
    this.buildState.setMessageFormatter(
      (message: string) => `[dependency] ${message}`,
    );
  }

  /**
   * Here we create and index a graph for each dependency
   */
  initialize(dependencyEntitiesMap: Map<string, Entity[]>): void {
    Array.from(dependencyEntitiesMap.keys()).forEach((dependencyKey) => {
      // NOTE: all dependency models will share the dependency manager package root.
      this.projectDependencyModelsIndex.set(
        dependencyKey,
        new DependencyModel(this.extensionElementClasses, this.root),
      );
    });
  }

  get hasDependencies(): boolean {
    return Boolean(this.projectDependencyModelsIndex.size);
  }

  get dependencyGraphs(): BasicModel[] {
    return Array.from(this.projectDependencyModelsIndex.values());
  }

  get allOwnElements(): PackageableElement[] {
    return this.dependencyGraphs.flatMap((dep) => dep.allOwnElements);
  }

  getOwnProfile = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnProfile(path),
  );
  getOwnType = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnType(path),
  );
  getOwnClass = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnClass(path),
  );
  getOwnEnumeration = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnEnumeration(path),
  );
  getOwnMeasure = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnMeasure(path),
  );
  getOwnAssociation = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnAssociation(path),
  );
  getOwnFunction = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnFunction(path),
  );
  getOwnStore = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnStore(path),
  );
  getOwnMapping = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnMapping(path),
  );
  getOwnConnection = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnConnection(path),
  );
  getOwnRuntime = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnRuntime(path),
  );
  getOwnService = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnService(path),
  );
  getOwnGenerationSpecification = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnGenerationSpecification(path),
  );
  getOwnFileGeneration = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnFileGeneration(path),
  );
  getOwnSectionIndex = buildDependencyElementGetter(
    this,
    (dep: BasicModel, path: string) => dep.getOwnSectionIndex(path),
  );
  getOwnExtensionElement<T extends PackageableElement>(
    path: string,
    extensionElementClass: Clazz<T>,
  ): T | undefined {
    for (const dependencyGraph of this.dependencyGraphs) {
      const element = dependencyGraph
        .getExtensionForElementClass(extensionElementClass)
        .getElement(path);
      if (element) {
        return element;
      }
    }
    return undefined;
  }

  get profiles(): Profile[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownProfiles))
      .flat();
  }
  get enumerations(): Enumeration[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownEnumerations))
      .flat();
  }
  get measures(): Measure[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownMeasures))
      .flat();
  }
  get classes(): Class[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownClasses))
      .flat();
  }
  get types(): Type[] {
    return this.dependencyGraphs.map((dep) => Array.from(dep.ownTypes)).flat();
  }
  get associations(): Association[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownAssociations))
      .flat();
  }
  get functions(): ConcreteFunctionDefinition[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownFunctions))
      .flat();
  }
  get stores(): Store[] {
    return this.dependencyGraphs.map((dep) => Array.from(dep.ownStores)).flat();
  }
  get databases(): Database[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownDatabases))
      .flat();
  }
  get mappings(): Mapping[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownMappings))
      .flat();
  }
  get services(): Service[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownServices))
      .flat();
  }
  get runtimes(): PackageableRuntime[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownRuntimes))
      .flat();
  }
  get connections(): PackageableConnection[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownConnections))
      .flat();
  }
  get fileGenerations(): FileGenerationSpecification[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownFileGenerations))
      .flat();
  }
  get generationSpecifications(): GenerationSpecification[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownGenerationSpecifications))
      .flat();
  }
  get sectionIndices(): SectionIndex[] {
    return this.dependencyGraphs
      .map((dep) => Array.from(dep.ownSectionIndices))
      .flat();
  }
  getExtensionElements<T extends PackageableElement>(
    extensionElementClass: Clazz<T>,
  ): T[] {
    return this.dependencyGraphs
      .map((dep) => dep.getExtensionElements(extensionElementClass))
      .flat();
  }

  getModel(projectId: string): BasicModel {
    return guaranteeNonNullable(
      this.projectDependencyModelsIndex.get(projectId),
      `Can't find dependency model with project ID '${projectId}'`,
    );
  }

  getNullableElement(
    path: string,
    includePackage?: boolean,
  ): PackageableElement | undefined {
    const model = this.dependencyGraphs.find((dep) =>
      Boolean(dep.getOwnNullableElement(path, includePackage)),
    );
    return model?.getOwnNullableElement(path, includePackage);
  }
}
