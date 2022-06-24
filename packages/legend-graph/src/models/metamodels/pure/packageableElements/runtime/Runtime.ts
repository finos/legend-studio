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

import { type Hashable, hashArray, uuid } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  PackageableElementPointerType,
} from '../../../../../MetaModelConst.js';
import type { Connection } from '../connection/Connection.js';
import type { PackageableRuntime } from './PackageableRuntime.js';
import type { Mapping } from '../mapping/Mapping.js';
import type { Store } from '../store/Store.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import { hashElementPointer } from '../../../../../MetaModelUtils.js';

export class IdentifiedConnection implements Hashable {
  readonly _UUID = uuid();

  id: string;
  connection: Connection;

  constructor(id: string, connection: Connection) {
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
    this.store = store;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.STORE_CONNECTIONS,
      hashElementPointer(
        PackageableElementPointerType.STORE,
        this.store.valueForSerialization ?? '',
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

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENGINE_RUNTIME,
      hashArray(
        this.mappings.map((mapping) =>
          hashElementPointer(
            PackageableElementPointerType.MAPPING,
            mapping.valueForSerialization ?? '',
          ),
        ),
      ),
      hashArray(
        this.connections.filter(
          // TODO: use `isStubbed_StoreConnections` when we refactor hashing
          (connection) => connection.storeConnections.length,
        ),
      ),
    ]);
  }
}

export class RuntimePointer extends Runtime implements Hashable {
  packageableRuntime: PackageableElementReference<PackageableRuntime>;

  constructor(
    packageableRuntime: PackageableElementReference<PackageableRuntime>,
  ) {
    super();
    this.packageableRuntime = packageableRuntime;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RUNTIME_POINTER,
      this.packageableRuntime.valueForSerialization ?? '',
    ]);
  }
}
