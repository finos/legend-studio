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
  type Clazz,
  ActionState,
  UnsupportedOperationError,
  getClass,
  IllegalStateError,
  returnUndefOnError,
  promisify,
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
} from '@finos/legend-shared';
import type { ROOT_PACKAGE_NAME } from '../MetaModelConst';
import { Package } from '../models/metamodels/pure/packageableElements/domain/Package';
import { Type } from '../models/metamodels/pure/packageableElements/domain/Type';
import { Association } from '../models/metamodels/pure/packageableElements/domain/Association';
import { Mapping } from '../models/metamodels/pure/packageableElements/mapping/Mapping';
import { Class } from '../models/metamodels/pure/packageableElements/domain/Class';
import { Enumeration } from '../models/metamodels/pure/packageableElements/domain/Enumeration';
import { PackageableElement } from '../models/metamodels/pure/packageableElements/PackageableElement';
import { Profile } from '../models/metamodels/pure/packageableElements/domain/Profile';
import { Service } from '../models/metamodels/pure/packageableElements/service/Service';
import { ConcreteFunctionDefinition } from '../models/metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition';
import { Store } from '../models/metamodels/pure/packageableElements/store/Store';
import { FlatData } from '../models/metamodels/pure/packageableElements/store/flatData/model/FlatData';
import { PackageableRuntime } from '../models/metamodels/pure/packageableElements/runtime/PackageableRuntime';
import { PackageableConnection } from '../models/metamodels/pure/packageableElements/connection/PackageableConnection';
import { FileGenerationSpecification } from '../models/metamodels/pure/packageableElements/fileGeneration/FileGenerationSpecification';
import { GenerationSpecification } from '../models/metamodels/pure/packageableElements/generationSpecification/GenerationSpecification';
import {
  Unit,
  Measure,
} from '../models/metamodels/pure/packageableElements/domain/Measure';
import { Database } from '../models/metamodels/pure/packageableElements/store/relational/model/Database';
import { SectionIndex } from '../models/metamodels/pure/packageableElements/section/SectionIndex';
import type { Section } from '../models/metamodels/pure/packageableElements/section/Section';
import { PureGraphExtension } from './PureGraphExtension';
import { PrimitiveType } from '../models/metamodels/pure/packageableElements/domain/PrimitiveType';
import { DataType } from '../models/metamodels/pure/packageableElements/domain/DataType';
import {
  isValidFullPath,
  isValidPath,
  resolvePackagePathAndElementName,
} from '../MetaModelUtils';
import {
  addElementToPackage,
  deleteElementFromPackage,
  getOrCreateGraphPackage,
  getOrCreatePackage,
} from '../helpers/DomainHelper';
import { DataElement } from '../models/metamodels/pure/packageableElements/data/DataElement';
import type { Testable } from '../models/metamodels/pure/test/Testable';

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
  GenerationSpecification,
  FileGenerationSpecification,
  DataElement,
]);

/**
 * Since this is the basis of the Pure graph itself, it shares many methods with the graph.
 * But the graph holds references to many basic graphs and expose those to outside consumers
 * as if it is one graph.
 *
 * As such, to avoid confusion, we add `Own` to methods in basic graph for methods that only
 * deal with elements belonging to the basic graph.
 */
export abstract class BasicModel {
  root: Package;
  readonly extensions: PureGraphExtension<PackageableElement>[] = [];

  // TODO: to be moved, this is graph-manager logic and should be moved elsewhere
  buildState = ActionState.create();

  private elementSectionMap = new Map<string, Section>();

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
  private readonly dataElementsIndex = new Map<string, DataElement>();

  constructor(
    rootPackageName: ROOT_PACKAGE_NAME,
    extensionElementClasses: Clazz<PackageableElement>[],
  ) {
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

  get ownSectionIndices(): SectionIndex[] {
    return Array.from(this.sectionIndicesIndex.values());
  }
  get ownProfiles(): Profile[] {
    return Array.from(this.profilesIndex.values());
  }
  get ownEnumerations(): Enumeration[] {
    return Array.from(this.typesIndex.values()).filter(
      filterByType(Enumeration),
    );
  }
  get ownMeasures(): Measure[] {
    return Array.from(this.typesIndex.values()).filter(filterByType(Measure));
  }
  get ownClasses(): Class[] {
    return Array.from(this.typesIndex.values()).filter(filterByType(Class));
  }
  get ownTypes(): Type[] {
    return Array.from(this.typesIndex.values());
  }
  get ownAssociations(): Association[] {
    return Array.from(this.associationsIndex.values());
  }
  get ownFunctions(): ConcreteFunctionDefinition[] {
    return Array.from(this.functionsIndex.values());
  }
  get ownStores(): Store[] {
    return Array.from(this.storesIndex.values());
  }
  get ownFlatDatas(): FlatData[] {
    return Array.from(this.storesIndex.values()).filter(filterByType(FlatData));
  }
  get ownDatabases(): Database[] {
    return Array.from(this.storesIndex.values()).filter(filterByType(Database));
  }
  get ownMappings(): Mapping[] {
    return Array.from(this.mappingsIndex.values());
  }
  get ownServices(): Service[] {
    return Array.from(this.servicesIndex.values());
  }
  get ownRuntimes(): PackageableRuntime[] {
    return Array.from(this.runtimesIndex.values());
  }
  get ownConnections(): PackageableConnection[] {
    return Array.from(this.connectionsIndex.values());
  }
  get ownFileGenerations(): FileGenerationSpecification[] {
    return Array.from(this.fileGenerationsIndex.values());
  }
  get ownDataElements(): DataElement[] {
    return Array.from(this.dataElementsIndex.values());
  }
  get ownGenerationSpecifications(): GenerationSpecification[] {
    return Array.from(this.generationSpecificationsIndex.values());
  }

  get ownTestables(): Testable[] {
    return [
      ...this.ownServices,
      // TODO: add mappings once supported in the backend
      // ...this.ownMappings,
    ];
  }

  getExtensionElements<T extends PackageableElement>(
    extensionElementClass: Clazz<T>,
  ): T[] {
    return this.getExtensionForElementClass(extensionElementClass).elements;
  }

  getExtensionForElementClass<T extends PackageableElement>(
    _class: Clazz<T>,
  ): PureGraphExtension<T> {
    const extensions = this.extensions.filter(
      (extension) => extension.getElementClass() === _class,
    );
    if (extensions.length === 0) {
      throw new UnsupportedOperationError(
        `Can't find graph extension for the specified element class: no compatible graph extensions available from plugins`,
      );
    } else if (extensions.length > 1) {
      throw new IllegalStateError(
        `Found multiple extensions for the specified element class`,
      );
    }
    return extensions[0] as PureGraphExtension<T>;
  }

  getOwnNullableSection = (path: string): Section | undefined =>
    this.elementSectionMap.get(path);

  getOwnNullableSectionIndex = (path: string): SectionIndex | undefined =>
    this.sectionIndicesIndex.get(path);
  getOwnNullableProfile = (path: string): Profile | undefined =>
    this.profilesIndex.get(path);
  getOwnNullableType = (path: string): Type | undefined =>
    this.typesIndex.get(path);
  getOwnNullableClass = (path: string): Class | undefined => {
    const el = this.getOwnNullableType(path);
    return el instanceof Class ? el : undefined;
  };
  getOwnNullableEnumeration = (path: string): Enumeration | undefined => {
    const el = this.getOwnNullableType(path);
    return el instanceof Enumeration ? el : undefined;
  };
  getOwnNullableMeasure = (path: string): Measure | undefined => {
    const el = this.getOwnNullableType(path);
    return el instanceof Measure ? el : undefined;
  };
  getOwnNullableAssociation = (path: string): Association | undefined =>
    this.associationsIndex.get(path);
  getOwnNullableFunction = (
    path: string,
  ): ConcreteFunctionDefinition | undefined => this.functionsIndex.get(path);
  getOwnNullableStore = (path: string): Store | undefined =>
    this.storesIndex.get(path);
  getOwnNullableMapping = (path: string): Mapping | undefined =>
    this.mappingsIndex.get(path);
  getOwnNullableConnection = (
    path: string,
  ): PackageableConnection | undefined => this.connectionsIndex.get(path);
  getOwnNullableRuntime = (path: string): PackageableRuntime | undefined =>
    this.runtimesIndex.get(path);
  getOwnNullableService = (path: string): Service | undefined =>
    this.servicesIndex.get(path);
  getOwnNullableGenerationSpecification = (
    path: string,
  ): GenerationSpecification | undefined =>
    this.generationSpecificationsIndex.get(path);
  getOwnNullableFileGeneration = (
    path: string,
  ): FileGenerationSpecification | undefined =>
    this.fileGenerationsIndex.get(path);
  getOwnNullableDataElement = (path: string): DataElement | undefined =>
    this.dataElementsIndex.get(path);
  getOwnSectionIndex = (path: string): SectionIndex =>
    guaranteeNonNullable(
      this.getOwnNullableSectionIndex(path),
      `Can't find section index '${path}'`,
    );
  getOwnProfile = (path: string): Profile =>
    guaranteeNonNullable(
      this.getOwnNullableProfile(path),
      `Can't find profile '${path}'`,
    );
  getOwnType = (path: string): Type =>
    guaranteeNonNullable(
      this.getOwnNullableType(path),
      `Can't find type '${path}'`,
    );
  getOwnClass = (path: string): Class =>
    guaranteeNonNullable(
      this.getOwnNullableClass(path),
      `Can't find class '${path}'`,
    );
  getOwnEnumeration = (path: string): Enumeration =>
    guaranteeNonNullable(
      this.getOwnNullableEnumeration(path),
      `Can't find enumeration '${path}'`,
    );
  getOwnMeasure = (path: string): Measure =>
    guaranteeNonNullable(
      this.getOwnNullableMeasure(path),
      `Can't find measure '${path}'`,
    );
  getOwnAssociation = (path: string): Association =>
    guaranteeNonNullable(
      this.getOwnNullableAssociation(path),
      `Can't find association '${path}'`,
    );
  getOwnFunction = (path: string): ConcreteFunctionDefinition =>
    guaranteeNonNullable(
      this.getOwnNullableFunction(path),
      `Can't find function '${path}'`,
    );
  getOwnStore = (path: string): Store =>
    guaranteeNonNullable(
      this.getOwnNullableStore(path),
      `Can't find store '${path}'`,
    );
  getOwnDatabase = (path: string): Database =>
    guaranteeType(
      this.getOwnNullableStore(path),
      Database,
      `Can't find database '${path}'`,
    );
  getOwnFlatDataStore = (path: string): FlatData =>
    guaranteeType(
      this.getOwnNullableStore(path),
      FlatData,
      `Can't find flat-data store '${path}'`,
    );
  getOwnMapping = (path: string): Mapping =>
    guaranteeNonNullable(
      this.getOwnNullableMapping(path),
      `Can't find mapping '${path}'`,
    );
  getOwnConnection = (path: string): PackageableConnection =>
    guaranteeNonNullable(
      this.getOwnNullableConnection(path),
      `Can't find connection '${path}'`,
    );
  getOwnRuntime = (path: string): PackageableRuntime =>
    guaranteeNonNullable(
      this.getOwnNullableRuntime(path),
      `Can't find runtime '${path}'`,
    );
  getOwnService = (path: string): Service =>
    guaranteeNonNullable(
      this.getOwnNullableService(path),
      `Can't find service '${path}'`,
    );
  getOwnGenerationSpecification = (path: string): GenerationSpecification =>
    guaranteeNonNullable(
      this.getOwnNullableGenerationSpecification(path),
      `Can't find generation specification '${path}'`,
    );
  getOwnFileGeneration = (path: string): FileGenerationSpecification =>
    guaranteeNonNullable(
      this.getOwnNullableFileGeneration(path),
      `Can't find file generation '${path}'`,
    );
  getOwnDataElement = (path: string): DataElement =>
    guaranteeNonNullable(
      this.getOwnNullableDataElement(path),
      `Can't find data element '${path}'`,
    );

  getOwnNullableExtensionElement<T extends PackageableElement>(
    path: string,
    extensionElementClass: Clazz<T>,
  ): T | undefined {
    const extension = this.getExtensionForElementClass(extensionElementClass);
    return extension.getElement(path);
  }

  setOwnSection(path: string, val: Section): void {
    this.elementSectionMap.set(path, val);
  }
  setOwnSectionIndex(path: string, val: SectionIndex): void {
    this.sectionIndicesIndex.set(path, val);
  }
  setOwnProfile(path: string, val: Profile): void {
    this.profilesIndex.set(path, val);
  }
  setOwnType(path: string, val: Type): void {
    this.typesIndex.set(path, val);
  }
  setOwnAssociation(path: string, val: Association): void {
    this.associationsIndex.set(path, val);
  }
  setOwnFunction(path: string, val: ConcreteFunctionDefinition): void {
    this.functionsIndex.set(path, val);
  }
  setOwnStore(path: string, val: Store): void {
    this.storesIndex.set(path, val);
  }
  setOwnMapping(path: string, val: Mapping): void {
    this.mappingsIndex.set(path, val);
  }
  setOwnConnection(path: string, val: PackageableConnection): void {
    this.connectionsIndex.set(path, val);
  }
  setOwnRuntime(path: string, val: PackageableRuntime): void {
    this.runtimesIndex.set(path, val);
  }
  setOwnService(path: string, val: Service): void {
    this.servicesIndex.set(path, val);
  }
  setOwnGenerationSpecification(
    path: string,
    val: GenerationSpecification,
  ): void {
    this.generationSpecificationsIndex.set(path, val);
  }
  setOwnFileGeneration(path: string, val: FileGenerationSpecification): void {
    this.fileGenerationsIndex.set(path, val);
  }

  setOwnDataElement(path: string, val: DataElement): void {
    this.dataElementsIndex.set(path, val);
  }

  setOwnElementInExtension<T extends PackageableElement>(
    path: string,
    val: T,
    extensionElementClass: Clazz<T>,
  ): void {
    const extension = this.getExtensionForElementClass(extensionElementClass);
    extension.setElement(path, val);
  }

  get allOwnElements(): PackageableElement[] {
    return [
      ...this.ownProfiles,
      ...this.ownEnumerations,
      ...this.ownMeasures,
      ...this.ownClasses,
      ...this.ownAssociations,
      ...this.ownFunctions,
      ...this.ownStores,
      ...this.ownMappings,
      ...this.ownServices,
      ...this.ownRuntimes,
      ...this.ownConnections,
      ...this.ownGenerationSpecifications,
      ...this.ownFileGenerations,
      ...this.ownDataElements,
      ...this.extensions.flatMap((extension) => extension.elements),
    ];
  }

  /**
   * Dispose the current graph and any potential reference from parts outside of the graph to the graph
   * This is a MUST to prevent memory-leak as we might have references between metamodels from this graph
   * and other graphs
   */
  async dispose(): Promise<void> {
    if (this.allOwnElements.length) {
      await Promise.all<void>(
        this.allOwnElements.map((element) =>
          promisify(() => {
            element.dispose();
          }),
        ),
      );
    }
  }

  getNullablePackage = (path: string): Package | undefined =>
    !path
      ? this.root
      : returnUndefOnError(() =>
          getOrCreatePackage(this.root, path, false, undefined),
        );

  getOwnNullableElement(
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
      this.runtimesIndex.get(path) ??
      this.connectionsIndex.get(path) ??
      this.fileGenerationsIndex.get(path) ??
      this.dataElementsIndex.get(path) ??
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

  protected addOwnElement(
    element: PackageableElement,
    packagePath: string | undefined,
  ): void {
    addElementToPackage(
      packagePath
        ? getOrCreateGraphPackage(this, packagePath, undefined)
        : this.root,
      element,
    );
    if (element instanceof Mapping) {
      this.setOwnMapping(element.path, element);
    } else if (element instanceof Store) {
      this.setOwnStore(element.path, element);
    } else if (element instanceof Type) {
      this.setOwnType(element.path, element);
    } else if (element instanceof Association) {
      this.setOwnAssociation(element.path, element);
    } else if (element instanceof Profile) {
      this.setOwnProfile(element.path, element);
    } else if (element instanceof ConcreteFunctionDefinition) {
      this.setOwnFunction(element.path, element);
    } else if (element instanceof Service) {
      this.setOwnService(element.path, element);
    } else if (element instanceof PackageableConnection) {
      this.setOwnConnection(element.path, element);
    } else if (element instanceof PackageableRuntime) {
      this.setOwnRuntime(element.path, element);
    } else if (element instanceof FileGenerationSpecification) {
      this.setOwnFileGeneration(element.path, element);
    } else if (element instanceof GenerationSpecification) {
      this.setOwnGenerationSpecification(element.path, element);
    } else if (element instanceof DataElement) {
      this.setOwnDataElement(element.path, element);
    } else if (element instanceof Package) {
      // do nothing
    } else {
      const extension = this.getExtensionForElementClass(
        getClass<PackageableElement>(element),
      );
      extension.setElement(element.path, element);
    }
  }

  deleteOwnElement(element: PackageableElement): void {
    if (element.package) {
      deleteElementFromPackage(element.package, element);
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
        );
      }
    } else if (element instanceof Association) {
      this.associationsIndex.delete(element.path);
    } else if (element instanceof Profile) {
      this.profilesIndex.delete(element.path);
    } else if (element instanceof ConcreteFunctionDefinition) {
      this.functionsIndex.delete(element.path);
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
    } else if (element instanceof DataElement) {
      this.dataElementsIndex.delete(element.path);
    } else if (element instanceof Package) {
      element.children.forEach((child) => this.deleteOwnElement(child));
    } else {
      const extension = this.getExtensionForElementClass(
        getClass<PackageableElement>(element),
      );
      extension.deleteElement(element.path);
    }
  }

  /**
   * NOTE: this method has to do with graph modification
   * and as of the current set up, we should not allow it to be called
   * on any immutable graphs. As such, we protect it and let the main graph
   * expose it. The other benefit of exposing this in the main graph is that we could
   * do better duplicated path check
   */
  protected renameOwnElement(
    element: PackageableElement,
    newPath: string,
  ): void {
    const elementCurrentPath = element.path;
    // validation before renaming
    if (elementCurrentPath === newPath) {
      return;
    }
    if (!newPath) {
      throw new UnsupportedOperationError(
        `Can't rename element '${elementCurrentPath} to '${newPath}': path is empty'`,
      );
    }
    if (
      (element instanceof Package && !isValidPath(newPath)) ||
      (!(element instanceof Package) && !isValidFullPath(newPath))
    ) {
      throw new UnsupportedOperationError(
        `Can't rename element '${elementCurrentPath} to '${newPath}': invalid path'`,
      );
    }
    const existingElement = this.getOwnNullableElement(newPath, true);
    if (existingElement) {
      throw new UnsupportedOperationError(
        `Can't rename element '${elementCurrentPath} to '${newPath}': another element with the same path already existed'`,
      );
    }
    const [packagePath, elementName] =
      resolvePackagePathAndElementName(newPath);

    // if we're not renaming package, we can simply add new package
    // if the element new package does not exist. For renaming package
    // it's a little bit more complicated as we need to rename its children
    // we will handle this case later
    if (!(element instanceof Package)) {
      const parentPackage =
        this.getNullablePackage(packagePath) ??
        (packagePath !== ''
          ? getOrCreateGraphPackage(this, packagePath, undefined)
          : this.root);
      // update element name
      element.name = elementName;
      // update element package if needed
      if (element.package !== parentPackage) {
        if (element.package) {
          deleteElementFromPackage(element.package, element);
        }
        addElementToPackage(parentPackage, element);
      }
    }

    // update index in the graph
    if (element instanceof Mapping) {
      this.mappingsIndex.delete(elementCurrentPath);
      this.mappingsIndex.set(newPath, element);
    } else if (element instanceof Store) {
      this.storesIndex.delete(elementCurrentPath);
      this.storesIndex.set(newPath, element);
    } else if (element instanceof Type) {
      this.typesIndex.delete(elementCurrentPath);
      this.typesIndex.set(newPath, element);
      if (element instanceof Measure) {
        if (element.canonicalUnit) {
          this.typesIndex.delete(element.canonicalUnit.path);
          this.typesIndex.set(
            element.canonicalUnit.path.replace(elementCurrentPath, newPath),
            element.canonicalUnit,
          );
        }
        element.nonCanonicalUnits.forEach((unit) => {
          this.typesIndex.delete(unit.path);
          this.typesIndex.set(
            unit.path.replace(elementCurrentPath, newPath),
            unit,
          );
        });
      }
    } else if (element instanceof Association) {
      this.associationsIndex.delete(elementCurrentPath);
      this.associationsIndex.set(newPath, element);
    } else if (element instanceof Profile) {
      this.profilesIndex.delete(elementCurrentPath);
      this.profilesIndex.set(newPath, element);
    } else if (element instanceof ConcreteFunctionDefinition) {
      this.functionsIndex.delete(elementCurrentPath);
      this.functionsIndex.set(newPath, element);
    } else if (element instanceof Service) {
      this.servicesIndex.delete(elementCurrentPath);
      this.servicesIndex.set(newPath, element);
    } else if (element instanceof PackageableRuntime) {
      this.runtimesIndex.delete(elementCurrentPath);
      this.runtimesIndex.set(newPath, element);
    } else if (element instanceof PackageableConnection) {
      this.connectionsIndex.delete(elementCurrentPath);
      this.connectionsIndex.set(newPath, element);
    } else if (element instanceof FileGenerationSpecification) {
      this.fileGenerationsIndex.delete(elementCurrentPath);
      this.fileGenerationsIndex.set(newPath, element);
    } else if (element instanceof DataElement) {
      this.dataElementsIndex.delete(elementCurrentPath);
      this.dataElementsIndex.set(newPath, element);
    } else if (element instanceof GenerationSpecification) {
      this.generationSpecificationsIndex.delete(elementCurrentPath);
      this.generationSpecificationsIndex.set(newPath, element);
    } else if (element instanceof Package) {
      // Since we will modify the package name, we need to first store the original
      // paths of all of its children
      const childElements = new Map<string, PackageableElement>();
      element.children.forEach((childElement) => {
        childElements.set(childElement.path, childElement);
      });
      // update element name
      element.name = elementName;
      if (!element.package) {
        throw new IllegalStateError(`Can't rename root package`);
      }
      /**
       * Update element package if needed.
       *
       * NOTE: to be clean, first completely remove the package from its parent package
       * Only then would we find or create the new parent package. This way, if we rename
       * package `example::something` to `example::something::somethingElse`, we will not
       * end up in a loop. If we did not first remove the package from its parent package
       * we would end up having the `somethingElse` package containing itself as a child.
       */
      const currentParentPackage = element.package;
      if (currentParentPackage !== this.getNullablePackage(packagePath)) {
        deleteElementFromPackage(currentParentPackage, element);
        const newParentPackage =
          packagePath !== ''
            ? getOrCreateGraphPackage(this, packagePath, undefined)
            : this.root;
        addElementToPackage(newParentPackage, element);
      }
      childElements.forEach((childElement, childElementOriginalPath) => {
        this.renameOwnElement(
          childElement,
          childElementOriginalPath.replace(elementCurrentPath, newPath),
        );
      });
    } else {
      const extension = this.getExtensionForElementClass(
        getClass<PackageableElement>(element),
      );
      extension.renameElement(elementCurrentPath, newPath);
    }
  }

  /**
   * TODO: this will be removed once we have full support for section index
   * See https://github.com/finos/legend-studio/issues/1067
   */
  TEMPORARY__deleteOwnSectionIndex(): void {
    this.sectionIndicesIndex.forEach((sectionIndex) => {
      sectionIndex.setIsDeleted(true);
      this.sectionIndicesIndex.delete(sectionIndex.path);
    });
    // NOTE: we have to do this because right now we don't add section index to the package tree
    // as such `this.sectionIndicesIndex.delete(sectionIndex.path)` won't work because the path
    // is without the package
    this.sectionIndicesIndex = new Map<string, SectionIndex>();
    this.elementSectionMap = new Map<string, Section>();
  }
}
