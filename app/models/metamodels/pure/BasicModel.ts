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

import { observable, computed, action, flow } from 'mobx';
import { guaranteeNonNullable, returnUndefOnError, UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { ROOT_PACKAGE_NAME, ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Association } from 'MM/model/packageableElements/domain/Association';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { Text } from 'MM/model/packageableElements/text/Text';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Store } from 'MM/model/packageableElements/store/Store';
import { PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { FileGeneration } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification } from './model/packageableElements/generationSpecification/GenerationSpecification';
import { Unit, Measure } from './model/packageableElements/domain/Measure';
import { SectionIndex } from 'MM/model/packageableElements/section/SectionIndex';
import { Section } from './model/packageableElements/section/Section';

export abstract class BasicModel {
  @observable root: Package;
  @observable isBuilt = false;
  @observable failedToBuild = false;

  @action setFailedToBuild(failedToBuild: boolean): void { this.failedToBuild = failedToBuild }

  @observable private elementSectionMap = new Map<string, Section>();

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @observable private sectionIndicesIndex = new Map<string, SectionIndex>();
  @observable private profilesIndex = new Map<string, Profile>();
  @observable private typesIndex = new Map<string, Type>();
  @observable private associationsIndex = new Map<string, Association>();
  @observable private functionsIndex = new Map<string, ConcreteFunctionDefinition>();
  @observable private storesIndex = new Map<string, Store>();
  @observable private mappingsIndex = new Map<string, Mapping>();
  @observable private connectionsIndex = new Map<string, PackageableConnection>();
  @observable private runtimesIndex = new Map<string, PackageableRuntime>();
  @observable private generationSpecificationsIndex = new Map<string, GenerationSpecification>();
  @observable private fileGenerationsIndex = new Map<string, FileGeneration>();
  @observable private diagramsIndex = new Map<string, Diagram>();
  @observable private textsIndex = new Map<string, Text>();

  constructor(rootPackageName: ROOT_PACKAGE_NAME) {
    this.root = new Package(rootPackageName);
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @computed get sectionIndices(): SectionIndex[] { return Array.from(this.sectionIndicesIndex.values()) }
  @computed get profiles(): Profile[] { return Array.from(this.profilesIndex.values()) }
  @computed get enumerations(): Enumeration[] { return Array.from(this.typesIndex.values()).filter((type: Type): type is Enumeration => type instanceof Enumeration) }
  @computed get measures(): Measure[] { return Array.from(this.typesIndex.values()).filter((type: Type): type is Measure => type instanceof Measure) }
  @computed get units(): Unit[] { return Array.from(this.typesIndex.values()).filter((type: Type): type is Unit => type instanceof Unit) }
  @computed get classes(): Class[] { return Array.from(this.typesIndex.values()).filter((type: Type): type is Class => type instanceof Class) }
  @computed get types(): Type[] { return Array.from(this.typesIndex.values()) }
  @computed get associations(): Association[] { return Array.from(this.associationsIndex.values()) }
  @computed get functions(): ConcreteFunctionDefinition[] { return Array.from(this.functionsIndex.values()) }
  @computed get stores(): Store[] { return Array.from(this.storesIndex.values()) }
  @computed get mappings(): Mapping[] { return Array.from(this.mappingsIndex.values()) }
  @computed get diagrams(): Diagram[] { return Array.from(this.diagramsIndex.values()) }
  @computed get texts(): Text[] { return Array.from(this.textsIndex.values()) }
  @computed get runtimes(): PackageableRuntime[] { return Array.from(this.runtimesIndex.values()) }
  @computed get connections(): PackageableConnection[] { return Array.from(this.connectionsIndex.values()) }
  @computed get fileGenerations(): FileGeneration[] { return Array.from(this.fileGenerationsIndex.values()) }
  @computed get generationSpecifications(): GenerationSpecification[] { return Array.from(this.generationSpecificationsIndex.values()) }

  getSection = (path: string): Section | undefined => this.elementSectionMap.get(path)
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getOwnSectionIndex = (path: string): SectionIndex | undefined => this.sectionIndicesIndex.get(path)
  getOwnProfile = (path: string): Profile | undefined => this.profilesIndex.get(path)
  getOwnType = (path: string): Type | undefined => this.typesIndex.get(path)
  getOwnClass = (path: string): Class | undefined => { const el = this.getOwnType(path); return el instanceof Class ? el : undefined }
  getOwnEnumeration = (path: string): Enumeration | undefined => { const el = this.getOwnType(path); return el instanceof Enumeration ? el : undefined }
  getOwnMeasure = (path: string): Measure | undefined => { const el = this.getOwnType(path); return el instanceof Measure ? el : undefined }
  getOwnUnit = (path: string): Unit | undefined => { const el = this.getOwnType(path); return el instanceof Unit ? el : undefined }
  getOwnAssociation = (path: string): Association | undefined => this.associationsIndex.get(path)
  getOwnFunction = (path: string): ConcreteFunctionDefinition | undefined => this.functionsIndex.get(path)
  getOwnStore = (path: string): Store | undefined => this.storesIndex.get(path)
  getOwnMapping = (path: string): Mapping | undefined => this.mappingsIndex.get(path);
  getOwnConnection = (path: string): PackageableConnection | undefined => this.connectionsIndex.get(path);
  getOwnRuntime = (path: string): PackageableRuntime | undefined => this.runtimesIndex.get(path);
  getOwnGenerationSpecification = (path: string): GenerationSpecification | undefined => this.generationSpecificationsIndex.get(path);
  getOwnFileGeneration = (path: string): FileGeneration | undefined => this.fileGenerationsIndex.get(path);
  getOwnDiagram = (path: string): Diagram | undefined => this.diagramsIndex.get(path);
  getOwnText = (path: string): Text | undefined => this.textsIndex.get(path);

  @action setSection(path: string, val: Section): void { this.elementSectionMap.set(path, val) }
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @action setSectionIndex(path: string, val: SectionIndex): void { this.sectionIndicesIndex.set(path, val) }
  @action setProfile(path: string, val: Profile): void { this.profilesIndex.set(path, val) }
  @action setType(path: string, val: Type): void { this.typesIndex.set(path, val) }
  @action setAssociation(path: string, val: Association): void { this.associationsIndex.set(path, val) }
  @action setFunction(path: string, val: ConcreteFunctionDefinition): void { this.functionsIndex.set(path, val) }
  @action setStore(path: string, val: Store): void { this.storesIndex.set(path, val) }
  @action setMapping(path: string, val: Mapping): void { this.mappingsIndex.set(path, val) }
  @action setConnection(path: string, val: PackageableConnection): void { this.connectionsIndex.set(path, val) }
  @action setRuntime(path: string, val: PackageableRuntime): void { this.runtimesIndex.set(path, val) }
  @action setGenerationSpecification(path: string, val: GenerationSpecification): void { this.generationSpecificationsIndex.set(path, val) }
  @action setFileGeneration(path: string, val: FileGeneration): void { this.fileGenerationsIndex.set(path, val) }
  @action setDiagram(path: string, val: Diagram): void { this.diagramsIndex.set(path, val) }
  @action setText(path: string, val: Text): void { this.textsIndex.set(path, val) }

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
      ...this.generationSpecifications
    ];
  }

  /**
   * Dispose the current graph and any potential reference from parts outside of the graph to the graph
   * This is a MUST to prevent memory-leak as we use referneces to link between objects instead of string pointers
   */
  dispose = flow(function* (this: BasicModel, quiet?: boolean) {
    const startTime = Date.now();
    if (this.allElements.length) {
      yield Promise.all(this.allElements.map(element => new Promise(resolve => setTimeout(() => {
        element.dispose();
        resolve();
      }, 0))));
    }
    quiet ? undefined : Log.info(LOG_EVENT.GRAPH_HASHES_DISPOSED, '[ASYNC]', Date.now() - startTime, 'ms');
  });

  isRoot = (pack: Package | undefined): boolean => pack === this.root;

  buildPackageString = (packageName: string | undefined, name: string | undefined): string =>
    `${guaranteeNonNullable(packageName, 'Package name is required')}${ENTITY_PATH_DELIMITER}${guaranteeNonNullable(name, 'Name is required')}`;

  getOrCreatePackageWithPackageName = (packageName: string | undefined): Package =>
    Package.getOrCreatePackage(this.root, guaranteeNonNullable(packageName, 'Package name is required'), true);

  getNullablePackage = (path: string): Package | undefined => !path ? this.root : returnUndefOnError(() => Package.getOrCreatePackage(this.root, path, false));

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getNullableElement(path: string, includePackage?: boolean): PackageableElement | undefined {
    const element = this.sectionIndicesIndex.get(path)
      ?? this.typesIndex.get(path)
      ?? this.profilesIndex.get(path)
      ?? this.associationsIndex.get(path)
      ?? this.functionsIndex.get(path)
      ?? this.storesIndex.get(path)
      ?? this.mappingsIndex.get(path)
      ?? this.diagramsIndex.get(path)
      ?? this.textsIndex.get(path)
      ?? this.runtimesIndex.get(path)
      ?? this.connectionsIndex.get(path)
      ?? this.fileGenerationsIndex.get(path)
      ?? this.generationSpecificationsIndex.get(path);
    if (includePackage && !element) {
      return this.getNullablePackage(path);
    }
    return element;
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @action removeElement(element: PackageableElement): void {
    if (element.package) {
      element.package.deleteElement(element);
    }
    if (element instanceof Mapping) {
      this.mappingsIndex.delete(element.path);
    } else if (element instanceof Store) {
      this.storesIndex.delete(element.path);
    } else if (element instanceof Type) {
      this.typesIndex.delete(element.path);
      if (element instanceof Measure) {
        this.typesIndex.delete(element.canonicalUnit.path);
        element.nonCanonicalUnits.forEach(unit => this.typesIndex.delete(unit.path)); // also delete all related units
      }
    } else if (element instanceof Association) {
      this.associationsIndex.delete(element.path);
    } else if (element instanceof Profile) {
      this.profilesIndex.delete(element.path);
    } else if (element instanceof ConcreteFunctionDefinition) {
      this.functionsIndex.delete(element.path);
    } else if (element instanceof Diagram) {
      this.diagramsIndex.delete(element.path);
    } else if (element instanceof Text) {
      this.textsIndex.delete(element.path);
    } else if (element instanceof PackageableRuntime) {
      this.runtimesIndex.delete(element.path);
    } else if (element instanceof PackageableConnection) {
      this.connectionsIndex.delete(element.path);
    } else if (element instanceof FileGeneration) {
      this.fileGenerationsIndex.delete(element.path);
    } else if (element instanceof GenerationSpecification) {
      this.generationSpecificationsIndex.delete(element.path);
    } else if (element instanceof Package) {
      element.children.forEach(element => this.removeElement(element));
    } else {
      throw new UnsupportedOperationError(`Can't delete element of unsupported type '${element.constructor.name}'`);
    }
  }

  @action setIsBuilt(built: boolean): void { this.isBuilt = built }

  // WIP: this will be removed once we fully support section index in SDLC flow
  @action deleteSectionIndex(): void {
    this.sectionIndicesIndex.forEach(sectionIndex => {
      sectionIndex.setIsDeleted(true);
      this.sectionIndicesIndex.delete(sectionIndex.path);
    });
    // NOTE: we have to do this because right now we don't add section index to the package tree
    // as such `this.sectionIndicesIndex.delete(sectionIndex.path)` won't work because the path is without the package
    this.sectionIndicesIndex = new Map<string, SectionIndex>();
    this.elementSectionMap = new Map<string, Section>();
  }
}
