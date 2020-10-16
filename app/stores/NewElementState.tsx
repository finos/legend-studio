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

import { action, observable, computed } from 'mobx';
import { EditorStore } from './EditorStore';
import { PRIMITIVE_TYPE, TYPICAL_MULTIPLICITY_TYPE, ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { IllegalStateError, Clazz, guaranteeType, UnsupportedOperationError, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { PACKAGEABLE_ELEMENT_TYPE, PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Association } from 'MM/model/packageableElements/domain/Association';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Text } from 'MM/model/packageableElements/text/Text';
import { ConcreteFunctionDefinition } from 'MM/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Profile } from 'MM/model/packageableElements/domain/Profile';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Diagram } from 'MM/model/packageableElements/diagram/Diagram';
import { PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { EngineRuntime } from 'MM/model/packageableElements/runtime/Runtime';
import { Store } from 'MM/model/packageableElements/store/Store';
import { ModelStore } from 'MM/model/packageableElements/store/modelToModel/model/ModelStore';
import { Connection } from 'MM/model/packageableElements/connection/Connection';
import { PureModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/PureModelConnection';
import { JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { FileGeneration, FileGenerationTypeOption } from 'MM/model/packageableElements/fileGeneration/FileGeneration';
import { GenerationSpecification, DEFAULT_GENERATION_SPECIFICATION_NAME } from 'MM/model/packageableElements/generationSpecification/GenerationSpecification';
import { PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';

export const resolvePackageAndElementName = (_package: Package, isPackageRoot: boolean, name: string): [string, string] => {
  const index = name.lastIndexOf(ENTITY_PATH_DELIMITER);
  const elementName = index === -1 ? name : name.substring(index + 2, name.length);
  const additionalPackageName = index === -1 ? '' : name.substring(0, index);
  const selectedPackageName = isPackageRoot ? '' : _package.path;
  const packageName = !selectedPackageName && !additionalPackageName
    ? ''
    : selectedPackageName
      ? `${selectedPackageName}${additionalPackageName ? `${ENTITY_PATH_DELIMITER}${additionalPackageName}` : ''}`
      : additionalPackageName;
  return [packageName, elementName];
};

export abstract class NewElementDriver<T extends PackageableElement> {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  abstract get isValid(): boolean

  abstract createElement(name: string): T
}

export class NewPackageableRuntimeDriver extends NewElementDriver<PackageableRuntime> {
  @observable mapping?: Mapping;

  constructor(editorStore: EditorStore) {
    super(editorStore);
    const mappings = this.editorStore.graphState.graph.mappings;
    if (mappings.length) { this.mapping = mappings[0] }
  }

  @action setMapping(mapping: Mapping): void { this.mapping = mapping }

  @computed get isValid(): boolean { return Boolean(this.mapping) }

  createElement(name: string): PackageableRuntime {
    const runtime = new PackageableRuntime(name);
    runtime.setRuntimeValue(new EngineRuntime());
    runtime.runtimeValue.addMapping(PackageableElementExplicitReference.create(guaranteeNonNullable(this.mapping)));
    return runtime;
  }
}

export abstract class NewConnectionValueDriver<T extends Connection> {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  abstract get isValid(): boolean
  abstract createConnection(store: Store): T
}

/* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
export class NewPureModelConnectionDriver extends NewConnectionValueDriver<PureModelConnection> {
  @observable class?: Class;

  constructor(editorStore: EditorStore) {
    super(editorStore);
    const classes = this.editorStore.graphState.graph.classes;
    if (classes.length) { this.class = classes[0] }
  }

  @action setClass(_class: Class): void { this.class = _class }

  @computed get isValid(): boolean {
    return Boolean(this.class);
  }

  createConnection(store: ModelStore): PureModelConnection {
    return new JsonModelConnection(PackageableElementExplicitReference.create(store), PackageableElementExplicitReference.create(guaranteeNonNullable(this.class)));
  }
}
export class NewPackageableConnectionDriver extends NewElementDriver<PackageableConnection> {
  @observable store?: Store;
  @observable newConnectionValueDriver: NewConnectionValueDriver<Connection>

  constructor(editorStore: EditorStore) {
    super(editorStore);
    this.newConnectionValueDriver = this.getNewConnectionValueDriverBasedOnStore(undefined);
  }

  /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
  getNewConnectionValueDriverBasedOnStore(store: Store | undefined): NewConnectionValueDriver<Connection> {
    if (store === undefined) {
      return new NewPureModelConnectionDriver(this.editorStore);
    }
    throw new UnsupportedOperationError();
  }

  @action setStore(store: Store | undefined): void {
    this.store = store;
    this.newConnectionValueDriver = this.getNewConnectionValueDriverBasedOnStore(store);
  }

  @computed get isValid(): boolean {
    return this.newConnectionValueDriver.isValid;
  }

  createElement(name: string): PackageableConnection {
    const connection = new PackageableConnection(name);
    connection.setConnectionValue(this.newConnectionValueDriver.createConnection(this.store ?? this.editorStore.graphState.graph.modelStore)); // default to model store
    return connection;
  }
}

export class NewFileGenerationDriver extends NewElementDriver<FileGeneration> {
  @observable typeOption?: FileGenerationTypeOption;

  constructor(editorStore: EditorStore) {
    super(editorStore);
    this.typeOption = editorStore.graphState.graphGenerationState.fileGenerationConfigurationOptions.length ?
      editorStore.graphState.graphGenerationState.fileGenerationConfigurationOptions[0] : undefined;
  }

  @action setTypeOption(typeOption: FileGenerationTypeOption | undefined): void {
    this.typeOption = typeOption;
  }

  get isValid(): boolean {
    return Boolean(this.typeOption);
  }

  createElement(name: string): FileGeneration {
    const fileGeneration = new FileGeneration(name);
    fileGeneration.setType(guaranteeNonNullable(this.typeOption).value);
    // default to all packages
    fileGeneration.setScopeElements(this.editorStore.graphState.graph.root.children.filter(element => element instanceof Package).map(element => PackageableElementExplicitReference.create(element)));
    return fileGeneration;
  }
}

// Note: Main reason for driver is to disallow if generation specification already exists
export class NewGenerationSpecificationDriver extends NewElementDriver<GenerationSpecification> {
  @computed get isValid(): boolean { return !this.editorStore.graphState.graph.generationSpecifications }

  createElement(name: string): GenerationSpecification {
    return new GenerationSpecification(name);
  }
}

export class NewElementState {
  editorStore: EditorStore;
  @observable modal = false;
  @observable showType = false;
  @observable type: PACKAGEABLE_ELEMENT_TYPE;
  @observable _package?: Package;
  @observable name = '';
  @observable newElementDriver?: NewElementDriver<PackageableElement>;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
    this.type = PACKAGEABLE_ELEMENT_TYPE.PACKAGE;
  }

  @action setModal(modal: boolean): void { this.modal = modal }
  @action setName(name: string): void { this.name = name }
  @action setShowType(showType: boolean): void { this.showType = showType }
  @action setNewElementDriver(newElementDriver?: NewElementDriver<PackageableElement>): void { this.newElementDriver = newElementDriver }
  @action setPackage(_package?: Package): void { this._package = _package }

  getNewElementDriver<T extends NewElementDriver<PackageableElement>>(clazz: Clazz<T>): T {
    return guaranteeType(this.newElementDriver, clazz, `New element driver is not of expected type '${clazz.name}' (this is caused by calling this method at the wrong place)`);
  }

  @action setElementType(newType: PACKAGEABLE_ELEMENT_TYPE): void {
    if (this.type !== newType) {
      let driver: NewElementDriver<PackageableElement> | undefined = undefined;
      switch (newType) {
        /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
        case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: driver = new NewPackageableRuntimeDriver(this.editorStore); break;
        case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: driver = new NewPackageableConnectionDriver(this.editorStore); break;
        case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: driver = new NewFileGenerationDriver(this.editorStore); break;
        case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION: driver = new NewGenerationSpecificationDriver(this.editorStore); break;
        default: break;
      }
      this.setNewElementDriver(driver);
      this.type = newType;
    }
  }

  @action openModal(type?: PACKAGEABLE_ELEMENT_TYPE, _package?: Package): void {
    this.setModal(true);
    this.setElementType(type ?? PACKAGEABLE_ELEMENT_TYPE.PACKAGE);
    this.setPackage(_package);
    this.setShowType(!type);
  }

  @action closeModal(): void {
    this.setModal(false);
    this.setElementType(PACKAGEABLE_ELEMENT_TYPE.PACKAGE);
    this.setPackage(undefined);
    this.setShowType(false);
    this.setName('');
  }

  @action save(): void {
    if (this.name && this.isValid) {
      const [packageName, elementName] = this.elementAndPackageName;
      if (this.editorStore.graphState.graph.isRoot(this.editorStore.graphState.graph.getNullablePackage(packageName)) && this.type !== PACKAGEABLE_ELEMENT_TYPE.PACKAGE) {
        throw new IllegalStateError(`Can't create elements for type other than 'package' in root package`);
      } else {
        const element = this.createElement(elementName);
        (packageName ? this.editorStore.graphState.graph.getOrCreatePackageWithPackageName(packageName) : this.editorStore.graphState.graph.root).addElement(element);
        this.editorStore.graphState.graph.addElement(element);
        if (element instanceof Package) {
          // expand tree node only
          this.editorStore.explorerTreeState.openNode(element);
        } else {
          this.editorStore.openElement(element);
        }
        this.postCreatingElementAction(element);
      }
    }
    this.closeModal();
  }

  @action postCreatingElementAction(elementAdded: PackageableElement): void {
    const type = getPackageableElementType(elementAdded);
    switch (type) {
      case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: this.handleAddingGenerationElement(elementAdded); break;
      default: break;
    }
  }

  @action handleAddingGenerationElement(generationElement: PackageableElement): void {
    const generationSpecifications = this.editorStore.graphState.graph.generationSpecifications;
    let generationSpec: GenerationSpecification;
    if (generationSpecifications.length) {
      // TODO? handle case when more than one generation specification
      generationSpec = generationSpecifications[0];
    } else {
      generationSpec = new GenerationSpecification(DEFAULT_GENERATION_SPECIFICATION_NAME);
      guaranteeNonNullable(generationElement.package).addElement(generationSpec);
      this.editorStore.graphState.graph.addElement(generationSpec);
    }
    generationSpec.addGenerationElement(generationElement);
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  @action createElement(name: string): PackageableElement {
    let element: PackageableElement;
    switch (this.type) {
      case PACKAGEABLE_ELEMENT_TYPE.PACKAGE: element = new Package(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.CLASS: element = new Class(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION: element = new Association(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION: element = new Enumeration(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.PROFILE: element = new Profile(name); break;
      // default for function -> return type: String, return Multiplicity 1
      case PACKAGEABLE_ELEMENT_TYPE.FUNCTION: element = new ConcreteFunctionDefinition(name, PackageableElementExplicitReference.create(this.editorStore.graphState.graph.getPrimitiveType(PRIMITIVE_TYPE.STRING)), this.editorStore.graphState.graph.getTypicalMultiplicity(TYPICAL_MULTIPLICITY_TYPE.ONE)); break;
      case PACKAGEABLE_ELEMENT_TYPE.MAPPING: element = new Mapping(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM: element = new Diagram(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.TEXT: element = new Text(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: element = this.getNewElementDriver(NewPackageableConnectionDriver).createElement(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: element = this.getNewElementDriver(NewPackageableRuntimeDriver).createElement(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: element = this.getNewElementDriver(NewFileGenerationDriver).createElement(name); break;
      case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION: element = new GenerationSpecification(name); break;
      default: throw new UnsupportedOperationError(`Can't create element of unsupported type '${this.type}'`);
    }
    return element;
  }

  @computed get elementAndPackageName(): [string, string] {
    return resolvePackageAndElementName(this.selectedPackage, this.editorStore.graphState.graph.isRoot(this._package), this.name);
  }

  @computed get selectedPackage(): Package {
    return this._package ? this._package : this.editorStore.explorerTreeState.getSelectedNodePackage();
  }

  @computed get isValid(): boolean { return this.newElementDriver?.isValid ?? true }
}
