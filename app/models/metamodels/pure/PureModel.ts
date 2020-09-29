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

import { action, computed, flow, observable } from 'mobx';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { PRIMITIVE_TYPE, ROOT_PACKAGE_NAME, TYPICAL_MULTIPLICITY_TYPE, AUTO_IMPORTS } from 'MetaModelConst';
import { guaranteeNonNullable, guaranteeType, UnsupportedOperationError, returnUndefOnError } from 'Utilities/GeneralUtil';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { PrimitiveType } from 'MM/model/packageableElements/domain/PrimitiveType';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Multiplicity } from 'MM/model/packageableElements/domain/Multiplicity';
import { Association } from 'MM/model/packageableElements/domain/Association';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Mapping, MappingElementSourceSelectOption } from 'MM/model/packageableElements/mapping/Mapping';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { Stereotype } from 'MM/model/packageableElements/domain/Stereotype';
import { Tag } from 'MM/model/packageableElements/domain/Tag';
import { PackageableElement, PackageableElementSelectOption, PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';
import { Store } from './model/packageableElements/store/Store';
import { Text } from 'MM/model/packageableElements/text/Text';
import { DependencyManager } from 'MM/DependencyManager';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { BasicModel } from './BasicModel';
import { PackageableConnection } from './model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from './model/packageableElements/runtime/PackageableRuntime';
import { FileGeneration } from './model/packageableElements/fileGeneration/FileGeneration';
import { ModelStore } from './model/packageableElements/store/modelToModel/model/ModelStore';
import { GenerationSpecification } from './model/packageableElements/generationSpecification/GenerationSpecification';
import { Measure, Unit } from './model/packageableElements/domain/Measure';

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

  get primitiveTypes(): PrimitiveType[] { return Array.from(this.primitiveTypesIndex.values()) }

  constructor() {
    super(ROOT_PACKAGE_NAME.CORE);
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
    Object.values(PRIMITIVE_TYPE).forEach(type => {
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
    this.multiplicitiesIndex.set(TYPICAL_MULTIPLICITY_TYPE.ZERO, new Multiplicity(0, 0));
    this.multiplicitiesIndex.set(TYPICAL_MULTIPLICITY_TYPE.ONE, new Multiplicity(1, 1));
    this.multiplicitiesIndex.set(TYPICAL_MULTIPLICITY_TYPE.ZEROONE, new Multiplicity(0, 1));
    this.multiplicitiesIndex.set(TYPICAL_MULTIPLICITY_TYPE.ONEMANY, new Multiplicity(1, undefined));
    this.multiplicitiesIndex.set(TYPICAL_MULTIPLICITY_TYPE.ZEROMANY, new Multiplicity(0, undefined));
  }
}

export class SystemModel extends BasicModel {
  autoImports: Package[] = [];

  constructor() {
    super(ROOT_PACKAGE_NAME.SYSTEM);
  }

  /**
   * NOTE: auto imports are for special types and profiles from system model
   * such as `Any` or `doc` profiles.
   * We prefer to initialize these only once
   */
  initializeAutoImports(): void {
    this.autoImports = AUTO_IMPORTS.map(_package => guaranteeType(this.getNullableElement(_package, true), Package, `Unable to find auto-import package '${_package}'`));
  }
}

// FIXME: remove this when we remove demo mode
export class LegalModel extends BasicModel {
  constructor() {
    super(ROOT_PACKAGE_NAME.LEGAL);
  }
}

export class GenerationModel extends BasicModel {
  constructor() {
    super(ROOT_PACKAGE_NAME.MODEL_GENERATION);
  }
}

export class PureModel extends BasicModel {
  private coreModel: CoreModel;
  private systemModel: SystemModel;
  private legalModel: LegalModel;
  @observable generationModel = new GenerationModel();
  @observable dependencyManager = new DependencyManager(); // used to manage the elements from pependency projects

  constructor(coreModel: CoreModel, systemModel: SystemModel, legalModel: LegalModel) {
    super(ROOT_PACKAGE_NAME.MAIN);
    this.coreModel = coreModel;
    this.systemModel = systemModel;
    this.legalModel = legalModel;
  }

  get modelStore(): ModelStore { return this.coreModel.modelStore }
  get sectionAutoImports(): Package[] { return this.systemModel.autoImports }
  get primitiveTypes(): PrimitiveType[] { return this.coreModel.primitiveTypes }

  @computed get primitiveTypeOptions(): PackageableElementSelectOption<PrimitiveType>[] { return this.coreModel.primitiveTypes.filter(p => p.path !== PRIMITIVE_TYPE.LATESTDATE).map(e => e.selectOption as PackageableElementSelectOption<PrimitiveType>) }
  @computed get enumerationOptions(): PackageableElementSelectOption<Enumeration>[] { return this.enumerations.concat(this.dependencyManager.enumerations).map(e => e.selectOption as PackageableElementSelectOption<Enumeration>) }
  @computed get classOptions(): PackageableElementSelectOption<Class>[] { return this.classes.concat(this.systemModel.classes).concat(this.dependencyManager.classes).map(c => c.selectOption as PackageableElementSelectOption<Class>) }
  @computed get associationOptions(): PackageableElementSelectOption<Association>[] { return this.associations.concat(this.systemModel.associations).concat(this.dependencyManager.associations).map(p => p.selectOption as PackageableElementSelectOption<Association>) }
  @computed get profileOptions(): PackageableElementSelectOption<Profile>[] { return this.profiles.concat(this.systemModel.profiles).concat(this.dependencyManager.profiles).map(p => p.selectOption as PackageableElementSelectOption<Profile>) }
  @computed get runtimeOptions(): PackageableElementSelectOption<PackageableRuntime>[] { return this.runtimes.concat(this.systemModel.runtimes).concat(this.dependencyManager.runtimes).map(p => p.selectOption as PackageableElementSelectOption<PackageableRuntime>) }
  @computed get connectionOptions(): PackageableElementSelectOption<PackageableConnection>[] { return this.connections.concat(this.systemModel.connections).concat(this.dependencyManager.connections).map(p => p.selectOption as PackageableElementSelectOption<PackageableConnection>) }
  @computed get classPropertyGenericTypeOptions(): PackageableElementSelectOption<Type>[] { return this.primitiveTypeOptions.concat(this.types.concat(this.systemModel.types).concat(this.dependencyManager.types).map(a => a.selectOption as PackageableElementSelectOption<Type>)) }
  @computed get mappingOptions(): PackageableElementSelectOption<Mapping>[] { return this.mappings.concat(this.dependencyManager.mappings).map(a => a.selectOption as PackageableElementSelectOption<Mapping>) }
  @computed get storeOptions(): PackageableElementSelectOption<Store>[] { return this.stores.concat(this.dependencyManager.stores).map(a => a.selectOption as PackageableElementSelectOption<Store>) }
  @computed get mappingSourceElementOptions(): MappingElementSourceSelectOption[] {
    /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
    return (this.classOptions as MappingElementSourceSelectOption[]);
  }

  getElementOptions = (type: PACKAGEABLE_ELEMENT_TYPE | undefined): PackageableElementSelectOption<PackageableElement>[] =>
    this.allElements.filter(element => !type || getPackageableElementType(element) === type).map(element => element.selectOption);

  get reservedPathsForDependencyProcessing(): string[] {
    return this.legalModel.allElements.map(e => e.path)
      .concat(this.systemModel.allElements.map(e => e.path));
  }

  @computed get enumertionMappingSourceTypeOptions(): PackageableElementSelectOption<PackageableElement>[] {
    // NOTE: we only support Integer, for floats are imprecise and if people want it, they can use String instead
    const acceptedPrimitiveTypes = [this.getPrimitiveType(PRIMITIVE_TYPE.INTEGER), this.getPrimitiveType(PRIMITIVE_TYPE.STRING)];
    return (acceptedPrimitiveTypes.map(primitiveType => primitiveType.selectOption)).concat(this.enumerationOptions);
  }

  @computed get isDependenciesLoaded(): boolean { return this.dependencyManager.isBuilt }

  /**
   * Call `get hashCode()` on each element once so we trigger the first time we compute the hash for that element.
   * This plays well with `keepAlive` flag on each of the element `get hashCode()` function. This is due to
   * the fact that we want to get hashCode inside a setTimeout to make this non-blocking, but that way `mobx` will
   * not trigger memoization on computed so we need to enable `keepAlive`
   */
  precomputeHashes = flow(function* (this: PureModel, quiet?: boolean) {
    const startTime = Date.now();
    const hashMap = new Map<string, string>();
    if (this.allElements.length) {
      yield Promise.all(this.allElements.map(element => new Promise(resolve => setTimeout(() => {
        hashMap.set(element.path, element.hashCode);
        resolve();
      }, 0))));
    }
    quiet ? undefined : Log.info(LOG_EVENT.GRAPH_HASHES_PREPROCESSED, '[ASYNC]', Date.now() - startTime, 'ms');
  });

  @action setDependencyManager = (dependencyManager: DependencyManager): void => { this.dependencyManager = dependencyManager }

  getPrimitiveType = (type: PRIMITIVE_TYPE): PrimitiveType => guaranteeNonNullable(this.coreModel.primitiveTypesIndex.get(type), `Can't find primitive type '${type}'`)
  getNullablePackage = (path: string): Package | undefined => !path ? this.root : returnUndefOnError(() => Package.getOrCreatePackage(this.root, path, false));
  getElement = (path: string, includePackage?: boolean): PackageableElement => guaranteeNonNullable(this.getNullableElement(path, includePackage), `Can't find element '${path}'`);
  getProfileStereotype = (path: string, value: string): Stereotype | undefined => this.getProfile(path).getStereotype(value)
  getProfileTag = (path: string, value: string): Tag | undefined => this.getProfile(path).getTag(value)
  getNullableClass = (path: string): Class | undefined => returnUndefOnError(() => this.getClass(path))
  getNullableMapping = (path: string): Mapping | undefined => returnUndefOnError(() => this.getMapping(path))
  getNullableFileGeneration = (path: string): FileGeneration | undefined => returnUndefOnError(() => this.getFileGeneration(path))
  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  getType = (path: string): Type => guaranteeNonNullable(this.getOwnType(path) ?? this.generationModel.getOwnType(path) ?? this.dependencyManager.getOwnType(path) ?? this.systemModel.getOwnType(path) ?? this.coreModel.getOwnType(path), `Can't find type '${path}'`)
  getProfile = (path: string): Profile => guaranteeNonNullable(this.getOwnProfile(path) ?? this.generationModel.getOwnProfile(path) ?? this.dependencyManager.getOwnProfile(path) ?? this.systemModel.getOwnProfile(path), `Can't find profile '${path}'`)
  getEnumeration = (path: string): Enumeration => guaranteeType(this.getType(path), Enumeration, `Can't find enumeration '${path}'`)
  getMeasure = (path: string): Measure => guaranteeType(this.getType(path), Measure, `Can't find measure '${path}'`)
  getUnit = (path: string): Unit => guaranteeType(this.getType(path), Unit, `Can't find unit '${path}'`)
  getClass = (path: string): Class => guaranteeType(this.getType(path), Class, `Can't find class '${path}'`)
  getAssociation = (path: string): Association => guaranteeNonNullable(this.getOwnAssociation(path) ?? this.generationModel.getOwnAssociation(path) ?? this.dependencyManager.getOwnAssociation(path) ?? this.systemModel.getOwnAssociation(path), `Can't find association '${path}'`)
  getFunction = (path: string): ConcreteFunctionDefinition => guaranteeType(this.getOwnFunction(path) ?? this.generationModel.getOwnFunction(path) ?? this.dependencyManager.getOwnFunction(path) ?? this.systemModel.getOwnFunction(path), ConcreteFunctionDefinition, `Can't find function '${path}'`)
  getStore = (path: string): Store => guaranteeNonNullable(this.getOwnStore(path) ?? this.generationModel.getOwnStore(path) ?? this.dependencyManager.getOwnStore(path) ?? this.systemModel.getOwnStore(path) ?? this.coreModel.getOwnStore(path), `Can't find store '${path}'`)
  getMapping = (path: string): Mapping => guaranteeNonNullable(this.getOwnMapping(path) ?? this.generationModel.getOwnMapping(path) ?? this.dependencyManager.getOwnMapping(path) ?? this.systemModel.getOwnMapping(path), `Can't find mapping '${path}'`)
  getConnection = (path: string): PackageableConnection => guaranteeNonNullable(this.getOwnConnection(path) ?? this.generationModel.getOwnConnection(path) ?? this.dependencyManager.getOwnConnection(path) ?? this.systemModel.getOwnConnection(path), `Can't find connection '${path}'`)
  getRuntime = (path: string): PackageableRuntime => guaranteeNonNullable(this.getOwnRuntime(path) ?? this.generationModel.getOwnRuntime(path) ?? this.dependencyManager.getOwnRuntime(path) ?? this.systemModel.getOwnRuntime(path), `Can't find runtime '${path}'`)
  getDiagram = (path: string): Diagram => guaranteeNonNullable(this.getOwnDiagram(path) ?? this.generationModel.getOwnDiagram(path) ?? this.dependencyManager.getOwnDiagram(path) ?? this.systemModel.getOwnDiagram(path), `Can't find diagram '${path}'`)
  getText = (path: string): Text => guaranteeNonNullable(this.getOwnText(path) ?? this.generationModel.getOwnText(path) ?? this.dependencyManager.getOwnText(path) ?? this.systemModel.getOwnText(path) ?? this.legalModel.getOwnText(path), `Can't find text element '${path}'`)
  getGenerationSpecification = (path: string): GenerationSpecification => guaranteeNonNullable(this.getOwnGenerationSpecification(path) ?? this.generationModel.getOwnGenerationSpecification(path) ?? this.dependencyManager.getOwnGenerationSpecification(path) ?? this.systemModel.getOwnGenerationSpecification(path), `Can't find generation specification '${path}'`)
  getFileGeneration = (path: string): FileGeneration => guaranteeNonNullable(this.getOwnFileGeneration(path) ?? this.generationModel.getOwnFileGeneration(path) ?? this.dependencyManager.getOwnFileGeneration(path) ?? this.systemModel.getOwnFileGeneration(path), `Can't find file generation '${path}'`)

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  /**
   * NOTE: beware that this method will favor real element over generated ones when resolving
   */
  getNullableElement(path: string, includePackage?: boolean): PackageableElement | undefined {
    const element = this.getOwnSectionIndex(path)
      ?? this.getOwnType(path)
      ?? this.getOwnProfile(path)
      ?? this.getOwnAssociation(path)
      ?? this.getOwnFunction(path)
      ?? this.getOwnStore(path)
      ?? this.getOwnMapping(path)
      ?? this.getOwnDiagram(path)
      ?? this.getOwnText(path)
      ?? this.getOwnRuntime(path)
      ?? this.getOwnConnection(path)
      ?? this.getOwnFileGeneration(path)
      ?? this.getOwnGenerationSpecification(path)
      // search for element from immutable models
      ?? this.dependencyManager.getNullableElement(path)
      ?? this.generationModel.getNullableElement(path)
      ?? this.systemModel.getNullableElement(path)
      ?? this.legalModel.getNullableElement(path)
      ?? this.coreModel.getNullableElement(path);
    if (includePackage && !element) {
      return this.getNullablePackage(path)
        ?? this.dependencyManager.getNullableElement(path, true)
        ?? this.generationModel.getNullablePackage(path)
        ?? this.systemModel.getNullablePackage(path);
    }
    return element;
  }

  getTypicalMultiplicity = (name: TYPICAL_MULTIPLICITY_TYPE): Multiplicity => guaranteeNonNullable(this.coreModel.multiplicitiesIndex.get(name), `Can't find typical multiplicity with name ${name}`);

  getMultiplicity(lowerBound: number, upperBound: number | undefined): Multiplicity {
    let multiplicity: Multiplicity | undefined;
    if (lowerBound === 1 && upperBound === 1) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(TYPICAL_MULTIPLICITY_TYPE.ONE);
    } else if (lowerBound === 0 && upperBound === 1) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(TYPICAL_MULTIPLICITY_TYPE.ZEROONE);
    } else if (lowerBound === 0 && upperBound === undefined) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(TYPICAL_MULTIPLICITY_TYPE.ZEROMANY);
    } else if (lowerBound === 1 && upperBound === undefined) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(TYPICAL_MULTIPLICITY_TYPE.ONEMANY);
    } else if (lowerBound === 0 && upperBound === 0) {
      multiplicity = this.coreModel.multiplicitiesIndex.get(TYPICAL_MULTIPLICITY_TYPE.ZERO);
    }
    return multiplicity ?? new Multiplicity(lowerBound, upperBound);
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @action addElement(element: PackageableElement): void {
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
    } else if (element instanceof Text) {
      this.setText(element.path, element);
    } else if (element instanceof PackageableConnection) {
      this.setConnection(element.path, element);
    } else if (element instanceof PackageableRuntime) {
      this.setRuntime(element.path, element);
    } else if (element instanceof FileGeneration) {
      this.setFileGeneration(element.path, element);
    } else if (element instanceof GenerationSpecification) {
      this.setGenerationSpecification(element.path, element);
    } else if (element instanceof Package) {
      // do nothing
    } else {
      throw new UnsupportedOperationError(`Can't add element of unsupported type '${element}'`);
    }
  }
}
