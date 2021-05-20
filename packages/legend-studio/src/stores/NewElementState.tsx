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
  action,
  observable,
  computed,
  makeObservable,
  makeAutoObservable,
} from 'mobx';
import type { EditorStore } from './EditorStore';
import {
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  ELEMENT_PATH_DELIMITER,
} from '../models/MetaModelConst';
import type { Clazz } from '@finos/legend-studio-shared';
import {
  IllegalStateError,
  guaranteeType,
  UnsupportedOperationError,
  guaranteeNonNullable,
} from '@finos/legend-studio-shared';
import { decorateRuntimeWithNewMapping } from './editor-state/element-editor-state/RuntimeEditorState';
import type { PackageableElement } from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import { PACKAGEABLE_ELEMENT_TYPE } from '../models/metamodels/pure/model/packageableElements/PackageableElement';
import { Package } from '../models/metamodels/pure/model/packageableElements/domain/Package';
import { Class } from '../models/metamodels/pure/model/packageableElements/domain/Class';
import { Association } from '../models/metamodels/pure/model/packageableElements/domain/Association';
import { Enumeration } from '../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { ConcreteFunctionDefinition } from '../models/metamodels/pure/model/packageableElements/domain/ConcreteFunctionDefinition';
import { Profile } from '../models/metamodels/pure/model/packageableElements/domain/Profile';
import { Mapping } from '../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { FlatData } from '../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { Diagram } from '../models/metamodels/pure/model/packageableElements/diagram/Diagram';
import { Service } from '../models/metamodels/pure/model/packageableElements/service/Service';
import { PackageableConnection } from '../models/metamodels/pure/model/packageableElements/connection/PackageableConnection';
import { PackageableRuntime } from '../models/metamodels/pure/model/packageableElements/runtime/PackageableRuntime';
import { PureSingleExecution } from '../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import { RawLambda } from '../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import type { Runtime } from '../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { EngineRuntime } from '../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import type { Store } from '../models/metamodels/pure/model/packageableElements/store/Store';
import type { ModelStore } from '../models/metamodels/pure/model/packageableElements/store/modelToModel/model/ModelStore';
import type { Connection } from '../models/metamodels/pure/model/packageableElements/connection/Connection';
import type { PureModelConnection } from '../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/PureModelConnection';
import { JsonModelConnection } from '../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import type { FileGenerationTypeOption } from '../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { FileGenerationSpecification } from '../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import {
  GenerationSpecification,
  DEFAULT_GENERATION_SPECIFICATION_NAME,
} from '../models/metamodels/pure/model/packageableElements/generationSpecification/GenerationSpecification';
import { FlatDataConnection } from '../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import { Database } from '../models/metamodels/pure/model/packageableElements/store/relational/model/Database';
import { PackageableElementExplicitReference } from '../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { ServiceStore } from '../models/metamodels/pure/model/packageableElements/store/relational/model/ServiceStore';
import {
  RelationalDatabaseConnection,
  DatabaseType,
} from '../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { StaticDatasourceSpecification } from '../models/metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import type { DSL_EditorPlugin_Extension } from './EditorPlugin';
import { DefaultH2AuthenticationStrategy } from '../models/metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import { ModelGenerationSpecification } from '../models/metamodels/pure/model/packageableElements/generationSpecification/ModelGenerationSpecification';

export const resolvePackageAndElementName = (
  _package: Package,
  isPackageRoot: boolean,
  name: string,
): [string, string] => {
  const index = name.lastIndexOf(ELEMENT_PATH_DELIMITER);
  const elementName =
    index === -1 ? name : name.substring(index + 2, name.length);
  const additionalPackageName = index === -1 ? '' : name.substring(0, index);
  const selectedPackageName = isPackageRoot ? '' : _package.path;
  const packageName =
    !selectedPackageName && !additionalPackageName
      ? ''
      : selectedPackageName
      ? `${selectedPackageName}${
          additionalPackageName
            ? `${ELEMENT_PATH_DELIMITER}${additionalPackageName}`
            : ''
        }`
      : additionalPackageName;
  return [packageName, elementName];
};

export abstract class NewElementDriver<T extends PackageableElement> {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  abstract get isValid(): boolean;

  abstract createElement(name: string): T;
}

export class NewPackageableRuntimeDriver extends NewElementDriver<PackageableRuntime> {
  mapping?: Mapping;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      mapping: observable,
      setMapping: action,
      isValid: computed,
    });

    const mappings = this.editorStore.graphState.graph.mappings;
    if (mappings.length) {
      this.mapping = mappings[0];
    }
  }

  setMapping(mapping: Mapping): void {
    this.mapping = mapping;
  }

  get isValid(): boolean {
    return Boolean(this.mapping);
  }

  createElement(name: string): PackageableRuntime {
    const runtime = new PackageableRuntime(name);
    runtime.setRuntimeValue(new EngineRuntime());
    runtime.runtimeValue.addMapping(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.mapping),
      ),
    );
    return runtime;
  }
}

export abstract class NewConnectionValueDriver<T extends Connection> {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  abstract get isValid(): boolean;
  abstract createConnection(store: Store): T;
}

/* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
export class NewPureModelConnectionDriver extends NewConnectionValueDriver<PureModelConnection> {
  class?: Class;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      class: observable,
      setClass: action,
      isValid: computed,
    });

    const classes = this.editorStore.graphState.graph.classes;
    if (classes.length) {
      this.class = classes[0];
    }
  }

  setClass(_class: Class): void {
    this.class = _class;
  }

  get isValid(): boolean {
    return Boolean(this.class);
  }

  createConnection(store: ModelStore): PureModelConnection {
    return new JsonModelConnection(
      PackageableElementExplicitReference.create(store),
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.class),
      ),
    );
  }
}

export class NewFlatDataConnectionDriver extends NewConnectionValueDriver<FlatDataConnection> {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return true;
  }

  createConnection(store: FlatData): FlatDataConnection {
    return new FlatDataConnection(
      PackageableElementExplicitReference.create(store),
    );
  }
}

export class NewRelationalDbConnectionDriver extends NewConnectionValueDriver<RelationalDatabaseConnection> {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return true;
  }

  createConnection(store: Store): RelationalDatabaseConnection {
    let selectedStore: Database;
    if (store instanceof Database) {
      selectedStore = store;
    } else {
      const dbs = this.editorStore.graphState.graph.databases;
      selectedStore = dbs.length ? dbs[0] : Database.createStub();
    }
    return new RelationalDatabaseConnection(
      PackageableElementExplicitReference.create(selectedStore),
      DatabaseType.H2,
      new StaticDatasourceSpecification('dummyHost', 80, 'myDb'),
      new DefaultH2AuthenticationStrategy(),
    );
  }
}

export enum CONNECTION_TYPE {
  RELATIONAL = 'RELATIONAL',
  MODEL_CONNECITON = 'MODEL_CONNECITON',
}

const getConnectionType = (
  val: NewConnectionValueDriver<Connection>,
): CONNECTION_TYPE => {
  if (val instanceof NewPureModelConnectionDriver) {
    return CONNECTION_TYPE.MODEL_CONNECITON;
  }
  return CONNECTION_TYPE.RELATIONAL;
};

export class NewPackageableConnectionDriver extends NewElementDriver<PackageableConnection> {
  store?: Store;
  newConnectionValueDriver: NewConnectionValueDriver<Connection>;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      store: observable,
      newConnectionValueDriver: observable,
      setStore: action,
      changeConnectionState: action,
      isValid: computed,
    });

    this.newConnectionValueDriver =
      this.getNewConnectionValueDriverBasedOnStore(undefined);
  }

  geDriverConnectionType(): CONNECTION_TYPE {
    return getConnectionType(this.newConnectionValueDriver);
  }

  changeConnectionState(val: CONNECTION_TYPE): void {
    switch (val) {
      case CONNECTION_TYPE.MODEL_CONNECITON:
        this.newConnectionValueDriver = new NewPureModelConnectionDriver(
          this.editorStore,
        );
        break;
      case CONNECTION_TYPE.RELATIONAL:
        this.newConnectionValueDriver = new NewRelationalDbConnectionDriver(
          this.editorStore,
        );
        break;
      default:
        null;
    }
  }

  /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
  getNewConnectionValueDriverBasedOnStore(
    store: Store | undefined,
  ): NewConnectionValueDriver<Connection> {
    if (store === undefined) {
      return new NewPureModelConnectionDriver(this.editorStore);
    } else if (store instanceof FlatData) {
      return new NewFlatDataConnectionDriver(this.editorStore);
    } else if (store instanceof Database) {
      return new NewRelationalDbConnectionDriver(this.editorStore);
    }
    throw new UnsupportedOperationError();
  }

  setStore(store: Store | undefined): void {
    this.store = store;
    this.newConnectionValueDriver =
      this.getNewConnectionValueDriverBasedOnStore(store);
  }

  get isValid(): boolean {
    return this.newConnectionValueDriver.isValid;
  }

  createElement(name: string): PackageableConnection {
    const connection = new PackageableConnection(name);
    connection.setConnectionValue(
      this.newConnectionValueDriver.createConnection(
        this.store ?? this.editorStore.graphState.graph.modelStore,
      ),
    ); // default to model store
    return connection;
  }
}

export class NewFileGenerationDriver extends NewElementDriver<FileGenerationSpecification> {
  typeOption?: FileGenerationTypeOption;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      typeOption: observable,
      setTypeOption: action,
    });

    this.typeOption = editorStore.graphState.graphGenerationState
      .fileGenerationConfigurationOptions.length
      ? editorStore.graphState.graphGenerationState
          .fileGenerationConfigurationOptions[0]
      : undefined;
  }

  setTypeOption(typeOption: FileGenerationTypeOption | undefined): void {
    this.typeOption = typeOption;
  }

  get isValid(): boolean {
    return Boolean(this.typeOption);
  }

  createElement(name: string): FileGenerationSpecification {
    const fileGeneration = new FileGenerationSpecification(name);
    fileGeneration.setType(guaranteeNonNullable(this.typeOption).value);
    // default to all packages
    fileGeneration.setScopeElements(
      this.editorStore.graphState.graph.root.children
        .filter((element) => element instanceof Package)
        .map((element) => PackageableElementExplicitReference.create(element)),
    );
    return fileGeneration;
  }
}

// Note: Main reason for driver is to disallow if generation specification already exists
export class NewGenerationSpecificationDriver extends NewElementDriver<GenerationSpecification> {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return !this.editorStore.graphState.graph.generationSpecifications;
  }

  createElement(name: string): GenerationSpecification {
    return new GenerationSpecification(name);
  }
}

export class NewElementState {
  editorStore: EditorStore;
  modal = false;
  showType = false;
  type: string;
  _package?: Package;
  name = '';
  newElementDriver?: NewElementDriver<PackageableElement>;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      setModal: action,
      setName: action,
      setShowType: action,
      setNewElementDriver: action,
      setPackage: action,
      setElementType: action,
      openModal: action,
      closeModal: action,
      save: action,
      postCreatingElementAction: action,
      createElement: action,
    });

    this.editorStore = editorStore;
    this.type = PACKAGEABLE_ELEMENT_TYPE.PACKAGE;
  }

  get elementAndPackageName(): [string, string] {
    return resolvePackageAndElementName(
      this.selectedPackage,
      this.editorStore.graphState.graph.isRoot(this._package),
      this.name,
    );
  }
  get selectedPackage(): Package {
    return this._package
      ? this._package
      : this.editorStore.explorerTreeState.getSelectedNodePackage();
  }
  get isValid(): boolean {
    return this.newElementDriver?.isValid ?? true;
  }

  setModal(modal: boolean): void {
    this.modal = modal;
  }
  setName(name: string): void {
    this.name = name;
  }
  setShowType(showType: boolean): void {
    this.showType = showType;
  }
  setNewElementDriver(
    newElementDriver?: NewElementDriver<PackageableElement>,
  ): void {
    this.newElementDriver = newElementDriver;
  }
  setPackage(_package?: Package): void {
    this._package = _package;
  }

  getNewElementDriver<T extends NewElementDriver<PackageableElement>>(
    clazz: Clazz<T>,
  ): T {
    return guaranteeType(
      this.newElementDriver,
      clazz,
      `New element driver is not of expected type '${clazz.name}' (this is caused by calling this method at the wrong place)`,
    );
  }

  setElementType(newType: string): void {
    if (this.type !== newType) {
      let driver: NewElementDriver<PackageableElement> | undefined = undefined;
      switch (newType) {
        /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
        case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
          driver = new NewPackageableRuntimeDriver(this.editorStore);
          break;
        case PACKAGEABLE_ELEMENT_TYPE.CONNECTION:
          driver = new NewPackageableConnectionDriver(this.editorStore);
          break;
        case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
          driver = new NewFileGenerationDriver(this.editorStore);
          break;
        case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
          driver = new NewGenerationSpecificationDriver(this.editorStore);
          break;
        default: {
          const extraNewElementDriverCreators =
            this.editorStore.applicationStore.pluginManager
              .getEditorPlugins()
              .flatMap(
                (plugin) =>
                  (
                    plugin as DSL_EditorPlugin_Extension
                  ).getExtraNewElementDriverCreators?.() ?? [],
              );
          for (const creator of extraNewElementDriverCreators) {
            const _driver = creator(newType, this.editorStore);
            if (_driver) {
              driver = _driver;
              break;
            }
          }
          break;
        }
      }
      this.setNewElementDriver(driver);
      this.type = newType;
    }
  }

  openModal(type?: string, _package?: Package): void {
    this.setModal(true);
    this.setElementType(type ?? PACKAGEABLE_ELEMENT_TYPE.PACKAGE);
    this.setPackage(_package);
    this.setShowType(!type);
  }

  closeModal(): void {
    this.setModal(false);
    this.setElementType(PACKAGEABLE_ELEMENT_TYPE.PACKAGE);
    this.setPackage(undefined);
    this.setShowType(false);
    this.setName('');
  }

  save(): void {
    if (this.name && this.isValid) {
      const [packageName, elementName] = this.elementAndPackageName;
      if (
        this.editorStore.graphState.graph.isRoot(
          this.editorStore.graphState.graph.getNullablePackage(packageName),
        ) &&
        this.type !== PACKAGEABLE_ELEMENT_TYPE.PACKAGE
      ) {
        throw new IllegalStateError(
          `Can't create elements for type other than 'package' in root package`,
        );
      } else {
        const element = this.createElement(elementName);
        (packageName
          ? this.editorStore.graphState.graph.getOrCreatePackageWithPackageName(
              packageName,
            )
          : this.editorStore.graphState.graph.root
        ).addElement(element);
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

  postCreatingElementAction(element: PackageableElement): void {
    if (
      element instanceof FileGenerationSpecification ||
      element instanceof ModelGenerationSpecification
    ) {
      const generationElement = element;
      const generationSpecifications =
        this.editorStore.graphState.graph.generationSpecifications;
      let generationSpec: GenerationSpecification;
      if (generationSpecifications.length) {
        // TODO? handle case when more than one generation specification
        generationSpec = generationSpecifications[0];
      } else {
        generationSpec = new GenerationSpecification(
          DEFAULT_GENERATION_SPECIFICATION_NAME,
        );
        guaranteeNonNullable(generationElement.package).addElement(
          generationSpec,
        );
        this.editorStore.graphState.graph.addElement(generationSpec);
      }
      generationSpec.addGenerationElement(generationElement);
    }
  }

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
  createElement(name: string): PackageableElement {
    let element: PackageableElement | undefined;
    switch (this.type) {
      case PACKAGEABLE_ELEMENT_TYPE.PACKAGE:
        element = new Package(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.CLASS:
        element = new Class(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION:
        element = new Association(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION:
        element = new Enumeration(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.PROFILE:
        element = new Profile(name);
        break;
      // default for function -> return type: String, return Multiplicity 1
      case PACKAGEABLE_ELEMENT_TYPE.FUNCTION:
        element = new ConcreteFunctionDefinition(
          name,
          PackageableElementExplicitReference.create(
            this.editorStore.graphState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRING,
            ),
          ),
          this.editorStore.graphState.graph.getTypicalMultiplicity(
            TYPICAL_MULTIPLICITY_TYPE.ONE,
          ),
        );
        break;
      case PACKAGEABLE_ELEMENT_TYPE.MAPPING:
        element = new Mapping(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE:
        element = new FlatData(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.DATABASE:
        element = new Database(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.SERVICE_STORE:
        element = new ServiceStore(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM:
        element = new Diagram(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.SERVICE: {
        const service = new Service(name);
        const mapping = Mapping.createStub(); // since it does not really make sense to start with the first available mapping, we start with a stub
        const runtimes = this.editorStore.graphState.graph.runtimes.filter(
          (runtime) =>
            runtime.runtimeValue.mappings.map((m) => m.value).includes(mapping),
        );
        let runtimeValue: Runtime;
        if (runtimes.length) {
          runtimeValue = runtimes[0].runtimeValue;
        } else {
          runtimeValue = new EngineRuntime();
          decorateRuntimeWithNewMapping(
            runtimeValue,
            mapping,
            this.editorStore.graphState.graph,
          );
        }
        service.setExecution(
          new PureSingleExecution(
            RawLambda.createStub(),
            service,
            PackageableElementExplicitReference.create(mapping),
            runtimeValue,
          ),
        );
        service.initNewService();
        element = service;
        break;
      }
      case PACKAGEABLE_ELEMENT_TYPE.CONNECTION:
        element = this.getNewElementDriver(
          NewPackageableConnectionDriver,
        ).createElement(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
        element = this.getNewElementDriver(
          NewPackageableRuntimeDriver,
        ).createElement(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
        element = this.getNewElementDriver(
          NewFileGenerationDriver,
        ).createElement(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
        element = new GenerationSpecification(name);
        break;
      default: {
        const extraNewElementFromStateCreators =
          this.editorStore.applicationStore.pluginManager
            .getEditorPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_EditorPlugin_Extension
                ).getExtraNewElementFromStateCreators?.() ?? [],
            );
        for (const creator of extraNewElementFromStateCreators) {
          const _element = creator(this.type, name, this);
          if (_element) {
            element = _element;
            break;
          }
        }
        if (!element) {
          throw new UnsupportedOperationError(
            `Can't create element of type '${this.type}'. No compatible element creator available from plugins.`,
          );
        }
      }
    }
    return element;
  }
}
