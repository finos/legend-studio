/**
 * Copyright 2020 Goldman Sachs
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

import { observable, computed, action, makeObservable } from 'mobx';
import {
  hashArray,
  generateEnumerableNameFromToken,
  assertTrue,
  uuid,
  addUniqueEntry,
  deleteEntry,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { Connection } from '../../../model/packageableElements/connection/Connection';
import type { PackageableRuntime } from '../../../model/packageableElements/runtime/PackageableRuntime';
import type { Mapping } from '../../../model/packageableElements/mapping/Mapping';
import type { Store } from '../../../model/packageableElements/store/Store';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../model/packageableElements/PackageableElementReference';
import {
  getElementPointerHashCode,
  PACKAGEABLE_ELEMENT_POINTER_TYPE,
} from '../../../model/packageableElements/PackageableElement';

export class IdentifiedConnection implements Hashable {
  uuid = uuid();
  id: string;
  connection: Connection;

  constructor(id: string, connection: Connection) {
    makeObservable(this, {
      id: observable,
      connection: observable,
      hashCode: computed,
    });

    this.id = id;
    this.connection = connection;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.IDENTIFIED_CONNECTION,
      this.id,
      this.connection,
    ]);
  }
}

export class StoreConnections implements Hashable {
  store: PackageableElementReference<Store>;
  storeConnections: IdentifiedConnection[] = [];

  constructor(store: PackageableElementReference<Store>) {
    makeObservable(this, {
      storeConnections: observable,
      isStub: computed,
      hashCode: computed,
    });

    this.store = store;
  }

  get isStub(): boolean {
    return !this.storeConnections.length;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.STORE_CONNECTIONS,
      getElementPointerHashCode(
        PACKAGEABLE_ELEMENT_POINTER_TYPE.STORE,
        this.store.valueForSerialization,
      ),
      hashArray(this.storeConnections),
    ]);
  }
}

export abstract class Runtime implements Hashable {
  abstract get hashCode(): string;
}

export class EngineRuntime extends Runtime implements Hashable {
  mappings: PackageableElementReference<Mapping>[] = [];
  connections: StoreConnections[] = [];

  constructor() {
    super();

    makeObservable(this, {
      mappings: observable,
      connections: observable,
      addIdentifiedConnection: action,
      deleteIdentifiedConnection: action,
      addUniqueStoreConnectionsForStore: action,
      setMappings: action,
      addMapping: action,
      deleteMapping: action,
      allIdentifiedConnections: computed,
      hashCode: computed,
    });
  }

  addIdentifiedConnection(value: IdentifiedConnection): void {
    const store = value.connection.store;
    const storeConnections =
      this.connections.find((sc) => sc.store.value === store.value) ??
      new StoreConnections(store);
    addUniqueEntry(this.connections, storeConnections);
    assertTrue(
      !storeConnections.storeConnections
        .map((connection) => connection.id)
        .includes(value.id),
      `Can't add identified connection as a connection with the same ID '${value.id} already existed'`,
    );
    addUniqueEntry(storeConnections.storeConnections, value);
  }

  deleteIdentifiedConnection(value: IdentifiedConnection): void {
    const storeConnections = this.connections.find(
      (sc) => sc.store.value === value.connection.store.value,
    );
    if (storeConnections) {
      deleteEntry(storeConnections.storeConnections, value);
    }
  }

  addUniqueStoreConnectionsForStore(value: Store): void {
    if (!this.connections.find((sc) => sc.store.value === value)) {
      this.connections.push(
        new StoreConnections(PackageableElementExplicitReference.create(value)),
      );
    }
  }
  setMappings(value: PackageableElementReference<Mapping>[]): void {
    this.mappings = value;
  }
  addMapping(value: PackageableElementReference<Mapping>): void {
    addUniqueEntry(this.mappings, value);
  }
  deleteMapping(value: PackageableElementReference<Mapping>): void {
    deleteEntry(this.mappings, value);
  }

  get allIdentifiedConnections(): IdentifiedConnection[] {
    return this.connections.flatMap(
      (storeConnections) => storeConnections.storeConnections,
    );
  }

  generateIdentifiedConnectionId(): string {
    const generatedId = generateEnumerableNameFromToken(
      this.allIdentifiedConnections.map(
        (identifiedConnection) => identifiedConnection.id,
      ),
      'connection',
    );
    assertTrue(
      !this.allIdentifiedConnections.find(
        (identifiedConnection) => identifiedConnection.id === generatedId,
      ),
      `Can't auto-generate connection ID with value '${generatedId}'`,
    );
    return generatedId;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENGINE_RUNTIME,
      hashArray(
        this.mappings.map((mapping) =>
          getElementPointerHashCode(
            PACKAGEABLE_ELEMENT_POINTER_TYPE.MAPPING,
            mapping.valueForSerialization,
          ),
        ),
      ),
      hashArray(this.connections.filter((connection) => !connection.isStub)),
    ]);
  }
}

export class RuntimePointer extends Runtime implements Hashable {
  packageableRuntime: PackageableElementReference<PackageableRuntime>;

  constructor(
    packageableRuntime: PackageableElementReference<PackageableRuntime>,
  ) {
    super();

    makeObservable(this, {
      hashCode: computed,
    });

    this.packageableRuntime = packageableRuntime;
  }

  setPackageableRuntime(value: PackageableRuntime): void {
    this.packageableRuntime.setValue(value);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RUNTIME_POINTER,
      this.packageableRuntime.valueForSerialization,
    ]);
  }
}
