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
  type Hashable,
  hashArray,
  generateEnumerableNameFromToken,
  assertTrue,
  uuid,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { Connection } from '../connection/Connection';
import type { PackageableRuntime } from './PackageableRuntime';
import type { Mapping } from '../mapping/Mapping';
import type { Store } from '../store/Store';
import {
  getElementPointerHashCode,
  PACKAGEABLE_ELEMENT_POINTER_TYPE,
} from '../PackageableElement';
import type { PackageableElementReference } from '../PackageableElementReference';

export class /*toCHECK*/ IdentifiedConnection implements Hashable {
  uuid = uuid();
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

export class /*toCHECK*/ StoreConnections implements Hashable {
  store: PackageableElementReference<Store>;
  storeConnections: IdentifiedConnection[] = [];

  constructor(store: PackageableElementReference<Store>) {
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
        this.store.hashValue,
      ),
      hashArray(this.storeConnections),
    ]);
  }
}

export abstract class /*toCHECK*/ Runtime implements Hashable {
  abstract get hashCode(): string;
}

export class /*toCHECK*/ EngineRuntime extends Runtime implements Hashable {
  mappings: PackageableElementReference<Mapping>[] = [];
  connections: StoreConnections[] = [];

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
            mapping.hashValue,
          ),
        ),
      ),
      hashArray(this.connections.filter((connection) => !connection.isStub)),
    ]);
  }
}

export class /*toCHECK*/ RuntimePointer extends Runtime implements Hashable {
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
      this.packageableRuntime.hashValue,
    ]);
  }
}
