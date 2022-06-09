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

import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst.js';
import { type Hashable, hashArray } from '@finos/legend-shared';
import type { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import type { V1_Connection } from '../../../model/packageableElements/connection/V1_Connection.js';

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

export class V1_EngineRuntime extends V1_Runtime implements Hashable {
  mappings: V1_PackageableElementPointer[] = [];
  connections!: V1_StoreConnections[];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENGINE_RUNTIME,
      hashArray(this.mappings),
      hashArray(this.connections),
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
