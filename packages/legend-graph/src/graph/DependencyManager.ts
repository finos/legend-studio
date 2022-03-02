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

import { observable, computed, makeObservable } from 'mobx';
import { ROOT_PACKAGE_NAME } from '../MetaModelConst';
import {
  type Clazz,
  ActionState,
  guaranteeNonNullable,
  isNonNullable,
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
import type {
  Measure,
  Unit,
} from '../models/metamodels/pure/packageableElements/domain/Measure';
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

export class DependencyManager {
  root = new Package(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  projectDependencyModelsIndex = new Map<string, BasicModel>();
  buildState = ActionState.create();

  private readonly extensionElementClasses: Clazz<PackageableElement>[];

  constructor(extensionElementClasses: Clazz<PackageableElement>[]) {
    makeObservable(this, {
      root: observable,
      projectDependencyModelsIndex: observable,
      allElements: computed,
      models: computed,
      profiles: computed,
      enumerations: computed,
      measures: computed,
      units: computed,
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
      fileGenerations: computed,
      generationSpecifications: computed,
      sectionIndices: computed,
    });

    this.extensionElementClasses = extensionElementClasses;
  }

  /**
   * Here we initialize a Dependency Pure Model for each Dependent project
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

  get allElements(): PackageableElement[] {
    return this.models.flatMap((dep) => dep.allOwnElements);
  }

  get models(): BasicModel[] {
    return Array.from(this.projectDependencyModelsIndex.values());
  }

  getOwnProfile = (path: string): Profile | undefined =>
    this.models.map((dep) => dep.getOwnProfile(path)).find(isNonNullable);
  getOwnType = (path: string): Type | undefined =>
    this.models.map((dep) => dep.getOwnType(path)).find(isNonNullable);
  getOwnClass = (path: string): Class | undefined =>
    this.models.map((dep) => dep.getOwnClass(path)).find(isNonNullable);
  getOwnEnumeration = (path: string): Enumeration | undefined =>
    this.models.map((dep) => dep.getOwnEnumeration(path)).find(isNonNullable);
  getOwnMeasure = (path: string): Measure | undefined =>
    this.models.map((dep) => dep.getOwnMeasure(path)).find(isNonNullable);
  getOwnUnit = (path: string): Unit | undefined =>
    this.models.map((dep) => dep.getOwnUnit(path)).find(isNonNullable);
  getOwnAssociation = (path: string): Association | undefined =>
    this.models.map((dep) => dep.getOwnAssociation(path)).find(isNonNullable);
  getOwnFunction = (path: string): ConcreteFunctionDefinition | undefined =>
    this.models.map((dep) => dep.getOwnFunction(path)).find(isNonNullable);
  getOwnStore = (path: string): Store | undefined =>
    this.models.map((dep) => dep.getOwnStore(path)).find(isNonNullable);
  getOwnMapping = (path: string): Mapping | undefined =>
    this.models.map((dep) => dep.getOwnMapping(path)).find(isNonNullable);
  getOwnConnection = (path: string): PackageableConnection | undefined =>
    this.models.map((dep) => dep.getOwnConnection(path)).find(isNonNullable);
  getOwnRuntime = (path: string): PackageableRuntime | undefined =>
    this.models.map((dep) => dep.getOwnRuntime(path)).find(isNonNullable);
  getOwnService = (path: string): Service | undefined =>
    this.models.map((dep) => dep.getOwnService(path)).find(isNonNullable);
  getOwnGenerationSpecification = (
    path: string,
  ): GenerationSpecification | undefined =>
    this.models
      .map((dep) => dep.getOwnGenerationSpecification(path))
      .find(isNonNullable);
  getOwnFileGeneration = (
    path: string,
  ): FileGenerationSpecification | undefined =>
    this.models
      .map((dep) => dep.getOwnFileGeneration(path))
      .find(isNonNullable);
  getOwnSectionIndex = (path: string): SectionIndex | undefined =>
    this.models.map((dep) => dep.getOwnSectionIndex(path)).find(isNonNullable);

  getOwnExtensionElement<T extends PackageableElement>(
    path: string,
    extensionElementClass: Clazz<T>,
  ): T | undefined {
    return this.models
      .map((dep) =>
        dep.getExtensionForElementClass(extensionElementClass).getElement(path),
      )
      .find(isNonNullable);
  }

  get profiles(): Profile[] {
    return this.models.map((dep) => Array.from(dep.ownProfiles)).flat();
  }
  get enumerations(): Enumeration[] {
    return this.models.map((dep) => Array.from(dep.ownEnumerations)).flat();
  }
  get measures(): Measure[] {
    return this.models.map((dep) => Array.from(dep.ownMeasures)).flat();
  }
  get units(): Unit[] {
    return this.models.map((dep) => Array.from(dep.ownUnits)).flat();
  }
  get classes(): Class[] {
    return this.models.map((dep) => Array.from(dep.ownClasses)).flat();
  }
  get types(): Type[] {
    return this.models.map((dep) => Array.from(dep.ownTypes)).flat();
  }
  get associations(): Association[] {
    return this.models.map((dep) => Array.from(dep.ownAssociations)).flat();
  }
  get functions(): ConcreteFunctionDefinition[] {
    return this.models.map((dep) => Array.from(dep.ownFunctions)).flat();
  }
  get stores(): Store[] {
    return this.models.map((dep) => Array.from(dep.ownStores)).flat();
  }
  get databases(): Database[] {
    return this.models.map((dep) => Array.from(dep.ownDatabases)).flat();
  }
  get mappings(): Mapping[] {
    return this.models.map((dep) => Array.from(dep.ownMappings)).flat();
  }
  get services(): Service[] {
    return this.models.map((dep) => Array.from(dep.ownServices)).flat();
  }
  get runtimes(): PackageableRuntime[] {
    return this.models.map((dep) => Array.from(dep.ownRuntimes)).flat();
  }
  get connections(): PackageableConnection[] {
    return this.models.map((dep) => Array.from(dep.ownConnections)).flat();
  }
  get fileGenerations(): FileGenerationSpecification[] {
    return this.models.map((dep) => Array.from(dep.ownFileGenerations)).flat();
  }
  get generationSpecifications(): GenerationSpecification[] {
    return this.models
      .map((dep) => Array.from(dep.ownGenerationSpecifications))
      .flat();
  }
  get sectionIndices(): SectionIndex[] {
    return this.models.map((dep) => Array.from(dep.ownSectionIndices)).flat();
  }
  getExtensionElements<T extends PackageableElement>(
    extensionElementClass: Clazz<T>,
  ): T[] {
    return this.models
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
    const model = this.models.find((dep) =>
      Boolean(dep.getOwnNullableElement(path, includePackage)),
    );
    return model?.getOwnNullableElement(path, includePackage);
  }
}
