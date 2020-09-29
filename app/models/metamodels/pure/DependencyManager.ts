/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, computed, action } from 'mobx';
import { ROOT_PACKAGE_NAME } from 'MetaModelConst';
import { guaranteeNonNullable, isNonNullable } from 'Utilities/GeneralUtil';
import { ProjectDependencyMetadata } from 'SDLC/configuration/ProjectDependency';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { Text } from 'MM/model/packageableElements/text/Text';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Store } from 'MM/model/packageableElements/store/Store';
import { Association } from 'MM/model/packageableElements/domain/Association';
import { BasicModel } from 'MM/BasicModel';
import { PackageableRuntime } from './model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from './model/packageableElements/connection/PackageableConnection';
import { FileGeneration } from './model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from './model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure, Unit } from './model/packageableElements/domain/Measure';
import { SectionIndex } from 'MM/model/packageableElements/section/SectionIndex';

export class DependencyModel extends BasicModel {
  constructor() {
    super(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  }
}

export class DependencyManager {
  @observable root = new Package(ROOT_PACKAGE_NAME.PROJECT_DEPENDENCY_ROOT);
  @observable projectDependencyModelsIndex = new Map<string, BasicModel>();
  @observable isBuilt = false;
  @observable failedToBuild = false;

  @action setFailedToBuild(failedToBuild: boolean): void { this.failedToBuild = failedToBuild }

  /**
  * Here we initialize a Dependency Pure Model for each Dependent project
  */
  initialize(projectDependencyMetadataMap: Map<string, ProjectDependencyMetadata>): void {
    Array.from(projectDependencyMetadataMap.keys()).forEach(dependencyKey => {
      // Note: all dependency models will share the dependency manager package root.
      const dependentModel = new DependencyModel();
      dependentModel.root = this.root; // make all dependency tree shares the same root
      this.projectDependencyModelsIndex.set(dependencyKey, dependentModel);
    });
  }

  get hasDependencies(): boolean { return Boolean(this.projectDependencyModelsIndex.size) }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @computed get allElements(): PackageableElement[] {
    return [
      ...this.profiles,
      ...this.enumerations,
      ...this.measures,
      ...this.classes,
      ...this.associations,
      ...this.functions,
      ...this.stores,
      ...this.mappings,
      ...this.diagrams,
      ...this.texts,
      ...this.runtimes,
      ...this.connections,
      ...this.fileGenerations,
      ...this.generationSpecifications,
    ];
  }

  @computed get models(): BasicModel[] { return Array.from(this.projectDependencyModelsIndex.values()) }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getOwnProfile = (path: string): Profile | undefined => this.models.map(dep => dep.getOwnProfile(path)).find(isNonNullable)
  getOwnType = (path: string): Type | undefined => this.models.map(dep => dep.getOwnType(path)).find(isNonNullable)
  getOwnClass = (path: string): Class | undefined => this.models.map(dep => dep.getOwnClass(path)).find(isNonNullable)
  getOwnEnumeration = (path: string): Enumeration | undefined => this.models.map(dep => dep.getOwnEnumeration(path)).find(isNonNullable)
  getOwnMeasure = (path: string): Measure | undefined => this.models.map(dep => dep.getOwnMeasure(path)).find(isNonNullable)
  getOwnUnit = (path: string): Unit | undefined => this.models.map(dep => dep.getOwnUnit(path)).find(isNonNullable)
  getOwnAssociation = (path: string): Association | undefined => this.models.map(dep => dep.getOwnAssociation(path)).find(isNonNullable)
  getOwnFunction = (path: string): ConcreteFunctionDefinition | undefined => this.models.map(dep => dep.getOwnFunction(path)).find(isNonNullable)
  getOwnStore = (path: string): Store | undefined => this.models.map(dep => dep.getOwnStore(path)).find(isNonNullable)
  getOwnMapping = (path: string): Mapping | undefined => this.models.map(dep => dep.getOwnMapping(path)).find(isNonNullable)
  getOwnConnection = (path: string): PackageableConnection | undefined => this.models.map(dep => dep.getOwnConnection(path)).find(isNonNullable)
  getOwnRuntime = (path: string): PackageableRuntime | undefined => this.models.map(dep => dep.getOwnRuntime(path)).find(isNonNullable)
  getOwnGenerationSpecification = (path: string): GenerationSpecification | undefined => this.models.map(dep => dep.getOwnGenerationSpecification(path)).find(isNonNullable)
  getOwnFileGeneration = (path: string): FileGeneration | undefined => this.models.map(dep => dep.getOwnFileGeneration(path)).find(isNonNullable)
  getOwnDiagram = (path: string): Diagram | undefined => this.models.map(dep => dep.getOwnDiagram(path)).find(isNonNullable)
  getOwnText = (path: string): Text | undefined => this.models.map(dep => dep.getOwnText(path)).find(isNonNullable)
  getOwnSectionIndex = (path: string): SectionIndex | undefined => this.models.map(dep => dep.getOwnSectionIndex(path)).find(isNonNullable)

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @computed get profiles(): Profile[] { return this.models.map(dep => Array.from(dep.profiles)).flat() }
  @computed get enumerations(): Enumeration[] { return this.models.map(dep => Array.from(dep.enumerations)).flat() }
  @computed get measures(): Measure[] { return this.models.map(dep => Array.from(dep.measures)).flat() }
  @computed get units(): Unit[] { return this.models.map(dep => Array.from(dep.units)).flat() }
  @computed get classes(): Class[] { return this.models.map(dep => Array.from(dep.classes)).flat() }
  @computed get types(): Type[] { return this.models.map(dep => Array.from(dep.types)).flat() }
  @computed get associations(): Association[] { return this.models.map(dep => Array.from(dep.associations)).flat() }
  @computed get functions(): ConcreteFunctionDefinition[] { return this.models.map(dep => Array.from(dep.functions)).flat() }
  @computed get stores(): Store[] { return this.models.map(dep => Array.from(dep.stores)).flat() }
  @computed get mappings(): Mapping[] { return this.models.map(dep => Array.from(dep.mappings)).flat() }
  @computed get diagrams(): Diagram[] { return this.models.map(dep => Array.from(dep.diagrams)).flat() }
  @computed get texts(): Text[] { return this.models.map(dep => Array.from(dep.texts)).flat() }
  @computed get runtimes(): PackageableRuntime[] { return this.models.map(dep => Array.from(dep.runtimes)).flat() }
  @computed get connections(): PackageableConnection[] { return this.models.map(dep => Array.from(dep.connections)).flat() }
  @computed get fileGenerations(): FileGeneration[] { return this.models.map(dep => Array.from(dep.fileGenerations)).flat() }
  @computed get generationSpecifications(): GenerationSpecification[] { return this.models.map(dep => Array.from(dep.generationSpecifications)).flat() }
  @computed get sectionIndices(): SectionIndex[] { return this.models.map(dep => Array.from(dep.sectionIndices)).flat() }

  getModel(projectId: string): BasicModel {
    return guaranteeNonNullable(this.projectDependencyModelsIndex.get(projectId), `Can't find dependency model with project ID '${projectId}'`);
  }

  getNullableElement(path: string, includePackage?: boolean): PackageableElement | undefined {
    const model = this.models.find(dep => Boolean(dep.getNullableElement(path, includePackage)));
    return model?.getNullableElement(path, includePackage);
  }

  @action setIsBuilt(built: boolean): void { this.isBuilt = built }
}
