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

import { computed, action, observable } from 'mobx';
import { EditorStore } from 'Stores/EditorStore';
import { guaranteeType, uuid, isNonNullable, UnsupportedOperationError, uniq, addUniqueEntry } from 'Utilities/GeneralUtil';
import { ElementEditorState } from './ElementEditorState';
import { TreeData, RuntimeExplorerTreeNodeData } from 'Utilities/TreeUtil';
import { ConnectionEditorState } from './ConnectionEditorState';
import { CompilationError } from 'EXEC/ExecutionServerError';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { Runtime, EngineRuntime, IdentifiedConnection, RuntimePointer } from 'MM/model/packageableElements/runtime/Runtime';
import { Mapping, getMappingElementSource } from 'MM/model/packageableElements/mapping/Mapping';
import { Connection, ConnectionPointer } from 'MM/model/packageableElements/connection/Connection';
import { Store } from 'MM/model/packageableElements/store/Store';
import { ModelStore } from 'MM/model/packageableElements/store/modelToModel/model/ModelStore';
import { PureModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/PureModelConnection';
import { JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { PackageableConnection } from 'MM/model/packageableElements/connection/PackageableConnection';
import { SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { PureModel } from 'MM/PureModel';
import { PackageableElementExplicitReference, PackageableElementReference } from 'MM/model/packageableElements/PackageableElementReference';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
const getClassMappingStore = (setImplementation: SetImplementation, graph: PureModel): Store | undefined => {
  const sourceElement = getMappingElementSource(setImplementation);
  if (sourceElement instanceof Class) {
    return graph.modelStore;
  }
  return undefined;
};

const getStoresFromMappings = (mappings: Mapping[], graph: PureModel): Store[] => uniq(mappings.flatMap(mapping => mapping
  .getClassMappings()
  .map(setImplementation => getClassMappingStore(setImplementation, graph))
  .filter(isNonNullable)
));

/**
 * Since model connection are pretty tedious to add, we automatically create new connections for mapped classes
 * as we add/change mapping for the runtime
 *
 * NOTE: as of now, to be safe and simple, we will not remove the connections as we remove the mapping from the runtime
 */
export const decorateRuntimeWithNewMapping = (runtime: Runtime, mapping: Mapping, graph: PureModel): void => {
  const runtimeValue = runtime instanceof RuntimePointer ? runtime.packageableRuntime.value.runtimeValue : guaranteeType(runtime, EngineRuntime);
  getStoresFromMappings([mapping], graph).forEach(store => runtimeValue.addUniqueStoreConnectionsForStore(store));
  const sourceClasses = mapping.classMappings
    .map(classMapping => getMappingElementSource(classMapping))
    .filter((sourceElement): sourceElement is Class => sourceElement instanceof Class);
  let classesSpecifiedInModelConnections: Class[] = [];
  runtimeValue.connections.forEach(storeConnections => {
    if (storeConnections.store.value instanceof ModelStore) {
      classesSpecifiedInModelConnections = storeConnections.storeConnections
        .filter(identifiedConnection => identifiedConnection.connection instanceof JsonModelConnection || identifiedConnection.connection instanceof XmlModelConnection)
        .map(identifiedConnection => (identifiedConnection.connection as JsonModelConnection | XmlModelConnection).class.value);
    }
  });
  sourceClasses.filter(_class => !classesSpecifiedInModelConnections.includes(_class)).forEach(_class =>
    runtimeValue.addIdentifiedConnection(new IdentifiedConnection(runtimeValue.generateIdentifiedConnectionId(), new JsonModelConnection(PackageableElementExplicitReference.create(graph.modelStore), PackageableElementExplicitReference.create(_class))))
  );
};

export const isConnectionForStore = (connection: Connection, store: Store): boolean => {
  const connectionValue = connection instanceof ConnectionPointer ? connection.packageableConnection.value.connectionValue : connection;
  if (connectionValue instanceof PureModelConnection) {
    return store instanceof ModelStore;
  }
  return connectionValue.store.value === store;
};

export const isConnectionForModelStoreWithClass = (connection: Connection, _class: Class): boolean => {
  const connectionValue = connection instanceof ConnectionPointer ? connection.packageableConnection.value.connectionValue : connection;
  if (connectionValue instanceof JsonModelConnection || connectionValue instanceof XmlModelConnection) {
    return connectionValue.class.value === _class;
  }
  return false;
};

export const getConnectionsForModelStoreWithClass = (connections: Connection[], _class: Class): Connection[] => uniq(connections.filter(connection => isConnectionForModelStoreWithClass(connection, _class)));

/**
 * Derive the stores from the runtime's mappings and then partition the list of runtime's connections based on the store
 */
export const getRuntimeExplorerTreeData = (runtime: Runtime): TreeData<RuntimeExplorerTreeNodeData> => {
  const runtimeValue = runtime instanceof RuntimePointer ? runtime.packageableRuntime.value.runtimeValue : guaranteeType(runtime, EngineRuntime);
  const rootIds: string[] = [];
  const nodes = new Map<string, RuntimeExplorerTreeNodeData>();
  const allSourceClassesFromMappings = uniq(runtimeValue.mappings.flatMap(mapping => mapping.value
    .getClassMappings()
    .map(setImplementation => getMappingElementSource(setImplementation))
    .filter((source): source is Class => source instanceof Class)
  ));
  // runtime (root)
  const runtimeNode = {
    data: runtimeValue,
    id: 'runtime',
    label: runtime instanceof RuntimePointer ? runtime.packageableRuntime.value.name : '(custom)',
    isOpen: true,
    childrenIds: [] as string[],
  };
  nodes.set(runtimeNode.id, runtimeNode);
  addUniqueEntry(rootIds, runtimeNode.id);
  // stores (1st level)
  runtimeValue.connections.map(storeConnections => storeConnections.store.value)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(store => {
      const childrenIds: string[] = [];
      if (store instanceof ModelStore) {
        // expand ModelStore to show source classes
        const classes = uniq(runtimeValue.allIdentifiedConnections.filter(identifiedConnection => identifiedConnection.connection.store.value instanceof ModelStore).map(identifiedConnection => {
          const connectionValue = identifiedConnection.connection instanceof ConnectionPointer ? identifiedConnection.connection.packageableConnection.value.connectionValue : identifiedConnection.connection;
          if (connectionValue instanceof JsonModelConnection || connectionValue instanceof XmlModelConnection) {
            return connectionValue.class.value;
          }
          throw new UnsupportedOperationError();
        }).concat(allSourceClassesFromMappings)); // make sure we add classes (from mappings) that we expect to have connections for
        // classes (2nd level) - only for `ModelStore`
        classes.forEach(_class => {
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
  uuid = uuid();
  editorStore: EditorStore;
  runtimeEditorState: RuntimeEditorState;

  constructor(editorStore: EditorStore, runtimeEditorState: RuntimeEditorState) {
    this.editorStore = editorStore;
    this.runtimeEditorState = runtimeEditorState;
  }
}

export class IdentifiedConnectionEditorState {
  editorStore: EditorStore;
  idenfitiedConnection: IdentifiedConnection;
  connectionEditorState: ConnectionEditorState;

  constructor(editorStore: EditorStore, idenfitiedConnection: IdentifiedConnection) {
    this.editorStore = editorStore;
    this.idenfitiedConnection = idenfitiedConnection;
    this.connectionEditorState = new ConnectionEditorState(this.editorStore, idenfitiedConnection.connection);
  }
}

export abstract class IdentifiedConnectionsEditorTabState extends RuntimeEditorTabState {
  @observable identifiedConnectionEditorState?: IdentifiedConnectionEditorState;

  @action openIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    this.identifiedConnectionEditorState = new IdentifiedConnectionEditorState(this.editorStore, identifiedConnection);
  }

  @action addIdentifiedConnection(packageableConnection?: PackageableConnection): void {
    let newConnection: Connection;
    if (packageableConnection && this.packageableConnections.includes(packageableConnection)) {
      newConnection = new ConnectionPointer(PackageableElementExplicitReference.create(packageableConnection));
    } else if (this.packageableConnections.length) {
      newConnection = new ConnectionPointer(PackageableElementExplicitReference.create(this.packageableConnections[0]));
    } else {
      newConnection = this.createNewCustomConnection();
    }
    const newIdentifiedConnection = new IdentifiedConnection(this.runtimeEditorState.runtimeValue.generateIdentifiedConnectionId(), newConnection);
    this.runtimeEditorState.runtimeValue.addIdentifiedConnection(newIdentifiedConnection);
    this.openIdentifiedConnection(newIdentifiedConnection);
  }

  getConnectionEditorState(): ConnectionEditorState | undefined {
    return this.identifiedConnectionEditorState?.connectionEditorState.connection instanceof ConnectionPointer
      ? new ConnectionEditorState(this.editorStore, this.identifiedConnectionEditorState.connectionEditorState.connection.packageableConnection.value.connectionValue)
      : this.identifiedConnectionEditorState?.connectionEditorState;
  }

  abstract get identifiedConnections(): IdentifiedConnection[]
  abstract get packageableConnections(): PackageableConnection[]
  abstract createNewCustomConnection(): Connection
  abstract deleteIdentifiedConnection(identifiedConnection: IdentifiedConnection): void
}

export class IdentifiedConnectionsPerStoreEditorTabState extends IdentifiedConnectionsEditorTabState {
  @observable store: Store;

  constructor(editorStore: EditorStore, runtimeEditorState: RuntimeEditorState, store: Store) {
    super(editorStore, runtimeEditorState);
    this.store = store;
    if (this.identifiedConnections.length) { this.openIdentifiedConnection(this.identifiedConnections[0]) }
  }

  @computed get identifiedConnections(): IdentifiedConnection[] {
    return this.runtimeEditorState.runtimeValue.connections.find(storeConnections => storeConnections.store.value === this.store)?.storeConnections ?? [];
  }

  @computed get packageableConnections(): PackageableConnection[] {
    return this.editorStore.graphState.graph.connections.filter(connection => isConnectionForStore(connection.connectionValue, this.store));
  }

  /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
  createNewCustomConnection(): Connection {
    throw new UnsupportedOperationError();
  }

  @action deleteIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    this.runtimeEditorState.runtimeValue.deleteIdentifiedConnection(identifiedConnection);
    if (identifiedConnection.connection === this.identifiedConnectionEditorState?.connectionEditorState.connection) {
      this.identifiedConnectionEditorState = undefined;
    }
    this.runtimeEditorState.reprocessRuntimeExplorerTree();
    if (!this.identifiedConnections.length) {
      const stores = getStoresFromMappings(this.runtimeEditorState.runtimeValue.mappings.map(mapping => mapping.value), this.editorStore.graphState.graph);
      if (!stores.includes(this.store)) {
        this.runtimeEditorState.openTabFor(this.runtimeEditorState.runtimeValue);
      }
    }
  }
}

export class IdentifiedConnectionsPerClassEditorTabState extends IdentifiedConnectionsEditorTabState {
  @observable class: Class;

  constructor(editorStore: EditorStore, runtimeEditorState: RuntimeEditorState, _class: Class) {
    super(editorStore, runtimeEditorState);
    this.class = _class;
    if (this.identifiedConnections.length) { this.openIdentifiedConnection(this.identifiedConnections[0]) }
  }

  @computed get identifiedConnections(): IdentifiedConnection[] {
    return this.runtimeEditorState.runtimeValue.allIdentifiedConnections.filter(identifiedConnection => isConnectionForModelStoreWithClass(identifiedConnection.connection, this.class));
  }

  @computed get packageableConnections(): PackageableConnection[] {
    return this.editorStore.graphState.graph.connections.filter(connection => isConnectionForModelStoreWithClass(connection.connectionValue, this.class));
  }

  createNewCustomConnection(): Connection { return new JsonModelConnection(PackageableElementExplicitReference.create(this.editorStore.graphState.graph.modelStore), PackageableElementExplicitReference.create(this.class)) }

  @action deleteIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    this.runtimeEditorState.runtimeValue.deleteIdentifiedConnection(identifiedConnection);
    if (identifiedConnection.connection === this.identifiedConnectionEditorState?.connectionEditorState.connection) {
      this.identifiedConnectionEditorState = undefined;
    }
    this.runtimeEditorState.reprocessRuntimeExplorerTree();
    if (!this.identifiedConnections.length) {
      const allSourceClassesFromMappings = uniq(this.runtimeEditorState.runtimeValue.mappings.flatMap(mapping => mapping.value
        .getClassMappings()
        .map(setImplementation => getMappingElementSource(setImplementation))
        .filter((source): source is Class => source instanceof Class)
      ));
      if (!allSourceClassesFromMappings.includes(this.class)) {
        this.runtimeEditorState.openTabFor(this.runtimeEditorState.runtimeValue);
      }
    }
  }
}

export class RuntimeEditorRuntimeTabState extends RuntimeEditorTabState { }

export class RuntimeEditorState {
  uuid = uuid(); // NOTE: used to force component remount on state change
  editorStore: EditorStore;
  runtime: Runtime;
  runtimeValue: EngineRuntime;
  @observable.ref explorerTreeData: TreeData<RuntimeExplorerTreeNodeData>;
  @observable currentTabState?: RuntimeEditorTabState;

  constructor(editorStore: EditorStore, runtime: Runtime) {
    this.editorStore = editorStore;
    this.runtime = runtime;
    this.runtimeValue = runtime instanceof RuntimePointer ? runtime.packageableRuntime.value.runtimeValue : guaranteeType(runtime, EngineRuntime);
    this.explorerTreeData = getRuntimeExplorerTreeData(this.runtime);
    this.openTabFor(this.runtimeValue); // open runtime tab on init
  }

  @action setExplorerTreeData(treeData: TreeData<RuntimeExplorerTreeNodeData>): void { this.explorerTreeData = treeData }

  @action addMapping(mapping: Mapping): void {
    if (!this.runtimeValue.mappings.map(m => m.value).includes(mapping)) {
      this.runtimeValue.addMapping(PackageableElementExplicitReference.create(mapping));
      decorateRuntimeWithNewMapping(this.runtimeValue, mapping, this.editorStore.graphState.graph);
      this.reprocessRuntimeExplorerTree();
    }
  }

  @action deleteMapping(mappingRef: PackageableElementReference<Mapping>): void {
    this.runtimeValue.deleteMapping(mappingRef);
    this.reprocessRuntimeExplorerTree();
  }

  @action changeMapping(mappingRef: PackageableElementReference<Mapping>, newVal: Mapping): void {
    mappingRef.setValue(newVal);
    decorateRuntimeWithNewMapping(this.runtimeValue, newVal, this.editorStore.graphState.graph);
    this.reprocessRuntimeExplorerTree();
  }

  @action addIdentifiedConnection(identifiedConnection: IdentifiedConnection): void {
    this.runtimeValue.addIdentifiedConnection(identifiedConnection);
    const connectionValue = identifiedConnection.connection instanceof ConnectionPointer ? identifiedConnection.connection.packageableConnection.value.connectionValue : identifiedConnection.connection;
    this.openTabFor((connectionValue instanceof JsonModelConnection || connectionValue instanceof XmlModelConnection) ? connectionValue.class.value : connectionValue.store.value);
    if (this.currentTabState instanceof IdentifiedConnectionsEditorTabState) {
      this.currentTabState.openIdentifiedConnection(identifiedConnection);
    }
    this.reprocessRuntimeExplorerTree();
  }

  @action openTabFor(tabElement: Runtime | Store | Class): void {
    if (tabElement instanceof Runtime) {
      if (!(this.currentTabState instanceof RuntimeEditorRuntimeTabState)) {
        this.currentTabState = new RuntimeEditorRuntimeTabState(this.editorStore, this);
      }
    } else if (tabElement instanceof ModelStore) {
      return;
    } else if (tabElement instanceof Class) {
      if (!(this.currentTabState instanceof IdentifiedConnectionsPerClassEditorTabState) || this.currentTabState.class !== tabElement) {
        this.currentTabState = new IdentifiedConnectionsPerClassEditorTabState(this.editorStore, this, tabElement);
      }
    } else if (tabElement instanceof Store) {
      if (!(this.currentTabState instanceof IdentifiedConnectionsPerStoreEditorTabState) || this.currentTabState.store !== tabElement) {
        this.currentTabState = new IdentifiedConnectionsPerStoreEditorTabState(this.editorStore, this, tabElement);
      }
    }
  }

  @action decorateRuntimeConnections(): void {
    getStoresFromMappings(this.runtimeValue.mappings.map(mapping => mapping.value), this.editorStore.graphState.graph).forEach(store => this.runtimeValue.addUniqueStoreConnectionsForStore(store));
  }

  @action cleanUpDecoration(): void {
    this.runtimeValue.connections = this.runtimeValue.connections.filter(storeConnections => !storeConnections.isStub);
  }

  onExplorerTreeNodeExpand = (node: RuntimeExplorerTreeNodeData): void => {
    if (node.childrenIds?.length) { node.isOpen = !node.isOpen }
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
      return this.currentTabState instanceof IdentifiedConnectionsPerClassEditorTabState && this.currentTabState.class === node.data;
    } else if (node.data instanceof Store && !(node.data instanceof ModelStore)) {
      return this.currentTabState instanceof IdentifiedConnectionsPerStoreEditorTabState && this.currentTabState.store === node.data;
    }
    return false;
  };

  getExplorerTreeChildNodes = (node: RuntimeExplorerTreeNodeData): RuntimeExplorerTreeNodeData[] => {
    if (!node.childrenIds) { return [] }
    return node.childrenIds
      .map(id => this.explorerTreeData.nodes.get(id))
      .filter(isNonNullable);
  };

  @action reprocessRuntimeExplorerTree(): void {
    const openedTreeNodeIds = Array.from(this.explorerTreeData.nodes.values()).filter(node => node.isOpen).map(node => node.id);
    const treeData = getRuntimeExplorerTreeData(this.runtime);
    openedTreeNodeIds.forEach(nodeId => {
      const node = treeData.nodes.get(nodeId);
      if (node && !node.isOpen) { node.isOpen = true }
    });
    this.setExplorerTreeData(treeData);
  }

  /**
   * If the currently opened connection tab is a connection pointer whose store/source class has been changed, we will
   * remove this tab and switch to default runtime tab
   */
  @action reprocessCurrentTabState(): void {
    if (this.currentTabState instanceof IdentifiedConnectionsEditorTabState) {
      const connection = this.currentTabState.identifiedConnectionEditorState?.connectionEditorState.connection;
      const connectionValue = connection instanceof ConnectionPointer ? connection.packageableConnection.value.connectionValue : connection;
      if (this.currentTabState instanceof IdentifiedConnectionsPerClassEditorTabState) {
        if (((connectionValue instanceof JsonModelConnection || connectionValue instanceof XmlModelConnection) && connectionValue.class.value !== this.currentTabState.class)
          || (this.currentTabState instanceof IdentifiedConnectionsPerStoreEditorTabState && this.currentTabState.store !== connectionValue?.store.value)
        ) {
          this.openTabFor(this.runtimeValue);
        }
      }
    }
  }
}

export class PackageableRuntimeEditorState extends ElementEditorState {
  runtimeEditorState: RuntimeEditorState;

  constructor(editorStore: EditorStore, packageableRuntime: PackageableElement) {
    super(editorStore, packageableRuntime);
    this.runtimeEditorState = new RuntimeEditorState(editorStore, this.runtime.runtimeValue);
  }

  @computed get runtime(): PackageableRuntime { return guaranteeType(this.element, PackageableRuntime, 'Element inside runtime editor state must be a packageable runtime') }

  revealCompilationError(compilationError: CompilationError): boolean { return false }

  @action reprocess(newElement: PackageableElement, editorStore: EditorStore): ElementEditorState {
    const editorState = new PackageableRuntimeEditorState(editorStore, newElement);
    return editorState;
  }
}
