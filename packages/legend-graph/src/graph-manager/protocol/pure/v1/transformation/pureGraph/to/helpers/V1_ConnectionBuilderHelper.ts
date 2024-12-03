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
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type DatabaseType,
  RelationalDatabaseConnection,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection.js';
import {
  type Connection,
  ConnectionPointer,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import { JsonModelConnection } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/JsonModelConnection.js';
import { XmlModelConnection } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/XmlModelConnection.js';
import { FlatDataConnection } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/connection/FlatDataConnection.js';
import { Store } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/Store.js';
import { FlatData } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import { Database } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import { ModelStore } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/model/ModelStore.js';
import {
  type PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { ModelChainConnection } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/ModelChainConnection.js';
import type { V1_GraphBuilderContext } from '../V1_GraphBuilderContext.js';
import type {
  V1_Connection,
  V1_ConnectionVisitor,
} from '../../../../model/packageableElements/connection/V1_Connection.js';
import type { V1_JsonModelConnection } from '../../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection.js';
import type { V1_XmlModelConnection } from '../../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection.js';
import type { V1_FlatDataConnection } from '../../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection.js';
import type { V1_ConnectionPointer } from '../../../../model/packageableElements/connection/V1_ConnectionPointer.js';
import type { V1_RelationalDatabaseConnection } from '../../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection.js';
import {
  V1_buildDatasourceSpecification,
  V1_buildAuthenticationStrategy,
} from './V1_RelationalConnectionBuilderHelper.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import type { V1_ModelChainConnection } from '../../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection.js';
import { V1_buildPostProcessor } from './V1_PostProcessorBuilderHelper.js';
import type { V1_INTERNAL__UnknownConnection } from '../../../../model/packageableElements/connection/V1_INTERNAL__UnknownConnection.js';
import { INTERNAL__UnknownConnection } from '../../../../../../../../graph/metamodel/pure/packageableElements/connection/INTERNAL__UnknownConnection.js';

class V1_ConnectionBuilder implements V1_ConnectionVisitor<Connection> {
  context: V1_GraphBuilderContext;
  embeddedConnectionStore?: PackageableElementReference<Store> | undefined;

  constructor(
    context: V1_GraphBuilderContext,
    embeddedConnectionStore?: PackageableElementReference<Store>,
  ) {
    this.context = context;
    this.embeddedConnectionStore = embeddedConnectionStore;
  }

  visit_Connection(connection: V1_Connection): Connection {
    const extraConnectionBuilders = this.context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionBuilders?.() ?? [],
    );
    for (const builder of extraConnectionBuilders) {
      const store = this.embeddedConnectionStore;
      const extraConnection = builder(connection, this.context, store);
      if (extraConnection) {
        return extraConnection;
      }
    }
    throw new UnsupportedOperationError(
      `Can't build connection: no compatible builder available from plugins`,
      connection,
    );
  }

  visit_INTERNAL__UnknownConnection(
    connection: V1_INTERNAL__UnknownConnection,
  ): Connection {
    const metamodel = new INTERNAL__UnknownConnection(
      !this.embeddedConnectionStore
        ? connection.store
          ? this.context.resolveStore(connection.store)
          : undefined
        : connection.store
          ? this.context.resolveStore(connection.store)
          : ((): PackageableElementReference<Store> => {
              if (this.embeddedConnectionStore.value instanceof Store) {
                return this.embeddedConnectionStore;
              }
              throw new Error(`Connection store must be a store`);
            })(),
    );
    metamodel.content = connection.content;
    return metamodel;
  }

  visit_ConnectionPointer(connection: V1_ConnectionPointer): Connection {
    assertNonNullable(
      connection.connection,
      `Connection pointer 'connection' field is missing`,
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
        `Embedded model chain connection store must be 'ModelStore'`,
      );
    } else {
      assertTrue(
        connection.store === undefined || connection.store === ModelStore.NAME,
        `Model chain connection store must be 'ModelStore'`,
      );
    }
    const modelConnection = new ModelChainConnection(
      PackageableElementImplicitReference.create(
        ModelStore.INSTANCE,
        connection.store,
      ),
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
        connection.store === undefined || connection.store === ModelStore.NAME,
        `JSON model connection store must be 'ModelStore'`,
      );
    }
    assertNonNullable(
      connection.class,
      `JSON model connection 'class' field is missing`,
    );
    assertNonNullable(
      connection.url,
      `JSON model connection 'url' field is missing`,
    );
    return new JsonModelConnection(
      PackageableElementImplicitReference.create(
        ModelStore.INSTANCE,
        connection.store,
      ),
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
        connection.store === undefined || connection.store === ModelStore.NAME,
        `XML model connection store must be 'ModelStore'`,
      );
    }
    assertNonNullable(
      connection.class,
      `XML model connection 'class' field is missing`,
    );
    assertNonNullable(
      connection.url,
      `XML model connection 'url' field is missing`,
    );
    return new XmlModelConnection(
      PackageableElementImplicitReference.create(
        ModelStore.INSTANCE,
        connection.store,
      ),
      this.context.resolveClass(connection.class),
      connection.url,
    );
  }

  visit_FlatDataConnection(connection: V1_FlatDataConnection): Connection {
    const store = !this.embeddedConnectionStore
      ? this.context.resolveFlatDataStore(
          guaranteeNonNullable(
            connection.store,
            `Flat-data connection 'store' field is missing`,
          ),
        )
      : connection.store
        ? this.context.resolveFlatDataStore(connection.store)
        : ((): PackageableElementReference<FlatData> => {
            assertType(
              this.embeddedConnectionStore.value,
              FlatData,
              `Flat-data connection store must be a flat-data store`,
            );
            return this
              .embeddedConnectionStore as PackageableElementReference<FlatData>;
          })();
    assertNonNullable(
      connection.url,
      `Flat-data connection 'url' field is missing`,
    );
    return new FlatDataConnection(store, connection.url);
  }

  visit_RelationalDatabaseConnection(
    connection: V1_RelationalDatabaseConnection,
  ): Connection {
    const store = !this.embeddedConnectionStore
      ? this.context.resolveDatabase(
          guaranteeNonNullable(
            connection.store,
            `Relational database connection 'store' field is missing`,
          ),
        )
      : connection.store
        ? this.context.resolveDatabase(connection.store)
        : ((): PackageableElementReference<Database> => {
            assertType(
              this.embeddedConnectionStore.value,
              Database,
              `Relational database connection store must be a database`,
            );
            return this
              .embeddedConnectionStore as PackageableElementReference<Database>;
          })();
    assertNonNullable(
      connection.type,
      `Relational database connection 'type' field is missing`,
    );
    assertNonNullable(
      connection.datasourceSpecification,
      `Relational database connection 'datasourceSpecification' field is missing`,
    );
    assertNonNullable(
      connection.authenticationStrategy,
      `Relational database connection 'authenticationStrategy' field is missing`,
    );
    const val = new RelationalDatabaseConnection(
      store,
      // TODO: create a function to validate this is of the type we support
      connection.type as unknown as DatabaseType,
      V1_buildDatasourceSpecification(
        connection.datasourceSpecification,
        this.context,
      ),
      V1_buildAuthenticationStrategy(
        connection.authenticationStrategy,
        this.context,
      ),
    );
    val.localMode = connection.localMode;
    val.timeZone = connection.timeZone;
    val.quoteIdentifiers = connection.quoteIdentifiers;
    val.queryTimeOutInSeconds = connection.queryTimeOutInSeconds;
    val.postProcessors = connection.postProcessors.map((p) =>
      V1_buildPostProcessor(p, this.context),
    );
    val.postProcessorWithParameter = connection.postProcessorWithParameter;
    return val;
  }
}

export const V1_buildConnection = (
  connection: V1_Connection,
  context: V1_GraphBuilderContext,
  embeddedConnectionStore?: PackageableElementReference<Store> | undefined,
): Connection =>
  connection.accept_ConnectionVisitor(
    new V1_ConnectionBuilder(context, embeddedConnectionStore),
  );
