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

import { action, computed, flow, observable, makeObservable } from 'mobx';
import type { Logger } from '../../../../utils/Logger';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import {
  PRIMITIVE_TYPE,
  ROOT_PACKAGE_NAME,
  TYPICAL_MULTIPLICITY_TYPE,
  AUTO_IMPORTS,
} from '../../../MetaModelConst';
import type { Clazz } from '@finos/legend-studio-shared';
import {
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
  getClass,
} from '@finos/legend-studio-shared';
import { PrimitiveType } from '../model/packageableElements/domain/PrimitiveType';
import { Enumeration } from '../model/packageableElements/domain/Enumeration';
import { Multiplicity } from '../model/packageableElements/domain/Multiplicity';
import { Association } from '../model/packageableElements/domain/Association';
import { Package } from '../model/packageableElements/domain/Package';
import { Type } from '../model/packageableElements/domain/Type';
import { Class } from '../model/packageableElements/domain/Class';
import { Mapping } from '../model/packageableElements/mapping/Mapping';
import { Profile } from '../model/packageableElements/domain/Profile';
import { Diagram } from '../model/packageableElements/diagram/Diagram';
import type { Stereotype } from '../model/packageableElements/domain/Stereotype';
import type { Tag } from '../model/packageableElements/domain/Tag';
import type { PackageableElement } from '../model/packageableElements/PackageableElement';
import { Store } from '../model/packageableElements/store/Store';
import { DependencyManager } from '../graph/DependencyManager';
import { ConcreteFunctionDefinition } from '../model/packageableElements/domain/ConcreteFunctionDefinition';
import { Service } from '../model/packageableElements/service/Service';
import { BasicModel } from './BasicModel';
import { FlatData } from '../model/packageableElements/store/flatData/model/FlatData';
import { Database } from '../model/packageableElements/store/relational/model/Database';
import { PackageableConnection } from '../model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from '../model/packageableElements/runtime/PackageableRuntime';
import { FileGenerationSpecification } from '../model/packageableElements/fileGeneration/FileGenerationSpecification';
import { ModelStore } from '../model/packageableElements/store/modelToModel/model/ModelStore';
import { GenerationSpecification } from '../model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure, Unit } from '../model/packageableElements/domain/Measure';
import { ServiceStore } from '../model/packageableElements/store/relational/model/ServiceStore';

/**
 * CoreModel holds meta models which are constant and basic building block of the graph. Since throughout the lifetime
 * of the application, we rebuild PureModel many times, we cannot have these basic building blocks as part of PureModel
 * as that will throw off referential equality.
 *
 * Also, since project dependency uses primitive types, it might even
 * cause the dependency model and system model to depend on PureModel which is bad, as it could potentially cause memory leak
 * as we rebuild the graph.
 */
export class CoreModel extends BasicModel {
  /**
   * ModelStore is technically not a real store and for referential equality check, it is much better to
   * have it as a singleton. As such, we make ModelStore part of CoreModel
   */
  modelStore: ModelStore;
  primitiveTypesIndex = new Map<string, PrimitiveType>();
  multiplicitiesIndex = new Map<string, Multiplicity>();

  get primitiveTypes(): PrimitiveType[] {
    return Array.from(this.primitiveTypesIndex.values());
  }

  constructor(extensionElementClasses: Clazz<PackageableElement>[]) {
    super(ROOT_PACKAGE_NAME.CORE, extensionElementClasses);
    this.initializeMultiplicities();
    this.initializePrimitiveTypes();
    // initialize ModelStore
    this.modelStore = new ModelStore();
    this.setStore(this.modelStore.path, this.modelStore);
  }

  /**
   * NOTE: primitive types are special, they are not put in any package (i.e. they are not linked to `Root` package at all)
   */
  initializePrimitiveTypes(): void {
    Object.values(PRIMITIVE_TYPE).forEach((type) => {
      const primitiveType = new PrimitiveType(type);
      this.primitiveTypesIndex.set(type, primitiveType);
      this.setType(type, primitiveType);
    });
  }

  /**
   * Create pointers for the most common use case of multiplicity, other abnormal use cases such as 5..6 will
   * be left as is, but for these, we want to optimize by using singletons
   * NOTE: in the execution server, we put create packageable multiplicity objects and put them in the package tree,
   * here we haven't yet seen a reason to do that
   */
  initializeMultiplicities(): void {
    this.multiplicitiesIndex.set(
      TYPICAL_MULTIPLICITY_TYPE.ZERO,
      new Multiplicity(0, 0),
    );
    this.multiplicitiesIndex.set(
      TYPICAL_MULTIPLICITY_TYPE.ONE,
      new Multiplicity(1, 1),
    );
    this.multiplicitiesIndex.set(
      TYPICAL_MULTIPLICITY_TYPE.ZEROONE,
      new Multiplicity(0, 1),
    );
    this.multiplicitiesIndex.set(
      TYPICAL_MULTIPLICITY_TYPE.ONEMANY,
      new Multiplicity(1, undefined),
    );
    this.multiplicitiesIndex.set(
      TYPICAL_MULTIPLICITY_TYPE.ZEROMANY,
      new Multiplicity(0, undefined),
    );
  }
}

export class SystemModel extends BasicModel {
  autoImports: Package[] = [];

  constructor(extensionElementClasses: Clazz<PackageableElement>[]) {
    super(ROOT_PACKAGE_NAME.SYSTEM, extensionElementClasses);
  }

  /**
   * NOTE: auto imports are for special types and profiles from system model
   * such as `Any` or `doc` profiles.
   * We prefer to initialize these only once
   */
  initializeAutoImports(): void {
    this.autoImports = AUTO_IMPORTS.map((_package) =>
      guaranteeType(
        this.getNullableElement(_package, true),
        Package,
        `Unable to find auto-import package '${_package}'`,
      ),
    );
  }
}

export class GenerationModel extends BasicModel {
  constructor(extensionElementClasses: Clazz<PackageableElement>[]) {
    super(ROOT_PACKAGE_NAME.MODEL_GENERATION, extensionElementClasses);
  }
}

/**
 * The model of Pure, a.k.a the Pure graph
 */
export class PureModel extends BasicModel {
  private coreModel: CoreModel;
  systemModel: SystemModel;
  generationModel: GenerationModel;
  dependencyManager: DependencyManager; // used to manage the elements from pependency projects

  constructor(
    coreModel: CoreModel,
    systemModel: SystemModel,
    extensionElementClasses: Clazz<PackageableElement>[],
  ) {
    super(ROOT_PACKAGE_NAME.MAIN, extensionElementClasses);

    makeObservable(this, {
      generationModel: observable,
      dependencyManager: observable,
      isDependenciesLoaded: computed,
      setDependencyManager: action,
      addElement: action,
    });

    this.coreModel = coreModel;
    this.systemModel = systemModel;
    this.generationModel = new GenerationModel(extensionElementClasses);
    this.dependencyManager = new DependencyManager(extensionElementClasses);
  }

  get modelStore(): ModelStore {
    return this.coreModel.modelStore;
  }

  get sectionAutoImports(): Package[] {
    return this.systemModel.autoImports;
  }

  get primitiveTypes(): PrimitiveType[] {
    return this.coreModel.primitiveTypes;
  }

  get reservedPathsForDependencyProcessing(): string[] {
    return this.systemModel.allElements.map((e) => e.path);
  }

  get isDependenciesLoaded(): boolean {
    return this.dependencyManager.isBuilt;
  }

  /**
   * Call `get hashCode()` on each element once so we trigger the first time we compute the hash for that element.
   * This plays well with `keepAlive` flag on each of the element `get hashCode()` function. This is due to
   * the fact that we want to get hashCode inside a `setTimeout()` to make this non-blocking, but that way `mobx` will
   * not trigger memoization on computed so we need to enable `keepAlive`
   */
  precomputeHashes = flow(function* (
    this: PureModel,
    logger: Logger,
    quiet?: boolean,
  ) {
    const startTime = Date.now();
    if (this.allElements.length) {
      yield Promise.all<void>(
        this.allElements.map(
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
    if (!quiet) {
      logger.info(
        CORE_LOG_EVENT.GRAPH_HASHES_PREPROCESSED,
        '[ASYNC]',
        Date.now() - startTime,
        'ms',
      );
    }
  });

  setDependencyManager = (dependencyManager: DependencyManager): void => {
    this.dependencyManager = dependencyManager;
  };

  getPrimitiveType = (type: PRIMITIVE_TYPE): PrimitiveType =>
    guaranteeNonNullable(
      this.coreModel.primitiveTypesIndex.get(type),
      `Can't find primitive type '${type}'`,
    );
  override getNullablePackage = (path: string): Package | undefined =>
    !path
      ? this.root
      : returnUndefOnError(() =>
          Package.getOrCreatePackage(this.root, path, false),
        );
  getElement = (path: string, includePackage?: boolean): PackageableElement =>
    guaranteeNonNullable(
      this.getNullableElement(path, includePackage),
      `Can't find element '${path}'`,
    );
  getProfileStereotype = (
    path: string,
    value: string,
  ): Stereotype | undefined => this.getProfile(path).getStereotype(value);
  getProfileTag = (path: string, value: string): Tag | undefined =>
    this.getProfile(path).getTag(value);
  getNullableClass = (path: string): Class | undefined =>
    returnUndefOnError(() => this.getClass(path));
  getNullableMapping = (path: string): Mapping | undefined =>
    returnUndefOnError(() => this.getMapping(path));
  getNullableFileGeneration = (
    path: string,
  ): FileGenerationSpecification | undefined =>
    returnUndefOnError(() => this.getFileGeneration(path));
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getType = (path: string): Type =>
    guaranteeNonNullable(
      this.getOwnType(path) ??
        this.generationModel.getOwnType(path) ??
        this.dependencyManager.getOwnType(path) ??
        this.systemModel.getOwnType(path) ??
        this.coreModel.getOwnType(path),
      `Can't find type '${path}'`,
    );
  getProfile = (path: string): Profile =>
    guaranteeNonNullable(
      this.getOwnProfile(path) ??
        this.generationModel.getOwnProfile(path) ??
        this.dependencyManager.getOwnProfile(path) ??
        this.systemModel.getOwnProfile(path),
      `Can't find profile '${path}'`,
    );
  getEnumeration = (path: string): Enumeration =>
    guaranteeType(
      this.getType(path),
      Enumeration,
      `Can't find enumeration '${path}'`,
    );
  getMeasure = (path: string): Measure =>
    guaranteeType(this.getType(path), Measure, `Can't find measure '${path}'`);
  getUnit = (path: string): Unit =>
    guaranteeType(this.getType(path), Unit, `Can't find unit '${path}'`);
  getClass = (path: string): Class =>
    guaranteeType(this.getType(path), Class, `Can't find class '${path}'`);
  getAssociation = (path: string): Association =>
    guaranteeNonNullable(
      this.getOwnAssociation(path) ??
        this.generationModel.getOwnAssociation(path) ??
        this.dependencyManager.getOwnAssociation(path) ??
        this.systemModel.getOwnAssociation(path),
      `Can't find association '${path}'`,
    );
  getFunction = (path: string): ConcreteFunctionDefinition =>
    guaranteeType(
      this.getOwnFunction(path) ??
        this.generationModel.getOwnFunction(path) ??
        this.dependencyManager.getOwnFunction(path) ??
        this.systemModel.getOwnFunction(path),
      ConcreteFunctionDefinition,
      `Can't find function '${path}'`,
    );
  getStore = (path: string): Store =>
    guaranteeNonNullable(
      this.getOwnStore(path) ??
        this.generationModel.getOwnStore(path) ??
        this.dependencyManager.getOwnStore(path) ??
        this.systemModel.getOwnStore(path) ??
        this.coreModel.getOwnStore(path),
      `Can't find store '${path}'`,
    );
  getFlatDataStore = (path: string): FlatData =>
    guaranteeType(
      this.getStore(path),
      FlatData,
      `Can't find flat-data store '${path}'`,
    );
  getDatabase = (path: string): Database =>
    guaranteeType(
      this.getStore(path),
      Database,
      `Can't find database store '${path}'`,
    );
  getServiceStore = (path: string): ServiceStore =>
    guaranteeType(
      this.getStore(path),
      ServiceStore,
      `Can't find service store '${path}'`,
    );
  getMapping = (path: string): Mapping =>
    guaranteeNonNullable(
      this.getOwnMapping(path) ??
        this.generationModel.getOwnMapping(path) ??
        this.dependencyManager.getOwnMapping(path) ??
        this.systemModel.getOwnMapping(path),
      `Can't find mapping '${path}'`,
    );
  getService = (path: string): Service =>
    guaranteeNonNullable(
      this.getOwnService(path) ??
        this.generationModel.getOwnService(path) ??
        this.dependencyManager.getOwnService(path) ??
        this.systemModel.getOwnService(path),
      `Can't find service '${path}'`,
    );
  getConnection = (path: string): PackageableConnection =>
    guaranteeNonNullable(
      this.getOwnConnection(path) ??
        this.generationModel.getOwnConnection(path) ??
        this.dependencyManager.getOwnConnection(path) ??
        this.systemModel.getOwnConnection(path),
      `Can't find connection '${path}'`,
    );
  getRuntime = (path: string): PackageableRuntime =>
    guaranteeNonNullable(
      this.getOwnRuntime(path) ??
        this.generationModel.getOwnRuntime(path) ??
        this.dependencyManager.getOwnRuntime(path) ??
        this.systemModel.getOwnRuntime(path),
      `Can't find runtime '${path}'`,
    );
  getDiagram = (path: string): Diagram =>
    guaranteeNonNullable(
      this.getOwnDiagram(path) ??
        this.generationModel.getOwnDiagram(path) ??
        this.dependencyManager.getOwnDiagram(path) ??
        this.systemModel.getOwnDiagram(path),
      `Can't find diagram '${path}'`,
    );
  getGenerationSpecification = (path: string): GenerationSpecification =>
    guaranteeNonNullable(
      this.getOwnGenerationSpecification(path) ??
        this.generationModel.getOwnGenerationSpecification(path) ??
        this.dependencyManager.getOwnGenerationSpecification(path) ??
        this.systemModel.getOwnGenerationSpecification(path),
      `Can't find generation specification '${path}'`,
    );
  getFileGeneration = (path: string): FileGenerationSpecification =>
    guaranteeNonNullable(
      this.getOwnFileGeneration(path) ??
        this.generationModel.getOwnFileGeneration(path) ??
        this.dependencyManager.getOwnFileGeneration(path) ??
        this.systemModel.getOwnFileGeneration(path),
      `Can't find file generation '${path}'`,
    );

  getExtensionElement<T extends PackageableElement>(
    path: string,
    extensionElementClass: Clazz<T>,
    notFoundErrorMessage?: string,
  ): T {
    // NOTE: beware that this method will favor main graph elements over those of subgraphs when resolving
    return guaranteeNonNullable(
      this.getOwnExtensionElement(path, extensionElementClass) ??
        this.generationModel.getOwnExtensionElement(
          path,
          extensionElementClass,
        ) ??
        this.dependencyManager.getOwnExtensionElement(
          path,
          extensionElementClass,
        ) ??
        this.systemModel.getOwnExtensionElement(path, extensionElementClass),
      notFoundErrorMessage ?? `Can't find element '${path}'`,
    );
  }

  override getNullableElement(
    path: string,
    includePackage?: boolean,
  ): PackageableElement | undefined {
    // NOTE: beware that this method will favor main graph elements over those of subgraphs when resolving
    const element =
      super.getNullableElement(path) ??
      this.dependencyManager.getNullableElement(path) ??
      this.generationModel.getNullableElement(path) ??
      this.systemModel.getNullableElement(path) ??
      this.coreModel.getNullableElement(path);
    if (includePackage && !element) {
      return (
        this.getNullablePackage(path) ??
        this.dependencyManager.getNullableElement(path, true) ??
        this.generationModel.getNullablePackage(path) ??
        this.systemModel.getNullablePackage(path)
      );
    }
    return element;
  }

  getTypicalMultiplicity = (name: TYPICAL_MULTIPLICITY_TYPE): Multiplicity =>
    guaranteeNonNullable(
      this.coreModel.multiplicitiesIndex.get(name),
      `Can't find typical multiplicity with name ${name}`,
    );

  getMultiplicity(
    lowerBound: number,
    upperBound: number | undefined,
  ): Multiplicity {
    let multiplicity: Multiplicity | undefined;
    if (lowerBound === 1 && upperBound === 1) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(
        TYPICAL_MULTIPLICITY_TYPE.ONE,
      );
    } else if (lowerBound === 0 && upperBound === 1) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(
        TYPICAL_MULTIPLICITY_TYPE.ZEROONE,
      );
    } else if (lowerBound === 0 && upperBound === undefined) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(
        TYPICAL_MULTIPLICITY_TYPE.ZEROMANY,
      );
    } else if (lowerBound === 1 && upperBound === undefined) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(
        TYPICAL_MULTIPLICITY_TYPE.ONEMANY,
      );
    } else if (lowerBound === 0 && upperBound === 0) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(
        TYPICAL_MULTIPLICITY_TYPE.ZERO,
      );
    }
    return multiplicity ?? new Multiplicity(lowerBound, upperBound);
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  addElement(element: PackageableElement): void {
    if (element instanceof Mapping) {
      this.setMapping(element.path, element);
    } else if (element instanceof Store) {
      this.setStore(element.path, element);
    } else if (element instanceof Type) {
      this.setType(element.path, element);
    } else if (element instanceof Association) {
      this.setAssociation(element.path, element);
    } else if (element instanceof Profile) {
      this.setProfile(element.path, element);
    } else if (element instanceof ConcreteFunctionDefinition) {
      this.setFunction(element.path, element);
    } else if (element instanceof Diagram) {
      this.setDiagram(element.path, element);
    } else if (element instanceof Service) {
      this.setService(element.path, element);
    } else if (element instanceof PackageableConnection) {
      this.setConnection(element.path, element);
    } else if (element instanceof PackageableRuntime) {
      this.setRuntime(element.path, element);
    } else if (element instanceof FileGenerationSpecification) {
      this.setFileGeneration(element.path, element);
    } else if (element instanceof GenerationSpecification) {
      this.setGenerationSpecification(element.path, element);
    } else if (element instanceof Package) {
      // do nothing
    } else {
      const extension = this.getExtensionForElementClass(
        getClass<PackageableElement>(element),
      );
      extension.setElement(element.path, element);
    }
  }
}
