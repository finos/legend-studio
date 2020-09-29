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

import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';
import { serializable, alias } from 'serializr';
import { JsonModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { ConnectionPointer } from './ConnectionPointer';

export enum ConnectionType {
  CONNECTION_POINTER = 'connectionPointer',
  MODEL_CONNECTION = 'ModelConnection',
  JSON_MODEL_CONNECTION = 'JsonModelConnection',
  XML_MODEL_CONNECTION = 'XmlModelConnection'
}

/* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
export interface ConnectionVisitor<T> {
  visit_ConnectionPointer(connection: ConnectionPointer): T;
  visit_JsonModelConnection(connection: JsonModelConnection): T;
  visit_XmlModelConnection(connection: XmlModelConnection): T;
}

export abstract class Connection implements Hashable {
  @serializable _type!: ConnectionType;
  @serializable(alias('element')) store?: string;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.CONNECTION,
      this.store ?? '',
    ]);
  }

  abstract accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T
}
