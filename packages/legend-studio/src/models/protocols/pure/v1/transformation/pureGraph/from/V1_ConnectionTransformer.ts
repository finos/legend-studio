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
  SnowflakePublicAuthenticationStrategy,
  GCPApplicationDefaultCredentialsAuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  TestDatabaseAuthenticationStrategy,
  UserPasswordAuthenticationStrategy,
  OAuthAuthenticationStrategy,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import type { DatasourceSpecification } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import {
  LocalH2DatasourceSpecification,
  StaticDatasourceSpecification,
  EmbeddedH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
  RedshiftDatasourceSpecification,
  BigQueryDatasourceSpecification,
} from '../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import type { ModelChainConnection } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/connection/ModelChainConnection';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './V1_CoreTransformerHelper';
import { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_DatasourceSpecification } from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import {
  V1_LocalH2DataSourceSpecification,
  V1_EmbeddedH2DatasourceSpecification,
  V1_SnowflakeDatasourceSpecification,
  V1_BigQueryDatasourceSpecification,
  V1_StaticDatasourceSpecification,
  V1_RedshiftDatasourceSpecification,
} from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import type { V1_AuthenticationStrategy } from '../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import {
  V1_DefaultH2AuthenticationStrategy,
  V1_SnowflakePublicAuthenticationStrategy,
  V1_UserPasswordAuthenticationStrategy,
  V1_GCPApplicationDefaultCredentialsAuthenticationStrategy,
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
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext';

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
  source.cloudType = metamodel.cloudType;
  source.quotedIdentifiersIgnoreCase = metamodel.quotedIdentifiersIgnoreCase;
  return source;
};

const transformRedshiftDatasourceSpecification = (
  metamodel: RedshiftDatasourceSpecification,
): V1_RedshiftDatasourceSpecification => {
  const source = new V1_RedshiftDatasourceSpecification();
  source.databaseName = metamodel.databaseName;
  source.endpoint = metamodel.endpoint;
  source.port = metamodel.port;
  return source;
};

const transformBigQueryDatasourceSpecification = (
  metamodel: BigQueryDatasourceSpecification,
): V1_BigQueryDatasourceSpecification => {
  const source = new V1_BigQueryDatasourceSpecification();
  source.projectId = metamodel.projectId;
  source.defaultDataset = metamodel.defaultDataset;
  return source;
};

const transformDatasourceSpecification = (
  metamodel: DatasourceSpecification,
  context: V1_GraphTransformerContext,
): V1_DatasourceSpecification => {
  if (metamodel instanceof StaticDatasourceSpecification) {
    return transformStaticDatasourceSpecification(metamodel);
  } else if (metamodel instanceof EmbeddedH2DatasourceSpecification) {
    return transformEmbeddedH2DatasourceSpecification(metamodel);
  } else if (metamodel instanceof SnowflakeDatasourceSpecification) {
    return transformSnowflakeDatasourceSpecification(metamodel);
  } else if (metamodel instanceof BigQueryDatasourceSpecification) {
    return transformBigQueryDatasourceSpecification(metamodel);
  } else if (metamodel instanceof LocalH2DatasourceSpecification) {
    const protocol = new V1_LocalH2DataSourceSpecification();
    protocol.testDataSetupCsv = metamodel.testDataSetupCsv;
    protocol.testDataSetupSqls = metamodel.testDataSetupSqls;
    return protocol;
  } else if (metamodel instanceof RedshiftDatasourceSpecification) {
    return transformRedshiftDatasourceSpecification(metamodel);
  }
  const extraConnectionDatasourceSpecificationTransformers =
    context.plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionDatasourceSpecificationTransformers?.() ?? [],
    );
  for (const transformer of extraConnectionDatasourceSpecificationTransformers) {
    const protocol = transformer(metamodel, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform datasource specification: no compatible transformer available from plugins`,
    metamodel,
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
  context: V1_GraphTransformerContext,
): V1_AuthenticationStrategy => {
  if (metamodel instanceof DefaultH2AuthenticationStrategy) {
    return new V1_DefaultH2AuthenticationStrategy();
  } else if (metamodel instanceof DelegatedKerberosAuthenticationStrategy) {
    const auth = new V1_DelegatedKerberosAuthenticationStrategy();
    auth.serverPrincipal = metamodel.serverPrincipal;
    return auth;
  } else if (metamodel instanceof TestDatabaseAuthenticationStrategy) {
    return new V1_TestDatabaseAuthenticationStrategy();
  } else if (metamodel instanceof OAuthAuthenticationStrategy) {
    return transformOAuthtAuthenticationStrategy(metamodel);
  } else if (metamodel instanceof SnowflakePublicAuthenticationStrategy) {
    const auth = new V1_SnowflakePublicAuthenticationStrategy();
    auth.privateKeyVaultReference = metamodel.privateKeyVaultReference;
    auth.passPhraseVaultReference = metamodel.passPhraseVaultReference;
    auth.publicUserName = metamodel.publicUserName;
    return auth;
  } else if (metamodel instanceof UserPasswordAuthenticationStrategy) {
    const auth = new V1_UserPasswordAuthenticationStrategy();
    auth.userName = metamodel.userName;
    auth.passwordVaultReference = metamodel.passwordVaultReference;
    return auth;
  } else if (
    metamodel instanceof GCPApplicationDefaultCredentialsAuthenticationStrategy
  ) {
    const auth =
      new V1_GCPApplicationDefaultCredentialsAuthenticationStrategy();
    return auth;
  }
  const extraConnectionAuthenticationStrategyTransformers =
    context.plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionAuthenticationStrategyTransformers?.() ?? [],
    );
  for (const transformer of extraConnectionAuthenticationStrategyTransformers) {
    const protocol = transformer(metamodel, context);
    if (protocol) {
      return protocol;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform authentication strategy: no compatible transformer available from plugins`,
    metamodel,
  );
};

export const V1_transformRelationalDatabaseConnection = (
  metamodel: RelationalDatabaseConnection,
  context: V1_GraphTransformerContext,
): V1_RelationalDatabaseConnection => {
  const connection = new V1_RelationalDatabaseConnection();
  connection.store = V1_transformElementReference(metamodel.store);
  connection.authenticationStrategy = transformAuthenticationStrategy(
    metamodel.authenticationStrategy,
    context,
  );
  connection.datasourceSpecification = transformDatasourceSpecification(
    metamodel.datasourceSpecification,
    context,
  );
  connection.type = metamodel.type as unknown as V1_DatabaseType;
  connection.timeZone = metamodel.timeZone;
  connection.quoteIdentifiers = metamodel.quoteIdentifiers;
  if (metamodel.postProcessors.length) {
    connection.postProcessors = metamodel.postProcessors.map((postprocessor) =>
      V1_transformPostProcessor(postprocessor, context),
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
  connection.store = undefined; // @MARKER: GRAMMAR ROUNDTRIP --- omit this information during protocol transformation as it can be interpreted while building the graph
  connection.mappings = element.mappings.map(V1_transformElementReference);
  return connection;
};

const transformJsonModelConnection = (
  element: JsonModelConnection,
): V1_JsonModelConnection => {
  const connection = new V1_JsonModelConnection();
  connection.class = V1_transformElementReference(element.class);
  connection.store = undefined; // @MARKER: GRAMMAR ROUNDTRIP --- omit this information during protocol transformation as it can be interpreted while building the graph
  connection.url = element.url;
  return connection;
};

const transformXmlModelConnection = (
  element: XmlModelConnection,
): V1_XmlModelConnection => {
  const connection = new V1_XmlModelConnection();
  connection.class = V1_transformElementReference(element.class);
  connection.store = undefined; // @MARKER: GRAMMAR ROUNDTRIP --- omit this information during protocol transformation as it can be interpreted while building the graph
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
  context: V1_GraphTransformerContext;

  constructor(context: V1_GraphTransformerContext) {
    this.context = context;
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
    return V1_transformRelationalDatabaseConnection(connection, this.context);
  }
}

export const V1_transformConnection = (
  value: Connection,
  allowPointer: boolean,
  context: V1_GraphTransformerContext,
): V1_Connection => {
  if (value instanceof ConnectionPointer && !allowPointer) {
    throw new IllegalStateError(
      'Packageable connection value cannot be a connection pointer',
    );
  }
  return value.accept_ConnectionVisitor(new ConnectionTransformer(context));
};

export const V1_transformPackageableConnection = (
  element: PackageableConnection,
  context: V1_GraphTransformerContext,
): V1_PackageableConnection => {
  const connection = new V1_PackageableConnection();
  V1_initPackageableElement(connection, element);
  connection.connectionValue = element.connectionValue.accept_ConnectionVisitor(
    new ConnectionTransformer(context),
  );
  return connection;
};
