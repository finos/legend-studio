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

import { observable, computed, action, flow, makeObservable } from 'mobx';
import type { Clazz } from '@finos/legend-studio-shared';
import {
  UnsupportedOperationError,
  getClass,
  guaranteeNonNullable,
  IllegalStateError,
  returnUndefOnError,
} from '@finos/legend-studio-shared';
import type { ROOT_PACKAGE_NAME } from '../../../MetaModelConst';
import { ELEMENT_PATH_DELIMITER } from '../../../MetaModelConst';
import type { Logger } from '../../../../utils/Logger';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import { Package } from '../model/packageableElements/domain/Package';
import { Type } from '../model/packageableElements/domain/Type';
import { Association } from '../model/packageableElements/domain/Association';
import { Mapping } from '../model/packageableElements/mapping/Mapping';
import { Class } from '../model/packageableElements/domain/Class';
import { Enumeration } from '../model/packageableElements/domain/Enumeration';
import { PackageableElement } from '../model/packageableElements/PackageableElement';
import { Profile } from '../model/packageableElements/domain/Profile';
import { Diagram } from '../model/packageableElements/diagram/Diagram';
import { Service } from '../model/packageableElements/service/Service';
import { ConcreteFunctionDefinition } from '../model/packageableElements/domain/ConcreteFunctionDefinition';
import { Store } from '../model/packageableElements/store/Store';
import { FlatData } from '../model/packageableElements/store/flatData/model/FlatData';
import { PackageableRuntime } from '../model/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from '../model/packageableElements/connection/PackageableConnection';
import { FileGenerationSpecification } from '../model/packageableElements/fileGeneration/FileGenerationSpecification';
import { GenerationSpecification } from '../model/packageableElements/generationSpecification/GenerationSpecification';
import { Unit, Measure } from '../model/packageableElements/domain/Measure';
import { Database } from '../model/packageableElements/store/relational/model/Database';
import { SectionIndex } from '../model/packageableElements/section/SectionIndex';
import type { Section } from '../model/packageableElements/section/Section';
import { ServiceStore } from '../model/packageableElements/store/relational/model/ServiceStore';
import { PureGraphExtension } from './PureGraphExtension';
import { PrimitiveType } from '../model/packageableElements/domain/PrimitiveType';
import { DataType } from '../model/packageableElements/domain/DataType';

const FORBIDDEN_EXTENSION_ELEMENT_CLASS = new Set([
  PackageableElement,
  Type,
  DataType,
  PrimitiveType,
  Class,
  Association,
  Enumeration,
  ConcreteFunctionDefinition,
  Profile,
  Measure,
  Unit,
  SectionIndex,
  Store,
  Mapping,
  PackageableConnection,
  PackageableRuntime,
  Service,
  Diagram,
  GenerationSpecification,
  FileGenerationSpecification,
]);

export abstract class BasicModel {
  root: Package;
  isBuilt = false;
  failedToBuild = false;
  private readonly extensions: PureGraphExtension<PackageableElement>[] = [];

  setFailedToBuild(failedToBuild: boolean): void {
    this.failedToBuild = failedToBuild;
  }

  private elementSectionMap = new Map<string, Section>();

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  private sectionIndicesIndex = new Map<string, SectionIndex>();
  private readonly profilesIndex = new Map<string, Profile>();
  private readonly typesIndex = new Map<string, Type>();
  private readonly associationsIndex = new Map<string, Association>();
  private readonly functionsIndex = new Map<
    string,
    ConcreteFunctionDefinition
  >();
  private readonly storesIndex = new Map<string, Store>();
  private readonly mappingsIndex = new Map<string, Mapping>();
  private readonly connectionsIndex = new Map<string, PackageableConnection>();
  private readonly runtimesIndex = new Map<string, PackageableRuntime>();
  private readonly servicesIndex = new Map<string, Service>();
  private readonly generationSpecificationsIndex = new Map<
    string,
    GenerationSpecification
  >();
  private readonly fileGenerationsIndex = new Map<
    string,
    FileGenerationSpecification
  >();
  private readonly diagramsIndex = new Map<string, Diagram>();

  constructor(
    rootPackageName: ROOT_PACKAGE_NAME,
    extensionElementClasses: Clazz<PackageableElement>[],
  ) {
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
      | 'diagramsIndex'
      | 'extensions'
    >(this, {
      root: observable,
      isBuilt: observable,
      failedToBuild: observable,
      setFailedToBuild: action,
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
      diagramsIndex: observable,
      sectionIndices: computed,
      extensions: observable,
      profiles: computed,
      enumerations: computed,
      measures: computed,
      units: computed,
      classes: computed,
      types: computed,
      associations: computed,
      functions: computed,
      stores: computed,
      flatDatas: computed,
      databases: computed,
      serviceStores: computed,
      mappings: computed,
      services: computed,
      diagrams: computed,
      runtimes: computed,
      connections: computed,
      fileGenerations: computed,
      generationSpecifications: computed,
      setSection: action,
      setSectionIndex: action,
      setProfile: action,
      setType: action,
      setAssociation: action,
      setFunction: action,
      setStore: action,
      setMapping: action,
      setConnection: action,
      setRuntime: action,
      setService: action,
      setGenerationSpecification: action,
      setFileGeneration: action,
      setDiagram: action,
      allElements: computed,
      removeElement: action,
      setIsBuilt: action,
      deleteSectionIndex: action,
    });

    this.root = new Package(rootPackageName);
    this.extensions = this.createGraphExtensions(extensionElementClasses);
  }

  private createGraphExtensions(
    extensionElementClasses: Clazz<PackageableElement>[],
  ): PureGraphExtension<PackageableElement>[] {
    return extensionElementClasses.map((extensionElementClass) => {
      if (FORBIDDEN_EXTENSION_ELEMENT_CLASS.has(extensionElementClass)) {
        throw new IllegalStateError(
          `Pure graph extension not allowed for the specified class. Consider removing this extension from plugins.`,
        );
      }
      return new PureGraphExtension(extensionElementClass);
    });
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  get sectionIndices(): SectionIndex[] {
    return Array.from(this.sectionIndicesIndex.values());
  }
  get profiles(): Profile[] {
    return Array.from(this.profilesIndex.values());
  }
  get enumerations(): Enumeration[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Enumeration => type instanceof Enumeration,
    );
  }
  get measures(): Measure[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Measure => type instanceof Measure,
    );
  }
  get units(): Unit[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Unit => type instanceof Unit,
    );
  }
  get classes(): Class[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Class => type instanceof Class,
    );
  }
  get types(): Type[] {
    return Array.from(this.typesIndex.values());
  }
  get associations(): Association[] {
    return Array.from(this.associationsIndex.values());
  }
  get functions(): ConcreteFunctionDefinition[] {
    return Array.from(this.functionsIndex.values());
  }
  get stores(): Store[] {
    return Array.from(this.storesIndex.values());
  }
  get flatDatas(): FlatData[] {
    return Array.from(this.storesIndex.values()).filter(
      (store: Store): store is FlatData => store instanceof FlatData,
    );
  }
  get databases(): Database[] {
    return Array.from(this.storesIndex.values()).filter(
      (store: Store): store is Database => store instanceof Database,
    );
  }
  get serviceStores(): ServiceStore[] {
    return Array.from(this.storesIndex.values()).filter(
      (store: Store): store is ServiceStore => store instanceof ServiceStore,
    );
  }
  get mappings(): Mapping[] {
    return Array.from(this.mappingsIndex.values());
  }
  get services(): Service[] {
    return Array.from(this.servicesIndex.values());
  }
  get diagrams(): Diagram[] {
    return Array.from(this.diagramsIndex.values());
  }
  get runtimes(): PackageableRuntime[] {
    return Array.from(this.runtimesIndex.values());
  }
  get connections(): PackageableConnection[] {
    return Array.from(this.connectionsIndex.values());
  }
  get fileGenerations(): FileGenerationSpecification[] {
    return Array.from(this.fileGenerationsIndex.values());
  }
  get generationSpecifications(): GenerationSpecification[] {
    return Array.from(this.generationSpecificationsIndex.values());
  }

  getExtensionForElementClass<T extends PackageableElement>(
    _class: Clazz<T>,
  ): PureGraphExtension<T> {
    const extensions = this.extensions.filter(
      (extension) => extension.getElementClass() === _class,
    );
    if (extensions.length === 0) {
      throw new UnsupportedOperationError(
        `Can't find graph extension for the specified element class. No compatible graph extensions available from plugins.`,
      );
    } else if (extensions.length > 1) {
      throw new IllegalStateError(
        `Found multiple extensions for the specified element class`,
      );
    }
    return extensions[0] as PureGraphExtension<T>;
  }

  getSection = (path: string): Section | undefined =>
    this.elementSectionMap.get(path);
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getOwnSectionIndex = (path: string): SectionIndex | undefined =>
    this.sectionIndicesIndex.get(path);
  getOwnProfile = (path: string): Profile | undefined =>
    this.profilesIndex.get(path);
  getOwnType = (path: string): Type | undefined => this.typesIndex.get(path);
  getOwnClass = (path: string): Class | undefined => {
    const el = this.getOwnType(path);
    return el instanceof Class ? el : undefined;
  };
  getOwnEnumeration = (path: string): Enumeration | undefined => {
    const el = this.getOwnType(path);
    return el instanceof Enumeration ? el : undefined;
  };
  getOwnMeasure = (path: string): Measure | undefined => {
    const el = this.getOwnType(path);
    return el instanceof Measure ? el : undefined;
  };
  getOwnUnit = (path: string): Unit | undefined => {
    const el = this.getOwnType(path);
    return el instanceof Unit ? el : undefined;
  };
  getOwnAssociation = (path: string): Association | undefined =>
    this.associationsIndex.get(path);
  getOwnFunction = (path: string): ConcreteFunctionDefinition | undefined =>
    this.functionsIndex.get(path);
  getOwnStore = (path: string): Store | undefined => this.storesIndex.get(path);
  getOwnMapping = (path: string): Mapping | undefined =>
    this.mappingsIndex.get(path);
  getOwnConnection = (path: string): PackageableConnection | undefined =>
    this.connectionsIndex.get(path);
  getOwnRuntime = (path: string): PackageableRuntime | undefined =>
    this.runtimesIndex.get(path);
  getOwnService = (path: string): Service | undefined =>
    this.servicesIndex.get(path);
  getOwnGenerationSpecification = (
    path: string,
  ): GenerationSpecification | undefined =>
    this.generationSpecificationsIndex.get(path);
  getOwnFileGeneration = (
    path: string,
  ): FileGenerationSpecification | undefined =>
    this.fileGenerationsIndex.get(path);
  getOwnDiagram = (path: string): Diagram | undefined =>
    this.diagramsIndex.get(path);

  getOwnExtensionElement<T extends PackageableElement>(
    path: string,
    extensionElementClass: Clazz<T>,
  ): T | undefined {
    const extension = this.getExtensionForElementClass(extensionElementClass);
    return extension.getElement(path);
  }

  setSection(path: string, val: Section): void {
    this.elementSectionMap.set(path, val);
  }
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  setSectionIndex(path: string, val: SectionIndex): void {
    this.sectionIndicesIndex.set(path, val);
  }
  setProfile(path: string, val: Profile): void {
    this.profilesIndex.set(path, val);
  }
  setType(path: string, val: Type): void {
    this.typesIndex.set(path, val);
  }
  setAssociation(path: string, val: Association): void {
    this.associationsIndex.set(path, val);
  }
  setFunction(path: string, val: ConcreteFunctionDefinition): void {
    this.functionsIndex.set(path, val);
  }
  setStore(path: string, val: Store): void {
    this.storesIndex.set(path, val);
  }
  setMapping(path: string, val: Mapping): void {
    this.mappingsIndex.set(path, val);
  }
  setConnection(path: string, val: PackageableConnection): void {
    this.connectionsIndex.set(path, val);
  }
  setRuntime(path: string, val: PackageableRuntime): void {
    this.runtimesIndex.set(path, val);
  }
  setService(path: string, val: Service): void {
    this.servicesIndex.set(path, val);
  }
  setGenerationSpecification(path: string, val: GenerationSpecification): void {
    this.generationSpecificationsIndex.set(path, val);
  }
  setFileGeneration(path: string, val: FileGenerationSpecification): void {
    this.fileGenerationsIndex.set(path, val);
  }
  setDiagram(path: string, val: Diagram): void {
    this.diagramsIndex.set(path, val);
  }

  setElementInExtension<T extends PackageableElement>(
    path: string,
    val: T,
    extensionElementClass: Clazz<T>,
  ): void {
    const extension = this.getExtensionForElementClass(extensionElementClass);
    extension.setElement(path, val);
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  get allElements(): PackageableElement[] {
    this.extensions.flatMap((extension) => extension.elements);
    return [
      ...this.profiles,
      ...this.enumerations,
      ...this.measures,
      ...this.classes,
      ...this.associations,
      ...this.functions,
      ...this.stores,
      ...this.mappings,
      ...this.services,
      ...this.diagrams,
      ...this.runtimes,
      ...this.connections,
      ...this.generationSpecifications,
      ...this.fileGenerations,
      ...this.extensions.flatMap((extension) => extension.elements),
    ];
  }

  /**
   * Dispose the current graph and any potential reference from parts outside of the graph to the graph
   * This is a MUST to prevent memory-leak as we use referneces to link between objects instead of string pointers
   */
  dispose = flow(function* (this: BasicModel, logger: Logger, quiet?: boolean) {
    const startTime = Date.now();
    if (this.allElements.length) {
      yield Promise.all<void>(
        this.allElements.map(
          (element) =>
            new Promise((resolve) =>
              setTimeout(() => {
                element.dispose();
                resolve();
              }, 0),
            ),
        ),
      );
    }
    if (!quiet) {
      logger.info(
        CORE_LOG_EVENT.GRAPH_HASHES_DISPOSED,
        '[ASYNC]',
        Date.now() - startTime,
        'ms',
      );
    }
  });

  isRoot = (pack: Package | undefined): boolean => pack === this.root;

  buildPackageString = (
    packageName: string | undefined,
    name: string | undefined,
  ): string =>
    `${guaranteeNonNullable(
      packageName,
      'Package name is required',
    )}${ELEMENT_PATH_DELIMITER}${guaranteeNonNullable(
      name,
      'Name is required',
    )}`;

  getOrCreatePackageWithPackageName = (
    packageName: string | undefined,
  ): Package =>
    Package.getOrCreatePackage(
      this.root,
      guaranteeNonNullable(packageName, 'Package name is required'),
      true,
    );

  getNullablePackage = (path: string): Package | undefined =>
    !path
      ? this.root
      : returnUndefOnError(() =>
          Package.getOrCreatePackage(this.root, path, false),
        );

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getNullableElement(
    path: string,
    includePackage?: boolean,
  ): PackageableElement | undefined {
    let element: PackageableElement | undefined =
      this.sectionIndicesIndex.get(path) ??
      this.typesIndex.get(path) ??
      this.profilesIndex.get(path) ??
      this.associationsIndex.get(path) ??
      this.functionsIndex.get(path) ??
      this.storesIndex.get(path) ??
      this.mappingsIndex.get(path) ??
      this.servicesIndex.get(path) ??
      this.diagramsIndex.get(path) ??
      this.runtimesIndex.get(path) ??
      this.connectionsIndex.get(path) ??
      this.fileGenerationsIndex.get(path) ??
      this.generationSpecificationsIndex.get(path);
    if (!element) {
      for (const extension of this.extensions) {
        const extensionElement = extension.getElement(path);
        if (extensionElement) {
          element = extensionElement;
          break;
        }
      }
    }
    if (includePackage && !element) {
      return this.getNullablePackage(path);
    }
    return element;
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  removeElement(element: PackageableElement): void {
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
        if (element.canonicalUnit) {
          this.typesIndex.delete(element.canonicalUnit.path);
        }
        element.nonCanonicalUnits.forEach((unit) =>
          this.typesIndex.delete(unit.path),
        ); // also delete all related units
      }
    } else if (element instanceof Association) {
      this.associationsIndex.delete(element.path);
    } else if (element instanceof Profile) {
      this.profilesIndex.delete(element.path);
    } else if (element instanceof ConcreteFunctionDefinition) {
      this.functionsIndex.delete(element.path);
    } else if (element instanceof Diagram) {
      this.diagramsIndex.delete(element.path);
    } else if (element instanceof Service) {
      this.servicesIndex.delete(element.path);
    } else if (element instanceof PackageableRuntime) {
      this.runtimesIndex.delete(element.path);
    } else if (element instanceof PackageableConnection) {
      this.connectionsIndex.delete(element.path);
    } else if (element instanceof FileGenerationSpecification) {
      this.fileGenerationsIndex.delete(element.path);
    } else if (element instanceof GenerationSpecification) {
      this.generationSpecificationsIndex.delete(element.path);
    } else if (element instanceof Package) {
      element.children.forEach((el) => this.removeElement(el));
    } else {
      const extension = this.getExtensionForElementClass(
        getClass<PackageableElement>(element),
      );
      extension.removeElement(element.path);
    }
  }

  setIsBuilt(built: boolean): void {
    this.isBuilt = built;
  }

  // TODO: this will be removed once we fully support section index in SDLC flow
  deleteSectionIndex(): void {
    this.sectionIndicesIndex.forEach((sectionIndex) => {
      sectionIndex.setIsDeleted(true);
      this.sectionIndicesIndex.delete(sectionIndex.path);
    });
    // NOTE: we have to do this because right now we don't add section index to the package tree
    // as such `this.sectionIndicesIndex.delete(sectionIndex.path)` won't work because the path is without the package
    this.sectionIndicesIndex = new Map<string, SectionIndex>();
    this.elementSectionMap = new Map<string, Section>();
  }
}
