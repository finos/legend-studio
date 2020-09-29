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

import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { serializable } from 'serializr';
import { Connection, ConnectionVisitor, ConnectionType } from 'V1/model/packageableElements/connection/Connection';

export class XmlModelConnection extends Connection implements Hashable {
  // @serializable _type!: ConnectionType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable _type = ConnectionType.XML_MODEL_CONNECTION; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable class!: string;
  @serializable url!: string;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.XML_MODEL_CONNECTION,
      super.hashCode,
      this.class,
      this.url,
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_XmlModelConnection(this);
  }
}
