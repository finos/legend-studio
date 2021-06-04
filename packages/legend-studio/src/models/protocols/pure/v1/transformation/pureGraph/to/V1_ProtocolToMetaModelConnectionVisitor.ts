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
  assertNonNullable,
  guaranteeNonNullable,
  assertTrue,
  assertType,
} from '@finos/legend-studio-shared';
import { MODEL_STORE_NAME } from '../../../../../../MetaModelConst';
import type { DatabaseType } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { RelationalDatabaseConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import type { Connection } from '../../../../../../metamodels/pure/model/packageableElements/connection/Connection';
import { ConnectionPointer } from '../../../../../../metamodels/pure/model/packageableElements/connection/Connection';
import { JsonModelConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { FlatDataConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import type { Store } from '../../../../../../metamodels/pure/model/packageableElements/store/Store';
import { FlatData } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { Database } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Database';
import { ModelStore } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/model/ModelStore';
import type { PackageableElementReference } from '../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { PackageableElementExplicitReference } from '../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { ModelChainConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/connection/ModelChainConnection';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_ConnectionVisitor } from '../../../model/packageableElements/connection/V1_Connection';
import type { V1_JsonModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection';
import type { V1_XmlModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection';
import type { V1_FlatDataConnection } from '../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection';
import type { V1_ConnectionPointer } from '../../../model/packageableElements/connection/V1_ConnectionPointer';
import type { V1_RelationalDatabaseConnection } from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection';
import {
  V1_processDatasourceSpecification,
  V1_processAuthenticationStrategy,
} from '../../../transformation/pureGraph/to/helpers/V1_RelationalConnectionBuilderHelper';
import type { V1_ModelChainConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection';
import { V1_processPostProcessor } from './helpers/V1_PostProcessorBuilderHelper';

export class V1_ProtocolToMetaModelConnectionVisitor
  implements V1_ConnectionVisitor<Connection>
{
  context: V1_GraphBuilderContext;
  embeddedConnectionStore?: PackageableElementReference<Store>;

  constructor(
    context: V1_GraphBuilderContext,
    embeddedConnectionStore?: PackageableElementReference<Store>,
  ) {
    this.context = context;
    this.embeddedConnectionStore = embeddedConnectionStore;
  }

  visit_ConnectionPointer(connection: V1_ConnectionPointer): Connection {
    assertNonNullable(
      connection.connection,
      'Connection pointer connection is missing',
    );
    return new ConnectionPointer(
      this.context.resolveConnection(connection.connection),
    );
  }

  visit_ModelChainConnection(
    connection: V1_ModelChainConnection,
  ): ModelChainConnection {
    if (connection.store === undefined && this.embeddedConnectionStore) {
      assertType(
        this.embeddedConnectionStore.value,
        ModelStore,
        `Embedded Model chain connection store must be 'ModelStore'`,
      );
    } else {
      assertTrue(
        connection.store === undefined || connection.store === MODEL_STORE_NAME,
        `Model chain connection store must be 'ModelStore'`,
      );
    }
    const modelConnection = new ModelChainConnection(
      PackageableElementExplicitReference.create(this.context.graph.modelStore),
    );
    modelConnection.mappings = connection.mappings.map(
      this.context.resolveMapping,
    );
    return modelConnection;
  }

  visit_JsonModelConnection(connection: V1_JsonModelConnection): Connection {
    if (connection.store === undefined && this.embeddedConnectionStore) {
      assertType(
        this.embeddedConnectionStore.value,
        ModelStore,
        `Embedded JSON model connection store must be 'ModelStore'`,
      );
    } else {
      assertTrue(
        connection.store === undefined || connection.store === MODEL_STORE_NAME,
        `JSON model connection store must be 'ModelStore'`,
      );
    }
    assertNonNullable(
      connection.class,
      'JSON model connection class is missing',
    );
    assertNonNullable(connection.url, 'JSON model connection data is missing');
    return new JsonModelConnection(
      PackageableElementExplicitReference.create(this.context.graph.modelStore),
      this.context.resolveClass(connection.class),
      connection.url,
    );
  }

  visit_XmlModelConnection(connection: V1_XmlModelConnection): Connection {
    if (connection.store === undefined && this.embeddedConnectionStore) {
      assertType(
        this.embeddedConnectionStore.value,
        ModelStore,
        `Embedded XML model connection store must be 'ModelStore'`,
      );
    } else {
      assertTrue(
        connection.store === undefined || connection.store === MODEL_STORE_NAME,
        `XML model connection store must be 'ModelStore'`,
      );
    }
    assertNonNullable(
      connection.class,
      'XML model connection class is missing',
    );
    assertNonNullable(connection.url, 'XML model connection data is missing');
    return new XmlModelConnection(
      PackageableElementExplicitReference.create(this.context.graph.modelStore),
      this.context.resolveClass(connection.class),
      connection.url,
    );
  }

  visit_FlatDataConnection(connection: V1_FlatDataConnection): Connection {
    const store = !this.embeddedConnectionStore
      ? this.context.resolveFlatDataStore(
          guaranteeNonNullable(
            connection.store,
            'Flat-data connection store is missing',
          ),
        )
      : connection.store
      ? this.context.resolveFlatDataStore(connection.store)
      : ((): PackageableElementReference<FlatData> => {
          assertType(
            this.embeddedConnectionStore.value,
            FlatData,
            'Flat-data connection store must be a flat-data store',
          );
          return this
            .embeddedConnectionStore as PackageableElementReference<FlatData>;
        })();
    assertNonNullable(connection.url, 'Flat-data connection data is missing');
    return new FlatDataConnection(store, connection.url);
  }

  visit_RelationalDatabaseConnection(
    connection: V1_RelationalDatabaseConnection,
  ): Connection {
    const store = !this.embeddedConnectionStore
      ? this.context.resolveDatabase(
          guaranteeNonNullable(
            connection.store,
            'Relational database connection store is missing',
          ),
        )
      : connection.store
      ? this.context.resolveDatabase(connection.store)
      : ((): PackageableElementReference<Database> => {
          assertType(
            this.embeddedConnectionStore.value,
            Database,
            'Relational database connection store must be a database',
          );
          return this
            .embeddedConnectionStore as PackageableElementReference<Database>;
        })();
    assertNonNullable(
      connection.type,
      'Relational database connection type is missing',
    );
    assertNonNullable(
      connection.datasourceSpecification,
      'Relational database connection datasource specification is missing',
    );
    assertNonNullable(
      connection.authenticationStrategy,
      'Relational database connection authentication strategy is missing',
    );
    const val = new RelationalDatabaseConnection(
      store,
      connection.type as unknown as DatabaseType,
      V1_processDatasourceSpecification(
        connection.datasourceSpecification,
        this.context,
      ),
      V1_processAuthenticationStrategy(
        connection.authenticationStrategy,
        this.context,
      ),
    );
    val.timeZone = connection.timeZone;
    val.quoteIdentifiers = connection.quoteIdentifiers;
    val.postProcessors = connection.postProcessors.map((p) =>
      V1_processPostProcessor(p, this.context),
    );
    return val;
  }
}
