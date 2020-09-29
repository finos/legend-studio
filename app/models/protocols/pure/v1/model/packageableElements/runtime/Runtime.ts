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

import { serializable, list, SKIP, custom, deserialize, object } from 'serializr';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { PackageableElementPointer } from 'V1/model/packageableElements/PackageableElement';
import { Connection, ConnectionType } from 'V1/model/packageableElements/connection/Connection';
import { JsonModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { ConnectionPointer } from 'V1/model/packageableElements/connection/ConnectionPointer';
import { XmlModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/XmlModelConnection';

export enum RuntimeType {
  RUNTIME_POINTER = 'runtimePointer',
  LEGACY_RUNTIME = 'legacyRuntime',
  ENGINE_RUNTIME = 'engineRuntime',
}

export abstract class Runtime implements Hashable {
  @serializable _type!: RuntimeType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  abstract get hashCode(): string
}

export class IdentifiedConnection implements Hashable {
  @serializable id!: string;
  @serializable(custom(
    () => SKIP,
    value => {
      switch (value?._type) {
        /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
        case ConnectionType.JSON_MODEL_CONNECTION: return deserialize(JsonModelConnection, value);
        case ConnectionType.XML_MODEL_CONNECTION: return deserialize(XmlModelConnection, value);
        case ConnectionType.CONNECTION_POINTER: return deserialize(ConnectionPointer, value);
        default: throw new UnsupportedOperationError(`Unsupported connection type '${value?._type}'`);
      }
    }
  )) connection!: Connection;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.IDENTIFIED_CONNECTION,
      this.id,
      this.connection,
    ]);
  }
}

export class StoreConnections implements Hashable {
  @serializable(object(PackageableElementPointer)) store!: PackageableElementPointer;
  @serializable(list(object(IdentifiedConnection))) storeConnections: IdentifiedConnection[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.STORE_CONNECTIONS,
      this.store,
      hashArray(this.storeConnections),
    ]);
  }
}

export class EngineRuntime extends Runtime implements Hashable {
  @serializable _type!: RuntimeType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable(list(object(PackageableElementPointer))) mappings: PackageableElementPointer[] = [];
  @serializable(list(object(StoreConnections))) connections!: StoreConnections[];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENGINE_RUNTIME,
      hashArray(this.mappings),
      hashArray(this.connections),
    ]);
  }
}

export class LegacyRuntime extends Runtime implements Hashable {
  @serializable _type!: RuntimeType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable(list(object(PackageableElementPointer))) mappings: PackageableElementPointer[] = [];
  @serializable(list(custom(
    () => SKIP,
    value => {
      switch (value?._type) {
        /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
        case ConnectionType.JSON_MODEL_CONNECTION: return deserialize(JsonModelConnection, value);
        case ConnectionType.XML_MODEL_CONNECTION: return deserialize(XmlModelConnection, value);
        case ConnectionType.CONNECTION_POINTER: return deserialize(ConnectionPointer, value);
        default: throw new UnsupportedOperationError(`Unsupported connection type '${value?._type}'`);
      }
    }
  ))) connections: Connection[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.LEGACY_RUNTIME,
      hashArray(this.mappings),
      hashArray(this.connections),
    ]);
  }
}

export class RuntimePointer extends Runtime implements Hashable {
  @serializable _type!: RuntimeType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable runtime!: string;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.RUNTIME_POINTER,
      this.runtime,
    ]);
  }
}
