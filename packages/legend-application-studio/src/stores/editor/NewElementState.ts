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
  flowResult,
  flow,
} from 'mobx';
import type { EditorStore } from './EditorStore.js';
import {
  type Clazz,
  type GeneratorFn,
  IllegalStateError,
  guaranteeType,
  UnsupportedOperationError,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { decorateRuntimeWithNewMapping } from './editor-state/element-editor-state/RuntimeEditorState.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../LegendStudioApplicationPlugin.js';
import {
  type GenerationTypeOption,
  DEFAULT_GENERATION_SPECIFICATION_NAME,
} from './editor-state/GraphGenerationState.js';
import {
  type PackageableElement,
  type Runtime,
  type Store,
  ModelStore,
  type Connection,
  type PureModelConnection,
  ELEMENT_PATH_DELIMITER,
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
  EngineRuntime,
  JsonModelConnection,
  FileGenerationSpecification,
  GenerationSpecification,
  FlatDataConnection,
  Database,
  PackageableElementExplicitReference,
  RelationalDatabaseConnection,
  DatabaseType,
  DefaultH2AuthenticationStrategy,
  ModelGenerationSpecification,
  DataElement,
  stub_Database,
  Measure,
  Multiplicity,
  PrimitiveType,
  LocalH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
  SnowflakePublicAuthenticationStrategy,
  StoreConnections,
  ConnectionPointer,
  IdentifiedConnection,
  generateIdentifiedConnectionId,
  getMappingCompatibleRuntimes,
  RuntimePointer,
  GenericTypeExplicitReference,
  GenericType,
} from '@finos/legend-graph';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import {
  packageableConnection_setConnectionValue,
  runtime_addMapping,
} from '../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import {
  fileGeneration_setScopeElements,
  fileGeneration_setType,
  generationSpecification_addGenerationElement,
} from '../graph-modifier/DSL_Generation_GraphModifierHelper.js';
import {
  service_initNewService,
  service_setExecution,
} from '../graph-modifier/DSL_Service_GraphModifierHelper.js';
import type { EmbeddedDataTypeOption } from './editor-state/element-editor-state/data/DataEditorState.js';
import { dataElement_setEmbeddedData } from '../graph-modifier/DSL_Data_GraphModifierHelper.js';
import { PACKAGEABLE_ELEMENT_TYPE } from './utils/ModelClassifierUtils.js';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { EmbeddedDataType } from './editor-state/ExternalFormatState.js';
import { createEmbeddedData } from './editor-state/element-editor-state/data/EmbeddedDataState.js';

export const CUSTOM_LABEL = '(custom)';

export type RuntimeOption = {
  label: string;
  value: PackageableRuntime | undefined;
};

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

export const handlePostCreateAction = async (
  element: PackageableElement,
  editorStore: EditorStore,
): Promise<void> => {
  // post creation handling
  if (
    element instanceof FileGenerationSpecification ||
    element instanceof ModelGenerationSpecification
  ) {
    const generationElement = element;
    const generationSpecifications =
      editorStore.graphManagerState.graph.ownGenerationSpecifications;
    let generationSpec: GenerationSpecification;
    if (generationSpecifications.length) {
      // TODO? handle case when more than one generation specification
      generationSpec = generationSpecifications[0] as GenerationSpecification;
    } else {
      generationSpec = new GenerationSpecification(
        DEFAULT_GENERATION_SPECIFICATION_NAME,
      );
      await flowResult(
        editorStore.graphEditorMode.addElement(
          generationSpec,
          guaranteeNonNullable(generationElement.package).path,
          false,
        ),
      );
    }
    generationSpecification_addGenerationElement(
      generationSpec,
      generationElement,
    );
  }

  const extraElementEditorPostCreateActions = editorStore.pluginManager
    .getApplicationPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_LegendStudioApplicationPlugin_Extension
        ).getExtraElementEditorPostCreateActions?.() ?? [],
    );
  for (const postCreateAction of extraElementEditorPostCreateActions) {
    postCreateAction(editorStore, element);
  }
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

    const mappings = this.editorStore.graphManagerState.graph.mappings;
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
  abstract getConnectionType(): string;
  abstract createConnection(store: Store): T;
}

export enum CONNECTION_TYPE {
  PURE_MODEL_CONNECTION = 'MODEL_CONNECTION',
  FLAT_DATA_CONNECTION = 'FLAT_DATA_CONNECTION',
  RELATIONAL_CONNECTION = 'RELATIONAL_CONNECTION',
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

    const classes = this.editorStore.graphManagerState.graph.classes;
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

  getConnectionType(): string {
    return CONNECTION_TYPE.PURE_MODEL_CONNECTION;
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

  getConnectionType(): string {
    return CONNECTION_TYPE.FLAT_DATA_CONNECTION;
  }

  createConnection(store: FlatData): FlatDataConnection {
    return new FlatDataConnection(
      PackageableElementExplicitReference.create(store),
    );
  }
}

export const DEFAULT_H2_SQL =
  '-- loads sample data for getting started. See https://github.com/pthom/northwind_psql for more info\n call loadNorthwindData()';
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

  getConnectionType(): string {
    return CONNECTION_TYPE.RELATIONAL_CONNECTION;
  }

  createConnection(store: Store): RelationalDatabaseConnection {
    let selectedStore: Database;
    if (store instanceof Database) {
      selectedStore = store;
    } else {
      const dbs = this.editorStore.graphManagerState.usableDatabases;
      selectedStore = dbs.length ? (dbs[0] as Database) : stub_Database();
    }
    const spec = new LocalH2DatasourceSpecification();
    spec.testDataSetupSqls = [DEFAULT_H2_SQL];
    return new RelationalDatabaseConnection(
      PackageableElementExplicitReference.create(selectedStore),
      DatabaseType.H2,
      spec,
      new DefaultH2AuthenticationStrategy(),
    );
  }
}

export class NewPackageableConnectionDriver extends NewElementDriver<PackageableConnection> {
  store: Store;
  newConnectionValueDriver: NewConnectionValueDriver<Connection> | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      store: observable,
      newConnectionValueDriver: observable,
      setStore: action,
      changeConnectionState: action,
      isValid: computed,
    });
    this.store = ModelStore.INSTANCE;
    this.newConnectionValueDriver =
      this.getNewConnectionValueDriverBasedOnStore(this.store);
  }

  geDriverConnectionType(): string {
    return this.newConnectionValueDriver?.getConnectionType() ?? '';
  }

  changeConnectionState(val: string): void {
    switch (val) {
      case CONNECTION_TYPE.PURE_MODEL_CONNECTION:
        this.newConnectionValueDriver = new NewPureModelConnectionDriver(
          this.editorStore,
        );
        return;
      case CONNECTION_TYPE.FLAT_DATA_CONNECTION:
        this.newConnectionValueDriver = new NewFlatDataConnectionDriver(
          this.editorStore,
        );
        return;
      case CONNECTION_TYPE.RELATIONAL_CONNECTION:
        this.newConnectionValueDriver =
          new NewRelationalDatabaseConnectionDriver(this.editorStore);
        return;
      default: {
        const extraNewConnectionDriverCreators = this.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
              ).getExtraNewConnectionDriverCreators?.() ?? [],
          );
        for (const creator of extraNewConnectionDriverCreators) {
          const driver = creator(this.editorStore, val);
          if (driver) {
            this.newConnectionValueDriver = driver;
            return;
          }
        }
        this.editorStore.applicationStore.notificationService.notifyError(
          new UnsupportedOperationError(
            `Can't create new connection driver for type: no compatible creator available from plugins`,
            val,
          ),
        );
      }
    }
  }

  getNewConnectionValueDriverBasedOnStore(
    store: Store,
  ): NewConnectionValueDriver<Connection> | undefined {
    if (store instanceof ModelStore) {
      return new NewPureModelConnectionDriver(this.editorStore);
    } else if (store instanceof FlatData) {
      return new NewFlatDataConnectionDriver(this.editorStore);
    } else if (store instanceof Database) {
      return new NewRelationalDatabaseConnectionDriver(this.editorStore);
    }
    const extraNewConnectionDriverCreators = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
          ).getExtraNewConnectionDriverCreators?.() ?? [],
      );
    for (const creator of extraNewConnectionDriverCreators) {
      const driver = creator(this.editorStore, store);
      if (driver) {
        return driver;
      }
    }
    this.editorStore.applicationStore.notificationService.notifyError(
      new UnsupportedOperationError(
        `Can't create new connection driver for store: no compatible creator available from plugins`,
        store,
      ),
    );
    return undefined;
  }

  setStore(store: Store): void {
    const newDriver = this.getNewConnectionValueDriverBasedOnStore(store);
    if (newDriver) {
      this.store = store;
      this.newConnectionValueDriver = newDriver;
    }
  }

  get isValid(): boolean {
    return this.newConnectionValueDriver?.isValid ?? true;
  }

  createElement(name: string): PackageableConnection {
    const connection = new PackageableConnection(name);
    if (this.newConnectionValueDriver) {
      packageableConnection_setConnectionValue(
        connection,
        this.newConnectionValueDriver.createConnection(this.store),
        this.editorStore.changeDetectionState.observerContext,
      ); // default to model store
    }
    return connection;
  }
}

export class NewServiceDriver extends NewElementDriver<Service> {
  mappingOption?: PackageableElementOption<Mapping> | undefined;
  runtimeOption: RuntimeOption;
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      mappingOption: observable,
      runtimeOption: observable,
      setMappingOption: action,
      setRuntimeOption: action,
      runtimeOptions: computed,
      isValid: computed,
      createElement: action,
    });
    this.mappingOption =
      editorStore.graphManagerState.usableMappings.map(buildElementOption)[0];
    this.runtimeOption = guaranteeNonNullable(this.runtimeOptions[0]);
  }

  setMappingOption(val: PackageableElementOption<Mapping> | undefined): void {
    this.mappingOption = val;
  }

  setRuntimeOption(val: RuntimeOption): void {
    this.runtimeOption = val;
  }

  get compatibleMappingRuntimes(): PackageableRuntime[] {
    return this.mappingOption?.value
      ? getMappingCompatibleRuntimes(
          this.mappingOption.value,
          this.editorStore.graphManagerState.usableRuntimes,
        )
      : [];
  }

  get runtimeOptions(): RuntimeOption[] {
    return [
      ...this.compatibleMappingRuntimes.map((runtime) =>
        buildElementOption(runtime),
      ),
      {
        label: CUSTOM_LABEL,
        value: undefined,
      },
    ];
  }

  get isValid(): boolean {
    return Boolean(this.mappingOption);
  }

  createElement(name: string): Service {
    const mappingOption = guaranteeNonNullable(this.mappingOption);
    const _mapping = mappingOption.value;
    const mapping = PackageableElementExplicitReference.create(_mapping);
    const service = new Service(name);
    let runtimeValue: Runtime;
    if (this.runtimeOption.value) {
      runtimeValue = new RuntimePointer(
        PackageableElementExplicitReference.create(this.runtimeOption.value),
      );
    } else {
      const engineRuntime = new EngineRuntime();
      runtime_addMapping(engineRuntime, mapping);
      decorateRuntimeWithNewMapping(engineRuntime, _mapping, this.editorStore);
      runtimeValue = engineRuntime;
    }
    service_setExecution(
      service,
      new PureSingleExecution(
        this.editorStore.graphManagerState.graphManager.createDefaultBasicRawLambda(),
        service,
        mapping,
        runtimeValue,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
    service_initNewService(service);
    return service;
  }
}

export class NewFileGenerationDriver extends NewElementDriver<FileGenerationSpecification> {
  typeOption?: GenerationTypeOption | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      typeOption: observable,
      setTypeOption: action,
    });

    this.typeOption = editorStore.graphState.graphGenerationState
      .globalFileGenerationState.fileGenerationConfigurationOptions.length
      ? editorStore.graphState.graphGenerationState.globalFileGenerationState
          .fileGenerationConfigurationOptions[0]
      : undefined;
  }

  setTypeOption(typeOption: GenerationTypeOption | undefined): void {
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

// NOTE: Main reason for driver is to disallow if generation specification already exists
export class NewGenerationSpecificationDriver extends NewElementDriver<GenerationSpecification> {
  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    // only one generation specification should exist
    return !this.editorStore.graphManagerState.graph.ownGenerationSpecifications
      .length;
  }

  createElement(name: string): GenerationSpecification {
    return new GenerationSpecification(name);
  }
}

export class NewDataElementDriver extends NewElementDriver<DataElement> {
  embeddedDataOption?: EmbeddedDataTypeOption | undefined;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      embeddedDataOption: observable,
      setEmbeddedDataOption: action,
    });

    this.embeddedDataOption = {
      label: EmbeddedDataType.EXTERNAL_FORMAT_DATA,
      value: EmbeddedDataType.EXTERNAL_FORMAT_DATA,
    };
  }

  setEmbeddedDataOption(typeOption: EmbeddedDataTypeOption | undefined): void {
    this.embeddedDataOption = typeOption;
  }

  createElement(name: string): DataElement {
    const embeddedDataOption = guaranteeNonNullable(this.embeddedDataOption);
    const dataElement = new DataElement(name);
    const data = createEmbeddedData(embeddedDataOption.value, this.editorStore);
    dataElement_setEmbeddedData(
      dataElement,
      data,
      this.editorStore.changeDetectionState.observerContext,
    );

    return dataElement;
  }

  get isValid(): boolean {
    return Boolean(this.embeddedDataOption);
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
    makeObservable(this, {
      showModal: observable,
      showType: observable,
      type: observable,
      _package: observable,
      name: observable,
      newElementDriver: observable,
      selectedPackage: computed,
      isValid: computed,
      setShowModal: action,
      setName: action,
      setShowType: action,
      setNewElementDriver: action,
      setPackage: action,
      setElementType: action,
      openModal: action,
      closeModal: action,
      createElement: action,
      save: flow,
    });

    this.editorStore = editorStore;
    this.type = PACKAGEABLE_ELEMENT_TYPE.PACKAGE;
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
        case PACKAGEABLE_ELEMENT_TYPE.DATA:
          driver = new NewDataElementDriver(this.editorStore);
          break;
        case PACKAGEABLE_ELEMENT_TYPE.SERVICE:
          driver = new NewServiceDriver(this.editorStore);
          break;
        default: {
          const extraNewElementDriverCreators = this.editorStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_LegendStudioApplicationPlugin_Extension
                ).getExtraNewElementDriverCreators?.() ?? [],
            );
          for (const creator of extraNewElementDriverCreators) {
            const _driver = creator(this.editorStore, newType);
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
      const [packagePath, elementName] = resolvePackageAndElementName(
        this.selectedPackage,
        this._package === this.editorStore.graphManagerState.graph.root,
        this.name,
      );
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
        if (
          this.editorStore.applicationStore.config.options
            .TEMPORARY__enableLocalConnectionBuilder &&
          this.type === PACKAGEABLE_ELEMENT_TYPE.TEMPORARY__LOCAL_CONNECTION
        ) {
          // NOTE: this is temporary until we have proper support for local connection
          // For now, we aim to fulfill the PoC for SnowflakeApp use case and will generate
          // everything: mapping, store, connection, runtime, etc.
          const store = new Database(`${this.name}_Database`);
          const mapping = new Mapping(`${this.name}_Mapping`);
          // connection
          const connection = new PackageableConnection(
            `${this.name}_LocalConnection`,
          );
          const _suffix = `${packagePath.replaceAll(
            ELEMENT_PATH_DELIMITER,
            '-',
          )}-${connection.name}`;
          const datasourceSpecification = new SnowflakeDatasourceSpecification(
            `legend-local-snowflake-accountName-${_suffix}`,
            `legend-local-snowflake-region-${_suffix}`,
            `legend-local-snowflake-warehouseName-${_suffix}`,
            `legend-local-snowflake-databaseName-${_suffix}`,
          );
          datasourceSpecification.cloudType = `legend-local-snowflake-cloudType-${_suffix}`;
          datasourceSpecification.role = `legend-local-snowflake-role-${_suffix}`;
          const connectionValue = new RelationalDatabaseConnection(
            PackageableElementExplicitReference.create(store),
            DatabaseType.Snowflake,
            datasourceSpecification,
            new SnowflakePublicAuthenticationStrategy(
              `legend-local-snowflake-privateKeyVaultReference-${_suffix}`,
              `legend-local-snowflake-passphraseVaultReference-${_suffix}`,
              `legend-local-snowflake-publicuserName-${_suffix}`,
            ),
          );
          connectionValue.localMode = true;
          connection.connectionValue = connectionValue;
          // runtime
          const runtime = new PackageableRuntime(`${this.name}_Runtime`);
          const engineRuntime = new EngineRuntime();
          engineRuntime.mappings = [
            PackageableElementExplicitReference.create(mapping),
          ];
          const storeConnections = new StoreConnections(
            PackageableElementExplicitReference.create(store),
          );
          storeConnections.storeConnections = [
            new IdentifiedConnection(
              generateIdentifiedConnectionId(engineRuntime),
              new ConnectionPointer(
                PackageableElementExplicitReference.create(connection),
              ),
            ),
          ];
          engineRuntime.connections = [storeConnections];
          runtime.runtimeValue = engineRuntime;
          // add the elements
          yield flowResult(
            this.editorStore.graphEditorMode.addElement(
              store,
              packagePath,
              false,
            ),
          );
          yield flowResult(
            this.editorStore.graphEditorMode.addElement(
              connection,
              packagePath,
              false,
            ),
          );
          yield flowResult(
            this.editorStore.graphEditorMode.addElement(
              mapping,
              packagePath,
              false,
            ),
          );
          yield flowResult(
            this.editorStore.graphEditorMode.addElement(
              runtime,
              packagePath,
              false,
            ),
          );
        } else {
          const element = this.createElement(elementName);
          yield flowResult(
            this.editorStore.graphEditorMode.addElement(
              element,
              packagePath,
              true,
            ),
          );

          // post creation handling
          yield handlePostCreateAction(element, this.editorStore);
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
      case PACKAGEABLE_ELEMENT_TYPE.MEASURE:
        element = new Measure(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.PROFILE:
        element = new Profile(name);
        break;
      // default for function -> return type: String, return Multiplicity 1
      case PACKAGEABLE_ELEMENT_TYPE.FUNCTION: {
        const fn = new ConcreteFunctionDefinition(
          name,
          GenericTypeExplicitReference.create(new GenericType(PrimitiveType.STRING)),
          Multiplicity.ONE,
        );
        // default to empty string
        fn.expressionSequence =
          this.editorStore.graphManagerState.graphManager.createDefaultBasicRawLambda()
            .body as object[];
        element = fn;
        break;
      }
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
        element =
          this.getNewElementDriver(NewServiceDriver).createElement(name);
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
      case PACKAGEABLE_ELEMENT_TYPE.DATA:
        element =
          this.getNewElementDriver(NewDataElementDriver).createElement(name);
        break;
      case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
        element = new GenerationSpecification(name);
        break;
      default: {
        const extraNewElementFromStateCreators = this.editorStore.pluginManager
          .getApplicationPlugins()
          .flatMap(
            (plugin) =>
              (
                plugin as DSL_LegendStudioApplicationPlugin_Extension
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
