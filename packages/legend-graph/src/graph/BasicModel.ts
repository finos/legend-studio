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
import type { Clazz, GeneratorFn } from '@finos/legend-shared';
import {
  ActionState,
  assertNonEmptyString,
  UnsupportedOperationError,
  getClass,
  guaranteeNonNullable,
  IllegalStateError,
  returnUndefOnError,
} from '@finos/legend-shared';
import type { ROOT_PACKAGE_NAME } from '../MetaModelConst';
import { ELEMENT_PATH_DELIMITER } from '../MetaModelConst';
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
import { ServiceStore } from '../models/metamodels/pure/packageableElements/store/relational/model/ServiceStore';
import { PureGraphExtension } from './PureGraphExtension';
import { PrimitiveType } from '../models/metamodels/pure/packageableElements/domain/PrimitiveType';
import { DataType } from '../models/metamodels/pure/packageableElements/domain/DataType';
import {
  isValidFullPath,
  isValidPath,
  resolvePackagePathAndElementName,
} from '../MetaModelUtils';

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
  buildState = ActionState.create();

  private readonly extensions: PureGraphExtension<PackageableElement>[] = [];
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
      | 'extensions'
    >(this, {
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
      extensions: observable,

      ownSectionIndices: computed,
      ownProfiles: computed,
      ownEnumerations: computed,
      ownMeasures: computed,
      ownUnits: computed,
      ownClasses: computed,
      ownTypes: computed,
      ownAssociations: computed,
      ownFunctions: computed,
      ownStores: computed,
      ownFlatDatas: computed,
      ownDatabases: computed,
      ownServiceStores: computed,
      ownMappings: computed,
      ownServices: computed,
      ownRuntimes: computed,
      ownConnections: computed,
      ownFileGenerations: computed,
      ownGenerationSpecifications: computed,
      allOwnElements: computed,

      dispose: flow,

      setOwnSection: action,
      setOwnSectionIndex: action,
      setOwnProfile: action,
      setOwnType: action,
      setOwnAssociation: action,
      setOwnFunction: action,
      setOwnStore: action,
      setOwnMapping: action,
      setOwnConnection: action,
      setOwnRuntime: action,
      setOwnService: action,
      setOwnGenerationSpecification: action,
      setOwnFileGeneration: action,
      deleteOwnElement: action,
      renameOwnElement: action,
      TEMP__deleteOwnSectionIndex: action,
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

  get ownSectionIndices(): SectionIndex[] {
    return Array.from(this.sectionIndicesIndex.values());
  }
  get ownProfiles(): Profile[] {
    return Array.from(this.profilesIndex.values());
  }
  get ownEnumerations(): Enumeration[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Enumeration => type instanceof Enumeration,
    );
  }
  get ownMeasures(): Measure[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Measure => type instanceof Measure,
    );
  }
  get ownUnits(): Unit[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Unit => type instanceof Unit,
    );
  }
  get ownClasses(): Class[] {
    return Array.from(this.typesIndex.values()).filter(
      (type: Type): type is Class => type instanceof Class,
    );
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
    return Array.from(this.storesIndex.values()).filter(
      (store: Store): store is FlatData => store instanceof FlatData,
    );
  }
  get ownDatabases(): Database[] {
    return Array.from(this.storesIndex.values()).filter(
      (store: Store): store is Database => store instanceof Database,
    );
  }
  get ownServiceStores(): ServiceStore[] {
    return Array.from(this.storesIndex.values()).filter(
      (store: Store): store is ServiceStore => store instanceof ServiceStore,
    );
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
  get ownGenerationSpecifications(): GenerationSpecification[] {
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
        `Can't find graph extension for the specified element class: no compatible graph extensions available from plugins`,
      );
    } else if (extensions.length > 1) {
      throw new IllegalStateError(
        `Found multiple extensions for the specified element class`,
      );
    }
    return extensions[0] as PureGraphExtension<T>;
  }

  getOwnSection = (path: string): Section | undefined =>
    this.elementSectionMap.get(path);
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

  getOwnExtensionElement<T extends PackageableElement>(
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

  setOwnElementInExtension<T extends PackageableElement>(
    path: string,
    val: T,
    extensionElementClass: Clazz<T>,
  ): void {
    const extension = this.getExtensionForElementClass(extensionElementClass);
    extension.setElement(path, val);
  }

  get allOwnElements(): PackageableElement[] {
    this.extensions.flatMap((extension) => extension.elements);
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
      ...this.extensions.flatMap((extension) => extension.elements),
    ];
  }

  /**
   * Dispose the current graph and any potential reference from parts outside of the graph to the graph
   * This is a MUST to prevent memory-leak as we use referneces to link between objects instead of string pointers
   */
  *dispose(): GeneratorFn<void> {
    if (this.allOwnElements.length) {
      yield Promise.all<void>(
        this.allOwnElements.map(
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
  }

  buildPath = (
    packagePath: string | undefined,
    name: string | undefined,
  ): string =>
    `${guaranteeNonNullable(
      packagePath,
      'Package path is required',
    )}${ELEMENT_PATH_DELIMITER}${guaranteeNonNullable(
      name,
      'Name is required',
    )}`;

  getOrCreatePackage = (packagePath: string | undefined): Package => {
    assertNonEmptyString(packagePath, 'Package path is required');
    return Package.getOrCreatePackage(this.root, packagePath, true);
  };

  getNullablePackage = (path: string): Package | undefined =>
    !path
      ? this.root
      : returnUndefOnError(() =>
          Package.getOrCreatePackage(this.root, path, false),
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

  deleteOwnElement(element: PackageableElement): void {
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
    } else if (element instanceof Package) {
      element.children.forEach((el) => this.deleteOwnElement(el));
    } else {
      const extension = this.getExtensionForElementClass(
        getClass<PackageableElement>(element),
      );
      extension.deleteElement(element.path);
    }
  }

  renameOwnElement(element: PackageableElement, newPath: string): void {
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
        `Can't rename element '${elementCurrentPath} to '${newPath}': element with the same path already existed'`,
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
        (packagePath !== '' ? this.getOrCreatePackage(packagePath) : this.root);
      // update element name
      element.setName(elementName);
      // update element package if needed
      if (element.package !== parentPackage) {
        element.package?.deleteElement(element);
        element.setPackage(parentPackage);
        parentPackage.addChild(element);
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
      element.setName(elementName);
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
        currentParentPackage.deleteElement(element);
        const newParentPackage =
          packagePath !== '' ? this.getOrCreatePackage(packagePath) : this.root;
        element.setPackage(newParentPackage);
        newParentPackage.addChild(element);
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
   * TODO: this will be removed once we fully support section index in SDLC flow
   * @deprecated
   */
  TEMP__deleteOwnSectionIndex(): void {
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
