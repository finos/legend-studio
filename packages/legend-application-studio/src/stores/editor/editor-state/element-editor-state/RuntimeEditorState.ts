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

import { computed, action, observable, makeObservable, flow } from 'mobx';
import type { EditorStore } from '../../EditorStore.js';
import type { IngestDeploymentServerConfig } from '@finos/legend-server-lakehouse';
import {
  guaranteeType,
  uuid,
  isNonNullable,
  UnsupportedOperationError,
  uniq,
  addUniqueEntry,
  assertErrorThrown,
  filterByType,
  type GeneratorFn,
  removeSuffix,
} from '@finos/legend-shared';
import { ElementEditorState } from './ElementEditorState.js';
import type { RuntimeExplorerTreeNodeData } from '../../utils/TreeUtils.js';
import type { TreeData } from '@finos/legend-art';
import { ConnectionEditorState } from './connection/ConnectionEditorState.js';
import { getMappingElementSource } from './mapping/MappingEditorState.js';
import {
  type PackageableElement,
  type Mapping,
  type Connection,
  type PackageableConnection,
  type SetImplementation,
  type PackageableElementReference,
  getAllClassMappings,
  PackageableRuntime,
  Runtime,
  EngineRuntime,
  IdentifiedConnection,
  RuntimePointer,
  ConnectionPointer,
  Store,
  ModelStore,
  PureModelConnection,
  JsonModelConnection,
  XmlModelConnection,
  Class,
  RootFlatDataRecordType,
  FlatData,
  FlatDataConnection,
  PackageableElementExplicitReference,
  Database,
  TableAlias,
  DatabaseType,
  RelationalDatabaseConnection,
  StaticDatasourceSpecification,
  DefaultH2AuthenticationStrategy,
  ModelChainConnection,
  isStubbed_StoreConnections,
  getAllIdentifiedConnections,
  generateIdentifiedConnectionId,
  LakehouseRuntime,
  ConcreteFunctionDefinition,
} from '@finos/legend-graph';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import { packageableElementReference_setValue } from '../../../graph-modifier/DomainGraphModifierHelper.js';
import {
  runtime_addIdentifiedConnection,
  runtime_addMapping,
  runtime_addUniqueStoreConnectionsForStore,
  runtime_deleteIdentifiedConnection,
  runtime_deleteMapping,
} from '../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { CUSTOM_LABEL } from '../../NewElementState.js';
import { lakehouseRuntime_setConnection } from '../../../graph-modifier/DSL_LakehouseRuntime_GraphModifierHelper.js';

export const getClassMappingStore = (
  setImplementation: SetImplementation,
  editorStore: EditorStore,
): Store | undefined => {
  const sourceElement = getMappingElementSource(
    setImplementation,
    editorStore.pluginManager.getApplicationPlugins(),
  );
  if (sourceElement instanceof Class) {
    return ModelStore.INSTANCE;
  } else if (sourceElement instanceof RootFlatDataRecordType) {
    return sourceElement._OWNER._OWNER;
  } else if (sourceElement instanceof TableAlias) {
    return sourceElement.relation.ownerReference.value;
  } else if (sourceElement instanceof ConcreteFunctionDefinition) {
    return undefined;
  }
  if (sourceElement) {
    const extraInstanceSetImplementationStoreExtractors =
      editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
            ).getExtraInstanceSetImplementationStoreExtractors?.() ?? [],
        );
    for (const extractor of extraInstanceSetImplementationStoreExtractors) {
      const instanceSetImplementationStore = extractor(sourceElement);
      if (instanceSetImplementationStore) {
        return instanceSetImplementationStore;
      }
    }
    throw new UnsupportedOperationError(
      `Can't extract store for class mapping: no compatible extractor available from plugins`,
      setImplementation,
    );
  }
  return undefined;
};

const getStoresFromMappings = (
  mappings: Mapping[],
  editorStore: EditorStore,
): Store[] =>
  uniq(
    mappings.flatMap((mapping) =>
      getAllClassMappings(mapping)
        .map((setImplementation) =>
          getClassMappingStore(setImplementation, editorStore),
        )
        .filter(isNonNullable),
    ),
  );

/**
 * Since model connection are pretty tedious to add, we automatically create new connections for mapped classes
 * as we add/change mapping for the runtime
 *
 * NOTE: as of now, to be safe and simple, we will not remove the connections as we remove the mapping from the runtime
 */
export const decorateRuntimeWithNewMapping = (
  runtime: Runtime,
  mapping: Mapping,
  editorStore: EditorStore,
): void => {
  const runtimeValue =
    runtime instanceof RuntimePointer
      ? runtime.packageableRuntime.value.runtimeValue
      : guaranteeType(runtime, EngineRuntime);
  getStoresFromMappings([mapping], editorStore).forEach((store) =>
    runtime_addUniqueStoreConnectionsForStore(
      runtimeValue,
      store,
      editorStore.changeDetectionState.observerContext,
    ),
  );
  const sourceClasses: Class[] = [];
  mapping.classMappings.forEach((classMapping) => {
    const mappingSource = getMappingElementSource(
      classMapping,
      editorStore.pluginManager.getApplicationPlugins(),
    );
    if (mappingSource instanceof Class) {
      addUniqueEntry(sourceClasses, mappingSource);
    }
  });
  let classesSpecifiedInModelConnections: Class[] = [];
  runtimeValue.connections.forEach((storeConnections) => {
    if (storeConnections.store.value instanceof ModelStore) {
      classesSpecifiedInModelConnections = storeConnections.storeConnections
        .filter(
          (identifiedConnection) =>
            identifiedConnection.connection instanceof JsonModelConnection ||
            identifiedConnection.connection instanceof XmlModelConnection,
        )
        .map(
          (identifiedConnection) =>
            (
              identifiedConnection.connection as
                | JsonModelConnection
                | XmlModelConnection
            ).class.value,
        );
    }
  });
  sourceClasses
    .filter((_class) => !classesSpecifiedInModelConnections.includes(_class))
    .forEach((_class) =>
      runtime_addIdentifiedConnection(
        runtimeValue,
        new IdentifiedConnection(
          generateIdentifiedConnectionId(runtimeValue),
          new JsonModelConnection(
            PackageableElementExplicitReference.create(ModelStore.INSTANCE),
            PackageableElementExplicitReference.create(_class),
          ),
        ),
        editorStore.changeDetectionState.observerContext,
      ),
    );
};

export const isConnectionForStore = (
  connection: Connection,
  store: Store,
): boolean => {
  const connectionValue =
    connection instanceof ConnectionPointer
      ? connection.packageableConnection.value.connectionValue
      : connection;
  if (connectionValue instanceof PureModelConnection) {
    return store instanceof ModelStore;
  }
  return connectionValue.store?.value === store;
};

export const isConnectionForModelStoreWithClass = (
  connection: Connection,
  _class: Class,
): boolean => {
  const connectionValue =
    connection instanceof ConnectionPointer
      ? connection.packageableConnection.value.connectionValue
      : connection;
  if (
    connectionValue instanceof JsonModelConnection ||
    connectionValue instanceof XmlModelConnection
  ) {
    return connectionValue.class.value === _class;
  } else if (connectionValue instanceof ModelChainConnection) {
    return connectionValue.mappings.some((mapping) =>
      mapping.value.classMappings.some(
        (classMapping) => classMapping.class.value === _class,
      ),
    );
  }
  return false;
};

export const getConnectionsForModelStoreWithClass = (
  connections: Connection[],
  _class: Class,
): Connection[] =>
  uniq(
    connections.filter((connection) =>
      isConnectionForModelStoreWithClass(connection, _class),
    ),
  );

/**
 * Derive the stores from the runtime's mappings and then partition the list of runtime's connections based on the store
 */
export const getRuntimeExplorerTreeData = (
  runtime: Runtime,
  editorStore: EditorStore,
): TreeData<RuntimeExplorerTreeNodeData> => {
  const runtimeValue =
    runtime instanceof RuntimePointer
      ? runtime.packageableRuntime.value.runtimeValue
      : guaranteeType(runtime, EngineRuntime);
  const rootIds: string[] = [];
  const nodes = new Map<string, RuntimeExplorerTreeNodeData>();
  const allSourceClassesFromMappings = uniq(
    runtimeValue.mappings.flatMap((mapping) =>
      getAllClassMappings(mapping.value)
        .map((setImplementation) =>
          getMappingElementSource(
            setImplementation,
            editorStore.pluginManager.getApplicationPlugins(),
          ),
        )
        .filter(filterByType(Class)),
    ),
  );
  // runtime (root)
  const runtimeNode = {
    data: runtimeValue,
    id: 'runtime',
    label:
      runtime instanceof RuntimePointer
        ? runtime.packageableRuntime.value.name
        : CUSTOM_LABEL,
    isOpen: true,
    childrenIds: [] as string[],
  };
  nodes.set(runtimeNode.id, runtimeNode);
  addUniqueEntry(rootIds, runtimeNode.id);
  // stores (1st level)
  runtimeValue.connections
    .map((storeConnections) => storeConnections.store.value)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((store) => {
      const childrenIds: string[] = [];
      if (store instanceof ModelStore) {
        // expand ModelStore to show source classes
        const classes = uniq(
          getAllIdentifiedConnections(runtimeValue)
            .filter(
              (identifiedConnection) =>
                identifiedConnection.connection.store?.value instanceof
                ModelStore,
            )
            .map((identifiedConnection) => {
              const connectionValue =
                identifiedConnection.connection instanceof ConnectionPointer
                  ? identifiedConnection.connection.packageableConnection.value
                      .connectionValue
                  : identifiedConnection.connection;
              if (
                connectionValue instanceof JsonModelConnection ||
                connectionValue instanceof XmlModelConnection
              ) {
                return connectionValue.class.value;
              }
              return undefined;
            })
            .concat(allSourceClassesFromMappings),
        ); // make sure we add classes (from mappings) that we expect to have connections for
        // classes (2nd level) - only for `ModelStore`
        classes.filter(isNonNullable).forEach((_class) => {
          const classNode = {
            data: _class,
            id: _class.path,
            label: _class.name,
          };
          nodes.set(classNode.id, classNode);
          addUniqueEntry(childrenIds, classNode.id);
        });
      }
      const storeNode = {
        data: store,
        id: store.path,
        label: store.name,
        isOpen: true,
        childrenIds,
      };
      addUniqueEntry(runtimeNode.childrenIds, storeNode.id);
      nodes.set(storeNode.id, storeNode);
    });
  return { rootIds, nodes };
};

export abstract class RuntimeEditorTabState {
  readonly uuid = uuid();
  editorStore: EditorStore;
  runtimeEditorState: EngineRuntimeEditorState;

  constructor(
    editorStore: EditorStore,
    runtimeEditorState: EngineRuntimeEditorState,
  ) {
    this.editorStore = editorStore;
    this.runtimeEditorState = runtimeEditorState;
  }
}

export class IdentifiedConnectionEditorState {
  editorStore: EditorStore;
  idenfitiedConnection: IdentifiedConnection;
  connectionEditorState: ConnectionEditorState;

  constructor(
    editorStore: EditorStore,
    idenfitiedConnection: IdentifiedConnection,
  ) {
    this.editorStore = editorStore;
    this.idenfitiedConnection = idenfitiedConnection;
    this.connectionEditorState = new ConnectionEditorState(
      this.editorStore,
      idenfitiedConnection.connection,
    );
  }
}

export abstract class IdentifiedConnectionsEditorTabState extends RuntimeEditorTabState {
  identifiedConnectionEditorState?: IdentifiedConnectionEditorState | undefined;

  constructor(
    editorStore: EditorStore,
    runtimeEditorState: EngineRuntimeEditorState,
  ) {
    super(editorStore, runtimeEditorState);

    makeObservable(this, {
      identifiedConnectionEditorState: observable,
      openIdentifiedConnection: action,
      addIdentifiedConnection: action,
    });
  }

  openIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    this.identifiedConnectionEditorState = new IdentifiedConnectionEditorState(
      this.editorStore,
      identifiedConnection,
    );
  }

  addIdentifiedConnection(packageableConnection?: PackageableConnection): void {
    let newConnection: Connection;
    if (
      packageableConnection &&
      this.packageableConnections.includes(packageableConnection)
    ) {
      newConnection = new ConnectionPointer(
        PackageableElementExplicitReference.create(packageableConnection),
      );
    } else if (this.packageableConnections.length) {
      newConnection = new ConnectionPointer(
        PackageableElementExplicitReference.create(
          this.packageableConnections[0] as PackageableConnection,
        ),
      );
    } else {
      try {
        newConnection = this.createDefaultConnection();
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notificationService.notifyWarning(
          error.message,
        );
        return;
      }
    }
    const newIdentifiedConnection = new IdentifiedConnection(
      generateIdentifiedConnectionId(this.runtimeEditorState.runtimeValue),
      newConnection,
    );
    runtime_addIdentifiedConnection(
      this.runtimeEditorState.runtimeValue,
      newIdentifiedConnection,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.openIdentifiedConnection(newIdentifiedConnection);
  }

  getConnectionEditorState(): ConnectionEditorState | undefined {
    return this.identifiedConnectionEditorState?.connectionEditorState
      .connection instanceof ConnectionPointer
      ? new ConnectionEditorState(
          this.editorStore,
          this.identifiedConnectionEditorState.connectionEditorState.connection.packageableConnection.value.connectionValue,
        )
      : this.identifiedConnectionEditorState?.connectionEditorState;
  }

  abstract get identifiedConnections(): IdentifiedConnection[];
  abstract get packageableConnections(): PackageableConnection[];
  abstract createDefaultConnection(): Connection;
  abstract deleteIdentifiedConnection(
    identifiedConnection: IdentifiedConnection,
  ): void;
}

export class IdentifiedConnectionsPerStoreEditorTabState extends IdentifiedConnectionsEditorTabState {
  store: Store;

  constructor(
    editorStore: EditorStore,
    runtimeEditorState: EngineRuntimeEditorState,
    store: Store,
  ) {
    super(editorStore, runtimeEditorState);

    makeObservable(this, {
      store: observable,
      identifiedConnections: computed,
      packageableConnections: computed,
      deleteIdentifiedConnection: action,
    });

    this.store = store;
    if (this.identifiedConnections.length) {
      this.openIdentifiedConnection(
        this.identifiedConnections[0] as IdentifiedConnection,
      );
    }
  }

  get identifiedConnections(): IdentifiedConnection[] {
    return (
      this.runtimeEditorState.runtimeValue.connections.find(
        (storeConnections) => storeConnections.store.value === this.store,
      )?.storeConnections ?? []
    );
  }

  get packageableConnections(): PackageableConnection[] {
    return this.editorStore.graphManagerState.graph.ownConnections.filter(
      (connection) =>
        isConnectionForStore(connection.connectionValue, this.store),
    );
  }

  createDefaultConnection(): Connection {
    if (this.store instanceof FlatData) {
      return new FlatDataConnection(
        PackageableElementExplicitReference.create(this.store),
      );
    } else if (this.store instanceof Database) {
      return new RelationalDatabaseConnection(
        PackageableElementExplicitReference.create(this.store),
        DatabaseType.H2,
        new StaticDatasourceSpecification('host', 80, 'db'),
        new DefaultH2AuthenticationStrategy(),
      );
    }
    const extraDefaultConnectionValueBuilders = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
          ).getExtraDefaultConnectionValueBuilders?.() ?? [],
      );

    for (const builder of extraDefaultConnectionValueBuilders) {
      const defaultConnection = builder(this.store);
      if (defaultConnection) {
        return defaultConnection;
      }
    }

    throw new UnsupportedOperationError(
      `Can't build default connection for the specified store: no compatible builder available from plugins`,
      this.store,
    );
  }

  deleteIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    runtime_deleteIdentifiedConnection(
      this.runtimeEditorState.runtimeValue,
      identifiedConnection,
    );
    if (
      identifiedConnection.connection ===
      this.identifiedConnectionEditorState?.connectionEditorState.connection
    ) {
      this.identifiedConnectionEditorState = undefined;
    }
    this.runtimeEditorState.reprocessRuntimeExplorerTree();
    if (!this.identifiedConnections.length) {
      const stores = getStoresFromMappings(
        this.runtimeEditorState.runtimeValue.mappings.map(
          (mapping) => mapping.value,
        ),
        this.editorStore,
      );
      if (!stores.includes(this.store)) {
        this.runtimeEditorState.openTabFor(
          this.runtimeEditorState.runtimeValue,
        );
      }
    }
  }
}

export class IdentifiedConnectionsPerClassEditorTabState extends IdentifiedConnectionsEditorTabState {
  class: Class;

  constructor(
    editorStore: EditorStore,
    runtimeEditorState: EngineRuntimeEditorState,
    _class: Class,
  ) {
    super(editorStore, runtimeEditorState);

    makeObservable(this, {
      class: observable,
      identifiedConnections: computed,
      packageableConnections: computed,
      deleteIdentifiedConnection: action,
    });

    this.class = _class;
    if (this.identifiedConnections.length) {
      this.openIdentifiedConnection(
        this.identifiedConnections[0] as IdentifiedConnection,
      );
    }
  }

  get identifiedConnections(): IdentifiedConnection[] {
    return getAllIdentifiedConnections(
      this.runtimeEditorState.runtimeValue,
    ).filter((identifiedConnection) =>
      isConnectionForModelStoreWithClass(
        identifiedConnection.connection,
        this.class,
      ),
    );
  }

  get packageableConnections(): PackageableConnection[] {
    return this.editorStore.graphManagerState.graph.ownConnections.filter(
      (connection) =>
        isConnectionForModelStoreWithClass(
          connection.connectionValue,
          this.class,
        ),
    );
  }

  createDefaultConnection(): Connection {
    return new JsonModelConnection(
      PackageableElementExplicitReference.create(ModelStore.INSTANCE),
      PackageableElementExplicitReference.create(this.class),
    );
  }

  deleteIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    runtime_deleteIdentifiedConnection(
      this.runtimeEditorState.runtimeValue,
      identifiedConnection,
    );
    if (
      identifiedConnection.connection ===
      this.identifiedConnectionEditorState?.connectionEditorState.connection
    ) {
      this.identifiedConnectionEditorState = undefined;
    }
    this.runtimeEditorState.reprocessRuntimeExplorerTree();
    if (!this.identifiedConnections.length) {
      const allSourceClassesFromMappings = uniq(
        this.runtimeEditorState.runtimeValue.mappings.flatMap((mapping) =>
          getAllClassMappings(mapping.value)
            .map((setImplementation) =>
              getMappingElementSource(
                setImplementation,
                this.editorStore.pluginManager.getApplicationPlugins(),
              ),
            )
            .filter(filterByType(Class)),
        ),
      );
      if (!allSourceClassesFromMappings.includes(this.class)) {
        this.runtimeEditorState.openTabFor(
          this.runtimeEditorState.runtimeValue,
        );
      }
    }
  }
}

export class RuntimeEditorRuntimeTabState extends RuntimeEditorTabState {}

export class EngineRuntimeEditorState {
  editorStore: EditorStore;
  state: RuntimeEditorState;
  runtimeValue: EngineRuntime;
  explorerTreeData: TreeData<RuntimeExplorerTreeNodeData>;
  currentTabState?: RuntimeEditorTabState | undefined;

  constructor(state: RuntimeEditorState, value: EngineRuntime) {
    this.editorStore = state.editorStore;
    this.state = state;
    this.runtimeValue = value;
    makeObservable(this, {
      explorerTreeData: observable.ref,
      currentTabState: observable,
      setExplorerTreeData: action,
      addMapping: action,
      deleteMapping: action,
      changeMapping: action,
      addIdentifiedConnection: action,
      openTabFor: action,
      decorateRuntimeConnections: action,
      cleanUpDecoration: action,
      reprocessRuntimeExplorerTree: action,
      reprocessCurrentTabState: action,
    });
    this.explorerTreeData = getRuntimeExplorerTreeData(
      this.runtimeValue,
      this.state.editorStore,
    );
    this.openTabFor(this.runtimeValue); // open runtime tab on init
  }

  setExplorerTreeData(treeData: TreeData<RuntimeExplorerTreeNodeData>): void {
    this.explorerTreeData = treeData;
  }

  addMapping(mapping: Mapping): void {
    if (!this.runtimeValue.mappings.map((m) => m.value).includes(mapping)) {
      runtime_addMapping(
        this.runtimeValue,
        PackageableElementExplicitReference.create(mapping),
      );
      decorateRuntimeWithNewMapping(
        this.runtimeValue,
        mapping,
        this.editorStore,
      );
      this.reprocessRuntimeExplorerTree();
    }
  }

  deleteMapping(mappingRef: PackageableElementReference<Mapping>): void {
    runtime_deleteMapping(this.runtimeValue, mappingRef);
    this.reprocessRuntimeExplorerTree();
  }

  changeMapping(
    mappingRef: PackageableElementReference<Mapping>,
    newVal: Mapping,
  ): void {
    packageableElementReference_setValue(mappingRef, newVal);
    decorateRuntimeWithNewMapping(this.runtimeValue, newVal, this.editorStore);
    this.reprocessRuntimeExplorerTree();
  }

  addIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    runtime_addIdentifiedConnection(
      this.runtimeValue,
      identifiedConnection,
      this.editorStore.changeDetectionState.observerContext,
    );
    const connectionValue =
      identifiedConnection.connection instanceof ConnectionPointer
        ? identifiedConnection.connection.packageableConnection.value
            .connectionValue
        : identifiedConnection.connection;
    const el =
      connectionValue instanceof JsonModelConnection ||
      connectionValue instanceof XmlModelConnection
        ? connectionValue.class.value
        : connectionValue.store?.value;

    if (el) {
      this.openTabFor(el);
    }
    if (this.currentTabState instanceof IdentifiedConnectionsEditorTabState) {
      this.currentTabState.openIdentifiedConnection(identifiedConnection);
    }
    this.reprocessRuntimeExplorerTree();
  }

  openTabFor(tabElement: Runtime | Store | Class): void {
    if (tabElement instanceof Runtime) {
      if (!(this.currentTabState instanceof RuntimeEditorRuntimeTabState)) {
        this.currentTabState = new RuntimeEditorRuntimeTabState(
          this.editorStore,
          this,
        );
      }
    } else if (tabElement instanceof ModelStore) {
      return;
    } else if (tabElement instanceof Class) {
      if (
        !(
          this.currentTabState instanceof
          IdentifiedConnectionsPerClassEditorTabState
        ) ||
        this.currentTabState.class !== tabElement
      ) {
        this.currentTabState = new IdentifiedConnectionsPerClassEditorTabState(
          this.editorStore,
          this,
          tabElement,
        );
      }
    } else if (tabElement instanceof Store) {
      if (
        !(
          this.currentTabState instanceof
          IdentifiedConnectionsPerStoreEditorTabState
        ) ||
        this.currentTabState.store !== tabElement
      ) {
        this.currentTabState = new IdentifiedConnectionsPerStoreEditorTabState(
          this.editorStore,
          this,
          tabElement,
        );
      }
    }
  }

  decorateRuntimeConnections(): void {
    getStoresFromMappings(
      this.runtimeValue.mappings.map((mapping) => mapping.value),
      this.editorStore,
    ).forEach((store) =>
      runtime_addUniqueStoreConnectionsForStore(
        this.runtimeValue,
        store,
        this.editorStore.changeDetectionState.observerContext,
      ),
    );
  }

  cleanUpDecoration(): void {
    this.runtimeValue.connections = this.runtimeValue.connections.filter(
      (storeConnections) => !isStubbed_StoreConnections(storeConnections),
    );
  }

  onExplorerTreeNodeExpand = (node: RuntimeExplorerTreeNodeData): void => {
    if (node.childrenIds?.length) {
      node.isOpen = !node.isOpen;
    }
    this.setExplorerTreeData({ ...this.explorerTreeData });
  };

  onExplorerTreeNodeSelect = (node: RuntimeExplorerTreeNodeData): void => {
    this.openTabFor(node.data);
    this.setExplorerTreeData({ ...this.explorerTreeData });
  };

  isTreeNodeSelected = (node: RuntimeExplorerTreeNodeData): boolean => {
    if (node.data instanceof Runtime) {
      return this.currentTabState instanceof RuntimeEditorRuntimeTabState;
    } else if (node.data instanceof Class) {
      return (
        this.currentTabState instanceof
          IdentifiedConnectionsPerClassEditorTabState &&
        this.currentTabState.class === node.data
      );
    } else if (
      node.data instanceof Store &&
      !(node.data instanceof ModelStore)
    ) {
      return (
        this.currentTabState instanceof
          IdentifiedConnectionsPerStoreEditorTabState &&
        this.currentTabState.store === node.data
      );
    }
    return false;
  };

  getExplorerTreeChildNodes = (
    node: RuntimeExplorerTreeNodeData,
  ): RuntimeExplorerTreeNodeData[] => {
    if (!node.childrenIds) {
      return [];
    }
    return node.childrenIds
      .map((id) => this.explorerTreeData.nodes.get(id))
      .filter(isNonNullable);
  };

  reprocessRuntimeExplorerTree(): void {
    const openedTreeNodeIds = Array.from(this.explorerTreeData.nodes.values())
      .filter((node) => node.isOpen)
      .map((node) => node.id);
    const treeData = getRuntimeExplorerTreeData(
      this.runtimeValue,
      this.editorStore,
    );
    openedTreeNodeIds.forEach((nodeId) => {
      const node = treeData.nodes.get(nodeId);
      if (node && !node.isOpen) {
        node.isOpen = true;
      }
    });
    this.setExplorerTreeData(treeData);
  }

  /**
   * If the currently opened connection tab is a connection pointer whose store/source class has been changed, we will
   * remove this tab and switch to default runtime tab
   */
  reprocessCurrentTabState(): void {
    if (this.currentTabState instanceof IdentifiedConnectionsEditorTabState) {
      const connection =
        this.currentTabState.identifiedConnectionEditorState
          ?.connectionEditorState.connection;
      const connectionValue =
        connection instanceof ConnectionPointer
          ? connection.packageableConnection.value.connectionValue
          : connection;
      if (
        this.currentTabState instanceof
        IdentifiedConnectionsPerClassEditorTabState
      ) {
        if (
          ((connectionValue instanceof JsonModelConnection ||
            connectionValue instanceof XmlModelConnection) &&
            connectionValue.class.value !== this.currentTabState.class) ||
          (this.currentTabState instanceof
            IdentifiedConnectionsPerStoreEditorTabState &&
            this.currentTabState.store !== connectionValue?.store?.value)
        ) {
          this.openTabFor(this.runtimeValue);
        }
      }
    }
  }
}

export enum LakehouseRuntimeType {
  ENVIRONMENT = 'ENVIRONMENT',
  CONNECTION = 'CONNECTION',
}

export class LakehouseRuntimeEditorState extends EngineRuntimeEditorState {
  declare runtimeValue: LakehouseRuntime;
  availableEnvs: IngestDeploymentServerConfig[] | undefined;
  lakehouseRuntimeType = LakehouseRuntimeType.ENVIRONMENT;

  constructor(state: RuntimeEditorState, value: LakehouseRuntime) {
    super(state, value);
    makeObservable(this, {
      availableEnvs: observable,
      fetchLakehouseSummaries: flow,
      setEnvSummaries: action,
      lakehouseRuntimeType: observable,
      setLakehouseRuntimeType: action,
      envOptions: computed,
    });
    this.runtimeValue = value;
    // fix when metamodel is more clear on this
    if (value.connectionPointer) {
      this.lakehouseRuntimeType = LakehouseRuntimeType.CONNECTION;
    }
  }

  setLakehouseRuntimeType(val: LakehouseRuntimeType): void {
    if (val !== this.lakehouseRuntimeType) {
      this.lakehouseRuntimeType = val;
      if (val === LakehouseRuntimeType.CONNECTION) {
        this.runtimeValue.environment = undefined;
        this.runtimeValue.warehouse = undefined;
      } else {
        this.setConnection(undefined);
      }
    }
  }

  setConnection(val: PackageableConnection | undefined): void {
    lakehouseRuntime_setConnection(this.runtimeValue, val);
  }

  get envOptions(): { label: string; value: string }[] {
    return this.availableEnvs?.map((e) => this.convertEnvToOption(e)) ?? [];
  }

  convertEnvToOption(val: IngestDeploymentServerConfig): {
    label: string;
    value: string;
  } {
    const discoveryUrlSuffix =
      this.editorStore.applicationStore.config.options.ingestDeploymentConfig
        ?.discoveryUrlSuffix;
    const host = new URL(val.ingestServerUrl).host;
    const value = discoveryUrlSuffix
      ? removeSuffix(host, discoveryUrlSuffix)
      : host;
    return {
      label: value,
      value,
    };
  }

  setEnvSummaries(val: IngestDeploymentServerConfig[] | undefined): void {
    this.availableEnvs = val;
  }

  *fetchLakehouseSummaries(token?: string | undefined): GeneratorFn<void> {
    try {
      const ingestionManager = this.editorStore.ingestionManager;
      this.setEnvSummaries(undefined);
      if (ingestionManager) {
        const res = (yield ingestionManager.fetchLakehouseEnvironmentSummaries(
          token,
        )) as unknown as IngestDeploymentServerConfig[] | undefined;
        this.setEnvSummaries(res);
        if (
          this.lakehouseRuntimeType === LakehouseRuntimeType.ENVIRONMENT &&
          !this.runtimeValue.environment &&
          this.envOptions.length
        ) {
          this.runtimeValue.environment = this.envOptions[0]?.value;
        }
      }
    } catch (error) {
      assertErrorThrown(error);
    }
  }
}

export class RuntimeEditorState {
  /**
   * NOTE: used to force component remount on state change
   */
  readonly uuid = uuid();
  editorStore: EditorStore;
  runtime: Runtime;
  runtimeValueEditorState: EngineRuntimeEditorState;
  isEmbeddedRuntime: boolean;

  constructor(
    editorStore: EditorStore,
    runtime: Runtime,
    isEmbeddedRuntime: boolean,
  ) {
    makeObservable(this, {
      runtimeValueEditorState: observable,
    });

    this.editorStore = editorStore;
    this.runtime = runtime;
    this.isEmbeddedRuntime = isEmbeddedRuntime;
    const runtimeValue =
      runtime instanceof RuntimePointer
        ? runtime.packageableRuntime.value.runtimeValue
        : guaranteeType(runtime, EngineRuntime);
    this.runtimeValueEditorState =
      runtimeValue instanceof LakehouseRuntime
        ? new LakehouseRuntimeEditorState(this, runtimeValue)
        : new EngineRuntimeEditorState(this, runtimeValue);
  }
}

export class PackageableRuntimeEditorState extends ElementEditorState {
  runtimeEditorState: RuntimeEditorState;

  constructor(
    editorStore: EditorStore,
    packageableRuntime: PackageableElement,
  ) {
    super(editorStore, packageableRuntime);

    makeObservable(this, {
      runtime: computed,
      reprocess: action,
    });

    this.runtimeEditorState = new RuntimeEditorState(
      editorStore,
      this.runtime.runtimeValue,
      false,
    );
  }

  get runtime(): PackageableRuntime {
    return guaranteeType(
      this.element,
      PackageableRuntime,
      'Element inside runtime editor state must be a packageable runtime',
    );
  }

  reprocess(
    newElement: PackageableElement,
    editorStore: EditorStore,
  ): ElementEditorState {
    const editorState = new PackageableRuntimeEditorState(
      editorStore,
      newElement,
    );
    return editorState;
  }
}
