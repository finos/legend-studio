/**
 * Copyright Goldman Sachs
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

import { observable, computed, action, makeObservable } from 'mobx';
import { ROOT_PACKAGE_NAME } from '../../../MetaModelConst';
import type { Clazz } from '@finos/legend-studio-shared';
import {
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-studio-shared';
import type { ProjectDependencyMetadata } from '../../../sdlc/models/configuration/ProjectDependency';
import type { PackageableElement } from '../model/packageableElements/PackageableElement';
import type { Enumeration } from '../model/packageableElements/domain/Enumeration';
import type { Type } from '../model/packageableElements/domain/Type';
import type { Class } from '../model/packageableElements/domain/Class';
import type { Mapping } from '../model/packageableElements/mapping/Mapping';
import type { Profile } from '../model/packageableElements/domain/Profile';
import { Package } from '../model/packageableElements/domain/Package';
import type { Diagram } from '../model/packageableElements/diagram/Diagram';
import type { ConcreteFunctionDefinition } from '../model/packageableElements/domain/ConcreteFunctionDefinition';
import type { Store } from '../model/packageableElements/store/Store';
import type { Association } from '../model/packageableElements/domain/Association';
import type { Service } from '../model/packageableElements/service/Service';
import { BasicModel } from '../graph/BasicModel';
import type { PackageableRuntime } from '../model/packageableElements/runtime/PackageableRuntime';
import type { PackageableConnection } from '../model/packageableElements/connection/PackageableConnection';
import type { FileGenerationSpecification } from '../model/packageableElements/fileGeneration/FileGenerationSpecification';
import type { GenerationSpecification } from '../model/packageableElements/generationSpecification/GenerationSpecification';
import type {
  Measure,
  Unit,
} from '../model/packageableElements/domain/Measure';
import type { SectionIndex } from '../model/packageableElements/section/SectionIndex';

export class DependencyModel extends BasicModel {
  constructor(extensionElementClasses: Clazz<PackageableElement>[]) {
    super(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT, extensionElementClasses);
  }
}

export class DependencyManager {
  root = new Package(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  projectDependencyModelsIndex = new Map<string, BasicModel>();
  isBuilt = false;
  failedToBuild = false;
  private readonly extensionElementClasses: Clazz<PackageableElement>[];

  constructor(extensionElementClasses: Clazz<PackageableElement>[]) {
    makeObservable(this, {
      root: observable,
      projectDependencyModelsIndex: observable,
      isBuilt: observable,
      failedToBuild: observable,
      setFailedToBuild: action,
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
      mappings: computed,
      services: computed,
      diagrams: computed,
      runtimes: computed,
      connections: computed,
      fileGenerations: computed,
      generationSpecifications: computed,
      sectionIndices: computed,
      setIsBuilt: action,
    });

    this.extensionElementClasses = extensionElementClasses;
  }

  setFailedToBuild(failedToBuild: boolean): void {
    this.failedToBuild = failedToBuild;
  }

  /**
   * Here we initialize a Dependency Pure Model for each Dependent project
   */
  initialize(
    projectDependencyMetadataMap: Map<string, ProjectDependencyMetadata>,
  ): void {
    Array.from(projectDependencyMetadataMap.keys()).forEach((dependencyKey) => {
      // Note: all dependency models will share the dependency manager package root.
      const dependentModel = new DependencyModel(this.extensionElementClasses);
      dependentModel.root = this.root; // make all dependency tree shares the same root
      this.projectDependencyModelsIndex.set(dependencyKey, dependentModel);
    });
  }

  get hasDependencies(): boolean {
    return Boolean(this.projectDependencyModelsIndex.size);
  }

  get allElements(): PackageableElement[] {
    return this.models.flatMap((dep) => dep.allElements);
  }

  get models(): BasicModel[] {
    return Array.from(this.projectDependencyModelsIndex.values());
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
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
  getOwnDiagram = (path: string): Diagram | undefined =>
    this.models.map((dep) => dep.getOwnDiagram(path)).find(isNonNullable);
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

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  get profiles(): Profile[] {
    return this.models.map((dep) => Array.from(dep.profiles)).flat();
  }
  get enumerations(): Enumeration[] {
    return this.models.map((dep) => Array.from(dep.enumerations)).flat();
  }
  get measures(): Measure[] {
    return this.models.map((dep) => Array.from(dep.measures)).flat();
  }
  get units(): Unit[] {
    return this.models.map((dep) => Array.from(dep.units)).flat();
  }
  get classes(): Class[] {
    return this.models.map((dep) => Array.from(dep.classes)).flat();
  }
  get types(): Type[] {
    return this.models.map((dep) => Array.from(dep.types)).flat();
  }
  get associations(): Association[] {
    return this.models.map((dep) => Array.from(dep.associations)).flat();
  }
  get functions(): ConcreteFunctionDefinition[] {
    return this.models.map((dep) => Array.from(dep.functions)).flat();
  }
  get stores(): Store[] {
    return this.models.map((dep) => Array.from(dep.stores)).flat();
  }
  get mappings(): Mapping[] {
    return this.models.map((dep) => Array.from(dep.mappings)).flat();
  }
  get services(): Service[] {
    return this.models.map((dep) => Array.from(dep.services)).flat();
  }
  get diagrams(): Diagram[] {
    return this.models.map((dep) => Array.from(dep.diagrams)).flat();
  }
  get runtimes(): PackageableRuntime[] {
    return this.models.map((dep) => Array.from(dep.runtimes)).flat();
  }
  get connections(): PackageableConnection[] {
    return this.models.map((dep) => Array.from(dep.connections)).flat();
  }
  get fileGenerations(): FileGenerationSpecification[] {
    return this.models.map((dep) => Array.from(dep.fileGenerations)).flat();
  }
  get generationSpecifications(): GenerationSpecification[] {
    return this.models
      .map((dep) => Array.from(dep.generationSpecifications))
      .flat();
  }
  get sectionIndices(): SectionIndex[] {
    return this.models.map((dep) => Array.from(dep.sectionIndices)).flat();
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
      Boolean(dep.getNullableElement(path, includePackage)),
    );
    return model?.getNullableElement(path, includePackage);
  }

  setIsBuilt(built: boolean): void {
    this.isBuilt = built;
  }
}
