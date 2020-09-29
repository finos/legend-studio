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

import { assertNonNullable, assertTrue, assertType } from 'Utilities/GeneralUtil';
import { MODEL_STORE_NAME } from 'MetaModelConst';
import { Connection as MM_Connection, ConnectionPointer as MM_ConnectionPointer } from 'MM/model/packageableElements/connection/Connection';
import { JsonModelConnection as MM_JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection as MM_XmlModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { Store as MM_Store } from 'MM/model/packageableElements/store/Store';
import { ModelStore as MM_ModelStore } from 'MM/model/packageableElements/store/modelToModel/model/ModelStore';
import { PackageableElementReference as MM_PackageableElementReference, PackageableElementExplicitReference as MM_PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { ConnectionVisitor } from 'V1/model/packageableElements/connection/Connection';
import { JsonModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from 'V1/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { ConnectionPointer } from 'V1/model/packageableElements/connection/ConnectionPointer';

export class ProtocolToMetaModelConnectionVisitor implements ConnectionVisitor<MM_Connection> {
  context: GraphBuilderContext;
  embeddedConnectionStore?: MM_PackageableElementReference<MM_Store>

  constructor(context: GraphBuilderContext, embeddedConnectionStore?: MM_PackageableElementReference<MM_Store>) {
    this.context = context;
    this.embeddedConnectionStore = embeddedConnectionStore;
  }

  visit_ConnectionPointer(connection: ConnectionPointer): MM_Connection {
    assertNonNullable(connection.connection, 'Connection pointer connection is missing');
    return new MM_ConnectionPointer(this.context.resolveConnection(connection.connection));
  }

  visit_JsonModelConnection(connection: JsonModelConnection): MM_Connection {
    if (!this.embeddedConnectionStore || connection.store !== undefined) {
      assertTrue(connection.store === MODEL_STORE_NAME, `JSON model connection store must be 'ModelStore'`);
    } else {
      assertType(this.embeddedConnectionStore.value, MM_ModelStore, `Embedded JSON model connection store must be 'ModelStore'`);
    }
    assertNonNullable(connection.class, 'JSON model connection class is missing');
    assertNonNullable(connection.url, 'JSON model connection data is missing');
    return new MM_JsonModelConnection(MM_PackageableElementExplicitReference.create(this.context.graph.modelStore), this.context.resolveClass(connection.class), connection.url);
  }

  visit_XmlModelConnection(connection: XmlModelConnection): MM_Connection {
    if (!this.embeddedConnectionStore || connection.store !== undefined) {
      assertTrue(connection.store === MODEL_STORE_NAME, `XML model connection store must be 'ModelStore'`);
    } else {
      assertType(this.embeddedConnectionStore.value, MM_ModelStore, `Embedded XML model connection store must be 'ModelStore'`);
    }
    assertNonNullable(connection.class, 'XML model connection class is missing');
    assertNonNullable(connection.url, 'XML model connection data is missing');
    return new MM_XmlModelConnection(MM_PackageableElementExplicitReference.create(this.context.graph.modelStore), this.context.resolveClass(connection.class), connection.url);
  }
}
