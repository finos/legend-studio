/**
 * Copyright Goldman Sachs
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
  getClass,
  IllegalStateError,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { PackageableConnection } from '../../../../../../metamodels/pure/model/packageableElements/connection/PackageableConnection';
import type {
  Connection,
  ConnectionVisitor,
} from '../../../../../../metamodels/pure/model/packageableElements/connection/Connection';
import { ConnectionPointer } from '../../../../../../metamodels/pure/model/packageableElements/connection/Connection';
import type { JsonModelConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import type { XmlModelConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import type { FlatDataConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import type { RelationalDatabaseConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import type { AuthenticationStrategy } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import {
  DefaultH2AuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  TestDatabaseAuthenticationStrategy,
  OAuthAuthenticationStrategy,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import type { DatasourceSpecification } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import {
  StaticDatasourceSpecification,
  EmbeddedH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import type { ModelChainConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/connection/ModelChainConnection';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_DatasourceSpecification } from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import {
  V1_EmbeddedH2DatasourceSpecification,
  V1_SnowflakeDatasourceSpecification,
  V1_StaticDatasourceSpecification,
} from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import type { V1_AuthenticationStrategy } from '../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import {
  V1_DefaultH2AuthenticationStrategy,
  V1_DelegatedKerberosAuthenticationStrategy,
  V1_TestDatabaseAuthenticationStrategy,
  V1_OAuthAuthenticationStrategy,
} from '../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import type { V1_Connection } from '../../../model/packageableElements/connection/V1_Connection';
import type { V1_DatabaseType } from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection';
import { V1_RelationalDatabaseConnection } from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection';
import { V1_ConnectionPointer } from '../../../model/packageableElements/connection/V1_ConnectionPointer';
import { V1_JsonModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection';
import { V1_XmlModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection';
import { V1_FlatDataConnection } from '../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection';
import { V1_ModelChainConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection';
import { V1_transformPostProcessor } from './V1_PostProcessorTransformer';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';

const transformStaticDatasourceSpecification = (
  metamodel: StaticDatasourceSpecification,
): V1_StaticDatasourceSpecification => {
  const source = new V1_StaticDatasourceSpecification();
  source.host = metamodel.host;
  source.port = metamodel.port;
  source.databaseName = metamodel.databaseName;
  return source;
};

const transformEmbeddedH2DatasourceSpecification = (
  metamodel: EmbeddedH2DatasourceSpecification,
): V1_EmbeddedH2DatasourceSpecification => {
  const source = new V1_EmbeddedH2DatasourceSpecification();
  source.databaseName = metamodel.databaseName;
  source.directory = metamodel.directory;
  source.autoServerMode = metamodel.autoServerMode;
  return source;
};

const transformSnowflakeDatasourceSpecification = (
  metamodel: SnowflakeDatasourceSpecification,
): V1_SnowflakeDatasourceSpecification => {
  const source = new V1_SnowflakeDatasourceSpecification();
  source.region = metamodel.region;
  source.warehouseName = metamodel.warehouseName;
  source.databaseName = metamodel.databaseName;
  source.accountName = metamodel.accountName;
  return source;
};

const transformDatasourceSpecification = (
  metamodel: DatasourceSpecification,
  plugins: PureProtocolProcessorPlugin[],
): V1_DatasourceSpecification => {
  if (metamodel instanceof StaticDatasourceSpecification) {
    return transformStaticDatasourceSpecification(metamodel);
  } else if (metamodel instanceof EmbeddedH2DatasourceSpecification) {
    return transformEmbeddedH2DatasourceSpecification(metamodel);
  } else if (metamodel instanceof SnowflakeDatasourceSpecification) {
    return transformSnowflakeDatasourceSpecification(metamodel);
  }
  const extraConnectionDatasourceSpecificationTransformers = plugins.flatMap(
    (plugin) =>
      (plugin as StoreRelational_PureProtocolProcessorPlugin_Extension).V1_getExtraConnectionDatasourceSpecificationTransformers?.() ??
      [],
  );
  for (const transformer of extraConnectionDatasourceSpecificationTransformers) {
    const protocol = transformer(metamodel);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform datasource specification of type '${
      getClass(metamodel).name
    }'. No compatible transformer available from plugins.`,
  );
};

const transformOAuthtAuthenticationStrategy = (
  metamodel: OAuthAuthenticationStrategy,
): V1_OAuthAuthenticationStrategy => {
  const auth = new V1_OAuthAuthenticationStrategy();
  auth.oauthKey = metamodel.oauthKey;
  auth.scopeName = metamodel.scopeName;
  return auth;
};

const transformAuthenticationStrategy = (
  metamodel: AuthenticationStrategy,
  plugins: PureProtocolProcessorPlugin[],
): V1_AuthenticationStrategy => {
  if (metamodel instanceof DefaultH2AuthenticationStrategy) {
    const authenication = new V1_DefaultH2AuthenticationStrategy();
    return authenication;
  } else if (metamodel instanceof DelegatedKerberosAuthenticationStrategy) {
    const auth = new V1_DelegatedKerberosAuthenticationStrategy();
    auth.serverPrincipal = metamodel.serverPrincipal;
    return auth;
  } else if (metamodel instanceof TestDatabaseAuthenticationStrategy) {
    const auth = new V1_TestDatabaseAuthenticationStrategy();
    return auth;
  } else if (metamodel instanceof OAuthAuthenticationStrategy) {
    return transformOAuthtAuthenticationStrategy(metamodel);
  }
  const extraConnectionAuthenticationStrategyTransformers = plugins.flatMap(
    (plugin) =>
      (plugin as StoreRelational_PureProtocolProcessorPlugin_Extension).V1_getExtraConnectionAuthenticationStrategyTransformers?.() ??
      [],
  );
  for (const transformer of extraConnectionAuthenticationStrategyTransformers) {
    const protocol = transformer(metamodel);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform authentication strategy of type '${
      getClass(metamodel).name
    }'. No compatible transformer available from plugins.`,
  );
};

const transformRelationalDatabaseConnection = (
  metamodel: RelationalDatabaseConnection,
  plugins: PureProtocolProcessorPlugin[],
): V1_RelationalDatabaseConnection => {
  const connection = new V1_RelationalDatabaseConnection();
  connection.store = V1_transformElementReference(metamodel.store);
  connection.authenticationStrategy = transformAuthenticationStrategy(
    metamodel.authenticationStrategy,
    plugins,
  );
  connection.datasourceSpecification = transformDatasourceSpecification(
    metamodel.datasourceSpecification,
    plugins,
  );
  connection.type = (metamodel.type as unknown) as V1_DatabaseType;
  connection.timeZone = metamodel.timeZone;
  if (metamodel.postProcessors.length) {
    connection.postProcessors = metamodel.postProcessors.map((postprocessor) =>
      V1_transformPostProcessor(postprocessor, plugins),
    );
  }
  return connection;
};

const transformConnectionPointer = (
  metamodel: ConnectionPointer,
): V1_ConnectionPointer => {
  const connection = new V1_ConnectionPointer();
  connection.connection = V1_transformElementReference(
    metamodel.packageableConnection,
  );
  return connection;
};

const transformModelChainConnection = (
  element: ModelChainConnection,
): V1_ModelChainConnection => {
  const connection = new V1_ModelChainConnection();
  connection.store = V1_transformElementReference(element.store);
  connection.mappings = element.mappings.map(V1_transformElementReference);
  return connection;
};

const transformJsonModelConnection = (
  element: JsonModelConnection,
): V1_JsonModelConnection => {
  const connection = new V1_JsonModelConnection();
  connection.class = V1_transformElementReference(element.class);
  connection.store = V1_transformElementReference(element.store);
  connection.url = element.url;
  return connection;
};

const transformXmlModelConnection = (
  element: XmlModelConnection,
): V1_XmlModelConnection => {
  const connection = new V1_XmlModelConnection();
  connection.class = V1_transformElementReference(element.class);
  connection.store = V1_transformElementReference(element.store);
  connection.url = element.url;
  return connection;
};

const transformFlatDataConnection = (
  element: FlatDataConnection,
): V1_FlatDataConnection => {
  const connection = new V1_FlatDataConnection();
  connection.store = V1_transformElementReference(element.store);
  connection.url = element.url;
  return connection;
};

class ConnectionTransformer implements ConnectionVisitor<V1_Connection> {
  plugins: PureProtocolProcessorPlugin[] = [];

  constructor(plugins: PureProtocolProcessorPlugin[]) {
    this.plugins = plugins;
  }

  visit_ConnectionPointer(connection: ConnectionPointer): V1_Connection {
    return transformConnectionPointer(connection);
  }

  visit_ModelChainConnection(connection: ModelChainConnection): V1_Connection {
    return transformModelChainConnection(connection);
  }

  visit_JsonModelConnection(connection: JsonModelConnection): V1_Connection {
    return transformJsonModelConnection(connection);
  }

  visit_XmlModelConnection(connection: XmlModelConnection): V1_Connection {
    return transformXmlModelConnection(connection);
  }

  visit_FlatDataConnection(connection: FlatDataConnection): V1_Connection {
    return transformFlatDataConnection(connection);
  }

  visit_RelationalDatabaseConnection(
    connection: RelationalDatabaseConnection,
  ): V1_Connection {
    return transformRelationalDatabaseConnection(connection, this.plugins);
  }
}

export const V1_transformConnection = (
  value: Connection,
  allowPointer: boolean,
  plugins: PureProtocolProcessorPlugin[],
): V1_Connection => {
  if (value instanceof ConnectionPointer && !allowPointer) {
    throw new IllegalStateError(
      'Packageable connection value cannot be a connection pointer',
    );
  }
  return value.accept_ConnectionVisitor(new ConnectionTransformer(plugins));
};

export const V1_transformPackageableConnection = (
  element: PackageableConnection,
  plugins: PureProtocolProcessorPlugin[],
): V1_PackageableConnection => {
  const connection = new V1_PackageableConnection();
  V1_initPackageableElement(connection, element);
  connection.connectionValue = element.connectionValue.accept_ConnectionVisitor(
    new ConnectionTransformer(plugins),
  );
  return connection;
};
