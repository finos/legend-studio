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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import type { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_Connection } from '../../../model/packageableElements/connection/V1_Connection.js';
import type { V1_ConnectionPointer } from '../connection/V1_ConnectionPointer.js';

export abstract class V1_Runtime implements Hashable {
  abstract get hashCode(): string;
}

export class V1_IdentifiedConnection implements Hashable {
  id!: string;
  connection!: V1_Connection;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.IDENTIFIED_CONNECTION,
      this.id,
      this.connection,
    ]);
  }
}

export class V1_StoreConnections implements Hashable {
  store!: V1_PackageableElementPointer;
  storeConnections: V1_IdentifiedConnection[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.STORE_CONNECTIONS,
      this.store,
      hashArray(this.storeConnections),
    ]);
  }
}

export class V1_ConnectionStores implements Hashable {
  connectionPointer!: V1_ConnectionPointer;
  storePointers: V1_PackageableElementPointer[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.STORE_CONNECTIONS,
      this.connectionPointer,
      hashArray(this.storePointers),
    ]);
  }
}

export class V1_EngineRuntime extends V1_Runtime implements Hashable {
  mappings: V1_PackageableElementPointer[] = [];
  connectionStores: V1_ConnectionStores[] = [];
  connections: V1_StoreConnections[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENGINE_RUNTIME,
      hashArray(this.mappings),
      hashArray(this.connectionStores),
      hashArray(this.connections),
    ]);
  }
}

export class V1_SingleConnectionEngineRuntime extends V1_EngineRuntime {
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SINGLE_ENGINE_RUNTIME,
      hashArray(this.mappings),
      hashArray(this.connectionStores),
      hashArray(this.connections),
    ]);
  }
}

export class V1_LakehouseRuntime extends V1_EngineRuntime implements Hashable {
  environment?: string | undefined;
  warehouse?: string | undefined;
  connectionPointer?: V1_ConnectionPointer | undefined;
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.LAKEHOUSE_RUNTIME,
      this.environment ?? '',
      this.warehouse ?? '',
      this.connectionPointer ?? '',
    ]);
  }
}

export class V1_LegacyRuntime extends V1_Runtime implements Hashable {
  mappings: V1_PackageableElementPointer[] = [];
  connections: V1_Connection[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.LEGACY_RUNTIME,
      hashArray(this.mappings),
      hashArray(this.connections),
    ]);
  }
}

export class V1_RuntimePointer extends V1_Runtime implements Hashable {
  runtime!: string;

  get hashCode(): string {
    return hashArray([CORE_HASH_STRUCTURE.RUNTIME_POINTER, this.runtime]);
  }
}
