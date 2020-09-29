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

import { observable, computed, action } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { addUniqueEntry, deleteEntry, generateEnumerableNameFromToken, assertTrue, uuid } from 'Utilities/GeneralUtil';
import { Connection } from 'MM/model/packageableElements/connection/Connection';
import { PackageableRuntime } from 'MM/model/packageableElements/runtime/PackageableRuntime';
import { Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Store } from 'MM/model/packageableElements/store/Store';
import { PackageableElementReference, PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { getElementPointerHashCode, PACKAGEABLE_ELEMENT_POINTER_TYPE } from 'MM/model/packageableElements/PackageableElement';

export class IdentifiedConnection implements Hashable {
  uuid = uuid();
  @observable id: string;
  @observable connection: Connection;

  constructor(id: string, connection: Connection) {
    this.id = id;
    this.connection = connection;
  }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.IDENTIFIED_CONNECTION,
      this.id,
      this.connection,
    ]);
  }
}

export class StoreConnections implements Hashable {
  store: PackageableElementReference<Store>;
  @observable storeConnections: IdentifiedConnection[] = [];

  constructor(store: PackageableElementReference<Store>) {
    this.store = store;
  }

  @computed get isStub(): boolean { return !this.storeConnections.length }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.STORE_CONNECTIONS,
      getElementPointerHashCode(PACKAGEABLE_ELEMENT_POINTER_TYPE.STORE, this.store.valueForSerialization),
      hashArray(this.storeConnections),
    ]);
  }
}

export abstract class Runtime implements Hashable {
  abstract get hashCode(): string
}

export class EngineRuntime extends Runtime implements Hashable {
  @observable mappings: PackageableElementReference<Mapping>[] = [];
  @observable connections: StoreConnections[] = [];

  @action addIdentifiedConnection(value: IdentifiedConnection): void {
    const store = value.connection.store;
    const storeConnections = this.connections.find(sc => sc.store.value === store.value) ?? new StoreConnections(store);
    addUniqueEntry(this.connections, storeConnections);
    assertTrue(!storeConnections.storeConnections.map(connection => connection.id).includes(value.id), `Can't add identified connection as a connection with the same ID '${value.id} already existed'`);
    addUniqueEntry(storeConnections.storeConnections, value);
  }

  @action deleteIdentifiedConnection(value: IdentifiedConnection): void {
    const storeConnections = this.connections.find(sc => sc.store.value === value.connection.store.value);
    if (storeConnections) {
      deleteEntry(storeConnections.storeConnections, value);
    }
  }

  @action addUniqueStoreConnectionsForStore(value: Store): void {
    if (!this.connections.find(sc => sc.store.value === value)) {
      this.connections.push(new StoreConnections(PackageableElementExplicitReference.create(value)));
    }
  }
  @action setMappings(value: PackageableElementReference<Mapping>[]): void { this.mappings = value }
  @action addMapping(value: PackageableElementReference<Mapping>): void { addUniqueEntry(this.mappings, value) }
  @action deleteMapping(value: PackageableElementReference<Mapping>): void { deleteEntry(this.mappings, value) }

  @computed get allIdentifiedConnections(): IdentifiedConnection[] { return this.connections.flatMap(storeConnections => storeConnections.storeConnections) }

  generateIdentifiedConnectionId(): string {
    const generatedId = generateEnumerableNameFromToken(this.allIdentifiedConnections.map(identifiedConnection => identifiedConnection.id), 'connection');
    assertTrue(!this.allIdentifiedConnections.find(identifiedConnection => identifiedConnection.id === generatedId), `Can't auto-generate connection ID with value '${generatedId}'`);
    return generatedId;
  }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENGINE_RUNTIME,
      hashArray(this.mappings.map(mapping => getElementPointerHashCode(PACKAGEABLE_ELEMENT_POINTER_TYPE.MAPPING, mapping.valueForSerialization))),
      hashArray(this.connections.filter(connection => !connection.isStub)),
    ]);
  }
}

export class RuntimePointer extends Runtime implements Hashable {
  packageableRuntime: PackageableElementReference<PackageableRuntime>;

  constructor(packageableRuntime: PackageableElementReference<PackageableRuntime>) {
    super();
    this.packageableRuntime = packageableRuntime;
  }

  setPackageableRuntime(value: PackageableRuntime): void { this.packageableRuntime.setValue(value) }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.RUNTIME_POINTER,
      this.packageableRuntime.valueForSerialization,
    ]);
  }
}
