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
  flowResult,
} from 'mobx';
import type { EditorStore } from './EditorStore';
import {
  type Clazz,
  type GeneratorFn,
  IllegalStateError,
  guaranteeType,
  UnsupportedOperationError,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { decorateRuntimeWithNewMapping } from './editor-state/element-editor-state/RuntimeEditorState';
import type { DSL_LegendStudioPlugin_Extension } from './LegendStudioPlugin';
import {
  type FileGenerationTypeOption,
  DEFAULT_GENERATION_SPECIFICATION_NAME,
} from './editor-state/GraphGenerationState';
import {
  type PackageableElement,
  type Runtime,
  type Store,
  type ModelStore,
  type Connection,
  type PureModelConnection,
  PRIMITIVE_TYPE,
  TYPICAL_MULTIPLICITY_TYPE,
  ELEMENT_PATH_DELIMITER,
  PACKAGEABLE_ELEMENT_TYPE,
  Package,
  Class,
  Association,
  Enumeration,
  ConcreteFunctionDefinition,
  Profile,
  Mapping,
  FlatData,
  Service,
  PackageableConnection,
  PackageableRuntime,
  PureSingleExecution,
  RawLambda,
  EngineRuntime,
  JsonModelConnection,
  FileGenerationSpecification,
  GenerationSpecification,
  FlatDataConnection,
  Database,
  PackageableElementExplicitReference,
  RelationalDatabaseConnection,
  DatabaseType,
  StaticDatasourceSpecification,
  DefaultH2AuthenticationStrategy,
  ModelGenerationSpecification,
} from '@finos/legend-graph';
import type { DSLMapping_LegendStudioPlugin_Extension } from './DSLMapping_LegendStudioPlugin_Extension';
import { package_addElement } from './graphModifier/DomainGraphModifierHelper';
import {
  packageableConnection_setConnectionValue,
  runtime_addMapping,
} from './graphModifier/DSLMapping_GraphModifierHelper';
import {
  fileGeneration_setScopeElements,
  fileGeneration_setType,
  generationSpecification_addGenerationElement,
} from './graphModifier/DSLGeneration_GraphModifierHelper';
import {
  service_initNewService,
  service_setExecution,
} from './graphModifier/DSLService_GraphModifierHelper';
import { graph_getOrCreatePackage } from './graphModifier/GraphModifierHelper';

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
  const packagePath =
    !selectedPackageName && !additionalPackageName
      ? ''
      : selectedPackageName
      ? `${selectedPackageName}${
          additionalPackageName
            ? `${ELEMENT_PATH_DELIMITER}${additionalPackageName}`
            : ''
        }`
      : additionalPackageName;
  return [packagePath, elementName];
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
  mapping?: Mapping | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      mapping: observable,
      setMapping: action,
      isValid: computed,
    });

    const mappings = this.editorStore.graphManagerState.graph.ownMappings;
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
    runtime.runtimeValue = new EngineRuntime();
    runtime_addMapping(
      runtime.runtimeValue,
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

export class NewPureModelConnectionDriver extends NewConnectionValueDriver<PureModelConnection> {
  class?: Class | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      class: observable,
      setClass: action,
      isValid: computed,
    });

    const classes = this.editorStore.graphManagerState.graph.ownClasses;
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

export class NewRelationalDatabaseConnectionDriver extends NewConnectionValueDriver<RelationalDatabaseConnection> {
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
      const dbs = this.editorStore.graphManagerState.graph.ownDatabases;
      selectedStore = dbs.length ? (dbs[0] as Database) : Database.createStub();
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
  MODEL_CONNECTION = 'MODEL_CONNECTION',
}

const getConnectionType = (
  val: NewConnectionValueDriver<Connection>,
): CONNECTION_TYPE => {
  if (val instanceof NewPureModelConnectionDriver) {
    return CONNECTION_TYPE.MODEL_CONNECTION;
  }
  return CONNECTION_TYPE.RELATIONAL;
};

export class NewPackageableConnectionDriver extends NewElementDriver<PackageableConnection> {
  store?: Store | undefined;
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
      case CONNECTION_TYPE.MODEL_CONNECTION:
        this.newConnectionValueDriver = new NewPureModelConnectionDriver(
          this.editorStore,
        );
        break;
      case CONNECTION_TYPE.RELATIONAL:
        this.newConnectionValueDriver =
          new NewRelationalDatabaseConnectionDriver(this.editorStore);
        break;
      default:
        null;
    }
  }

  getNewConnectionValueDriverBasedOnStore(
    store: Store | undefined,
  ): NewConnectionValueDriver<Connection> {
    if (store === undefined) {
      return new NewPureModelConnectionDriver(this.editorStore);
    } else if (store instanceof FlatData) {
      return new NewFlatDataConnectionDriver(this.editorStore);
    } else if (store instanceof Database) {
      return new NewRelationalDatabaseConnectionDriver(this.editorStore);
    }
    const extraNewConnectionDriverCreators = this.editorStore.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLMapping_LegendStudioPlugin_Extension
          ).getExtraNewConnectionDriverCreators?.() ?? [],
      );
    for (const creator of extraNewConnectionDriverCreators) {
      const driver = creator(this.editorStore, store);
      if (driver) {
        return driver;
      }
    }
    throw new UnsupportedOperationError(
      `Can't create new connection driver for store: no compatible creator available from plugins`,
      store,
    );
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
    packageableConnection_setConnectionValue(
      connection,
      this.newConnectionValueDriver.createConnection(
        this.store ?? this.editorStore.graphManagerState.graph.modelStore,
      ),
      this.editorStore.changeDetectionState.observerContext,
    ); // default to model store
    return connection;
  }
}

export class NewFileGenerationDriver extends NewElementDriver<FileGenerationSpecification> {
  typeOption?: FileGenerationTypeOption | undefined;

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
    fileGeneration_setType(
      fileGeneration,
      guaranteeNonNullable(this.typeOption).value,
    );
    // default to all packages
    fileGeneration_setScopeElements(
      fileGeneration,
      this.editorStore.graphManagerState.graph.root.children
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
    return !this.editorStore.graphManagerState.graph
      .ownGenerationSpecifications;
  }

  createElement(name: string): GenerationSpecification {
    return new GenerationSpecification(name);
  }
}

export class NewElementState {
  editorStore: EditorStore;
  showModal = false;
  showType = false;
  type: string;
  _package?: Package | undefined;
  name = '';
  newElementDriver?: NewElementDriver<PackageableElement> | undefined;

  constructor(editorStore: EditorStore) {
    makeAutoObservable(this, {
      editorStore: false,
      setShowModal: action,
      setName: action,
      setShowType: action,
      setNewElementDriver: action,
      setPackage: action,
      setElementType: action,
      openModal: action,
      closeModal: action,
      createElement: action,
    });

    this.editorStore = editorStore;
    this.type = PACKAGEABLE_ELEMENT_TYPE.PACKAGE;
  }

  get elementAndPackageName(): [string, string] {
    return resolvePackageAndElementName(
      this.selectedPackage,
      this._package === this.editorStore.graphManagerState.graph.root,
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

  setShowModal(val: boolean): void {
    this.showModal = val;
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
      `New element driver is not of the specified type (this is likely caused by calling this method at the wrong place)`,
    );
  }

  setElementType(newType: string): void {
    if (this.type !== newType) {
      let driver: NewElementDriver<PackageableElement> | undefined = undefined;
      switch (newType) {
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
          const extraNewElementDriverCreators = this.editorStore.pluginManager
            .getStudioPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_LegendStudioPlugin_Extension
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
    this.setShowModal(true);
    this.setElementType(type ?? PACKAGEABLE_ELEMENT_TYPE.PACKAGE);
    this.setPackage(_package);
    this.setShowType(!type);
  }

  closeModal(): void {
    this.setShowModal(false);
    this.setElementType(PACKAGEABLE_ELEMENT_TYPE.PACKAGE);
    this.setPackage(undefined);
    this.setShowType(false);
    this.setName('');
  }

  *save(): GeneratorFn<void> {
    if (this.name && this.isValid) {
      const [packagePath, elementName] = this.elementAndPackageName;
      if (
        this.editorStore.graphManagerState.graph.getNullablePackage(
          packagePath,
        ) === this.editorStore.graphManagerState.graph.root &&
        this.type !== PACKAGEABLE_ELEMENT_TYPE.PACKAGE
      ) {
        throw new IllegalStateError(
          `Can't create elements for type other than 'package' in root package`,
        );
      } else {
        const element = this.createElement(elementName);
        package_addElement(
          packagePath
            ? graph_getOrCreatePackage(
                this.editorStore.graphManagerState.graph,
                packagePath,
              )
            : this.editorStore.graphManagerState.graph.root,
          element,
          this.editorStore.changeDetectionState.observerContext,
        );

        yield flowResult(this.editorStore.addElement(element, true));

        // post creation handling
        if (
          element instanceof FileGenerationSpecification ||
          element instanceof ModelGenerationSpecification
        ) {
          const generationElement = element;
          const generationSpecifications =
            this.editorStore.graphManagerState.graph
              .ownGenerationSpecifications;
          let generationSpec: GenerationSpecification;
          if (generationSpecifications.length) {
            // TODO? handle case when more than one generation specification
            generationSpec =
              generationSpecifications[0] as GenerationSpecification;
          } else {
            generationSpec = new GenerationSpecification(
              DEFAULT_GENERATION_SPECIFICATION_NAME,
            );
            package_addElement(
              guaranteeNonNullable(generationElement.package),
              generationSpec,
              this.editorStore.changeDetectionState.observerContext,
            );
            yield flowResult(
              this.editorStore.addElement(generationSpec, false),
            );
          }
          generationSpecification_addGenerationElement(
            generationSpec,
            generationElement,
          );
        }

        const extraElementEditorPostCreateActions =
          this.editorStore.pluginManager
            .getStudioPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_LegendStudioPlugin_Extension
                ).getExtraElementEditorPostCreateActions?.() ?? [],
            );
        for (const postCreateAction of extraElementEditorPostCreateActions) {
          postCreateAction(this.editorStore, element);
        }
      }
    }
    this.closeModal();
  }

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
            this.editorStore.graphManagerState.graph.getPrimitiveType(
              PRIMITIVE_TYPE.STRING,
            ),
          ),
          this.editorStore.graphManagerState.graph.getTypicalMultiplicity(
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
      case PACKAGEABLE_ELEMENT_TYPE.SERVICE: {
        const service = new Service(name);
        const mapping = Mapping.createStub(); // since it does not really make sense to start with the first available mapping, we start with a stub
        const runtimes =
          this.editorStore.graphManagerState.graph.ownRuntimes.filter(
            (runtime) =>
              runtime.runtimeValue.mappings
                .map((m) => m.value)
                .includes(mapping),
          );
        let runtimeValue: Runtime;
        if (runtimes.length) {
          runtimeValue = (runtimes[0] as PackageableRuntime).runtimeValue;
        } else {
          runtimeValue = new EngineRuntime();
          decorateRuntimeWithNewMapping(
            runtimeValue,
            mapping,
            this.editorStore,
          );
        }
        service_setExecution(
          service,
          new PureSingleExecution(
            RawLambda.createStub(),
            service,
            PackageableElementExplicitReference.create(mapping),
            runtimeValue,
          ),
          this.editorStore.changeDetectionState.observerContext,
        );
        service_initNewService(service);
        const currentUserId =
          this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig()
            .currentUserId;
        if (currentUserId) {
          service.owners = [currentUserId];
        }
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
        const extraNewElementFromStateCreators = this.editorStore.pluginManager
          .getStudioPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_LegendStudioPlugin_Extension
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
            `Can't create element of type '${this.type}': no compatible element creator available from plugins`,
          );
        }
      }
    }
    return element;
  }
}
