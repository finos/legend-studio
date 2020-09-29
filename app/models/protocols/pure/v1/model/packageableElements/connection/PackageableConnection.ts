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

import { serializable, SKIP, custom, deserialize } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { UnsupportedOperationError, IllegalStateError } from 'Utilities/GeneralUtil';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { Connection, ConnectionType } from 'V1/model/packageableElements/connection/Connection';
import { JsonModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/XmlModelConnection';

export class PackageableConnection extends PackageableElement implements Hashable {
  @serializable(custom(
    () => SKIP,
    value => {
      switch (value?._type) {
        /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
        case ConnectionType.JSON_MODEL_CONNECTION: return deserialize(JsonModelConnection, value);
        case ConnectionType.XML_MODEL_CONNECTION: return deserialize(XmlModelConnection, value);
        case ConnectionType.CONNECTION_POINTER: throw new IllegalStateError(`Packageable connection value cannot be a connection pointer`);
        default: throw new UnsupportedOperationError(`Unsupported connection type '${value?._type}'`);
      }
    }
  )) connectionValue!: Connection;

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PACKAGEABLE_CONNECTION,
      super.hashCode,
      this.connectionValue,
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_PackageableConnection(this);
  }
}
