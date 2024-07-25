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
} from '@finos/legend-shared';
import type { PackageableConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import {
  ConnectionPointer,
  type Connection,
  type ConnectionVisitor,
} from '../../../../../../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import type { JsonModelConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/JsonModelConnection.js';
import type { XmlModelConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/XmlModelConnection.js';
import type { FlatDataConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/connection/FlatDataConnection.js';
import type { RelationalDatabaseConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection.js';
import {
  type AuthenticationStrategy,
  DefaultH2AuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  GCPApplicationDefaultCredentialsAuthenticationStrategy,
  ApiTokenAuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  UsernamePasswordAuthenticationStrategy,
  GCPWorkloadIdentityFederationAuthenticationStrategy,
  MiddleTierUsernamePasswordAuthenticationStrategy,
  TrinoDelegatedKerberosAuthenticationStrategy,
} from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/AuthenticationStrategy.js';
import {
  type DatasourceSpecification,
  LocalH2DatasourceSpecification,
  StaticDatasourceSpecification,
  EmbeddedH2DatasourceSpecification,
  DatabricksDatasourceSpecification,
  SnowflakeDatasourceSpecification,
  RedshiftDatasourceSpecification,
  BigQueryDatasourceSpecification,
  SpannerDatasourceSpecification,
  TrinoDatasourceSpecification,
} from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/DatasourceSpecification.js';
import type { ModelChainConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/ModelChainConnection.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection.js';
import {
  type V1_DatasourceSpecification,
  V1_LocalH2DataSourceSpecification,
  V1_EmbeddedH2DatasourceSpecification,
  V1_SnowflakeDatasourceSpecification,
  V1_BigQueryDatasourceSpecification,
  V1_DatabricksDatasourceSpecification,
  V1_StaticDatasourceSpecification,
  V1_RedshiftDatasourceSpecification,
  V1_SpannerDatasourceSpecification,
  V1_TrinoDatasourceSpecification,
  V1_TrinoSslSpecification,
} from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification.js';
import {
  type V1_AuthenticationStrategy,
  V1_DefaultH2AuthenticationStrategy,
  V1_SnowflakePublicAuthenticationStrategy,
  V1_GCPApplicationDefaultCredentialsAuthenticationStrategy,
  V1_UsernamePasswordAuthenticationStrategy,
  V1_ApiTokenAuthenticationStrategy,
  V1_DelegatedKerberosAuthenticationStrategy,
  V1_OAuthAuthenticationStrategy,
  V1_GCPWorkloadIdentityFederationAuthenticationStrategy,
  V1_MiddleTierUsernamePasswordAuthenticationStrategy,
  V1_TrinoDelegatedKerberosAuthenticationStrategy,
} from '../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy.js';
import type { V1_Connection } from '../../../model/packageableElements/connection/V1_Connection.js';
import { V1_RelationalDatabaseConnection } from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection.js';
import { V1_ConnectionPointer } from '../../../model/packageableElements/connection/V1_ConnectionPointer.js';
import { V1_JsonModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection.js';
import { V1_XmlModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection.js';
import { V1_FlatDataConnection } from '../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection.js';
import { V1_ModelChainConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection.js';
import { V1_transformPostProcessor } from './V1_PostProcessorTransformer.js';
import type { STO_Relational_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/STO_Relational_PureProtocolProcessorPlugin_Extension.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import { V1_INTERNAL__UnknownConnection } from '../../../model/packageableElements/connection/V1_INTERNAL__UnknownConnection.js';
import type { INTERNAL__UnknownConnection } from '../../../../../../../graph/metamodel/pure/packageableElements/connection/INTERNAL__UnknownConnection.js';
import { INTERNAL__UnknownDatasourceSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/INTERNAL__UnknownDatasourceSpecification.js';
import { INTERNAL__UnknownAuthenticationStrategy } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/INTERNAL__UnknownAuthenticationStrategy.js';
import { V1_INTERNAL__UnknownDatasourceSpecification } from '../../../model/packageableElements/store/relational/connection/V1_INTERNAL__UnknownDatasourceSpecification.js';
import { V1_INTERNAL__UnknownAuthenticationStrategy } from '../../../model/packageableElements/store/relational/connection/V1_INTERNAL__UnknownAuthenticationStrategy.js';

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

const transformDatabricksDatasourceSpecification = (
  metamodel: DatabricksDatasourceSpecification,
): V1_DatabricksDatasourceSpecification => {
  const source = new V1_DatabricksDatasourceSpecification();
  source.hostname = metamodel.hostname;
  source.port = metamodel.port;
  source.protocol = metamodel.protocol;
  source.httpPath = metamodel.httpPath;
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
  source.enableQueryTags = metamodel.enableQueryTags;
  source.proxyHost = metamodel.proxyHost;
  source.proxyPort = metamodel.proxyPort;
  source.nonProxyHosts = metamodel.nonProxyHosts;
  source.organization = metamodel.organization;
  source.accountType = metamodel.accountType;
  source.role = metamodel.role;
  source.tempTableDb = metamodel.tempTableDb;
  source.tempTableSchema = metamodel.tempTableSchema;
  return source;
};

const transformRedshiftDatasourceSpecification = (
  metamodel: RedshiftDatasourceSpecification,
): V1_RedshiftDatasourceSpecification => {
  const source = new V1_RedshiftDatasourceSpecification();
  source.databaseName = metamodel.databaseName;
  source.endpointURL = metamodel.endpointURL;
  source.port = metamodel.port;
  source.clusterID = metamodel.clusterID;
  source.host = metamodel.host;
  source.region = metamodel.region;
  return source;
};

const transformBigQueryDatasourceSpecification = (
  metamodel: BigQueryDatasourceSpecification,
): V1_BigQueryDatasourceSpecification => {
  const source = new V1_BigQueryDatasourceSpecification();
  source.projectId = metamodel.projectId;
  source.defaultDataset = metamodel.defaultDataset;
  source.proxyHost = metamodel.proxyHost;
  source.proxyPort = metamodel.proxyPort;
  return source;
};

const transformSpannerDatasourceSpecification = (
  metamodel: SpannerDatasourceSpecification,
): V1_SpannerDatasourceSpecification => {
  const source = new V1_SpannerDatasourceSpecification();
  source.projectId = metamodel.projectId;
  source.instanceId = metamodel.instanceId;
  source.databaseId = metamodel.databaseId;
  source.proxyHost = metamodel.proxyHost;
  source.proxyPort = metamodel.proxyPort;
  return source;
};

const transformTrinoDatasourceSpecification = (
  metamodel: TrinoDatasourceSpecification,
): V1_TrinoDatasourceSpecification => {
  const source = new V1_TrinoDatasourceSpecification();
  source.host = metamodel.host;
  source.port = metamodel.port;
  source.catalog = metamodel.catalog;
  source.schema = metamodel.schema;
  source.clientTags = metamodel.clientTags;
  const sslSpecification = new V1_TrinoSslSpecification();
  sslSpecification.ssl = metamodel.sslSpecification.ssl;
  sslSpecification.trustStorePathVaultReference =
    metamodel.sslSpecification.trustStorePathVaultReference;
  sslSpecification.trustStorePasswordVaultReference =
    metamodel.sslSpecification.trustStorePasswordVaultReference;
  source.sslSpecification = sslSpecification;
  return source;
};

const transformDatasourceSpecification = (
  metamodel: DatasourceSpecification,
  context: V1_GraphTransformerContext,
): V1_DatasourceSpecification => {
  if (metamodel instanceof INTERNAL__UnknownDatasourceSpecification) {
    const protocol = new V1_INTERNAL__UnknownDatasourceSpecification();
    protocol.content = metamodel.content;
    return protocol;
  } else if (metamodel instanceof StaticDatasourceSpecification) {
    return transformStaticDatasourceSpecification(metamodel);
  } else if (metamodel instanceof EmbeddedH2DatasourceSpecification) {
    return transformEmbeddedH2DatasourceSpecification(metamodel);
  } else if (metamodel instanceof DatabricksDatasourceSpecification) {
    return transformDatabricksDatasourceSpecification(metamodel);
  } else if (metamodel instanceof SnowflakeDatasourceSpecification) {
    return transformSnowflakeDatasourceSpecification(metamodel);
  } else if (metamodel instanceof BigQueryDatasourceSpecification) {
    return transformBigQueryDatasourceSpecification(metamodel);
  } else if (metamodel instanceof SpannerDatasourceSpecification) {
    return transformSpannerDatasourceSpecification(metamodel);
  } else if (metamodel instanceof LocalH2DatasourceSpecification) {
    const protocol = new V1_LocalH2DataSourceSpecification();
    protocol.testDataSetupCsv = metamodel.testDataSetupCsv;
    protocol.testDataSetupSqls = metamodel.testDataSetupSqls;
    return protocol;
  } else if (metamodel instanceof RedshiftDatasourceSpecification) {
    return transformRedshiftDatasourceSpecification(metamodel);
  } else if (metamodel instanceof TrinoDatasourceSpecification) {
    return transformTrinoDatasourceSpecification(metamodel);
  }
  const extraConnectionDatasourceSpecificationTransformers =
    context.plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
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
  if (metamodel instanceof INTERNAL__UnknownAuthenticationStrategy) {
    const protocol = new V1_INTERNAL__UnknownAuthenticationStrategy();
    protocol.content = metamodel.content;
    return protocol;
  } else if (metamodel instanceof DefaultH2AuthenticationStrategy) {
    return new V1_DefaultH2AuthenticationStrategy();
  } else if (metamodel instanceof DelegatedKerberosAuthenticationStrategy) {
    const auth = new V1_DelegatedKerberosAuthenticationStrategy();
    auth.serverPrincipal = metamodel.serverPrincipal;
    return auth;
  } else if (metamodel instanceof OAuthAuthenticationStrategy) {
    return transformOAuthtAuthenticationStrategy(metamodel);
  } else if (metamodel instanceof ApiTokenAuthenticationStrategy) {
    const auth = new V1_ApiTokenAuthenticationStrategy();
    auth.apiToken = metamodel.apiToken;
    return auth;
  } else if (metamodel instanceof SnowflakePublicAuthenticationStrategy) {
    const auth = new V1_SnowflakePublicAuthenticationStrategy();
    auth.privateKeyVaultReference = metamodel.privateKeyVaultReference;
    auth.passPhraseVaultReference = metamodel.passPhraseVaultReference;
    auth.publicUserName = metamodel.publicUserName;
    return auth;
  } else if (
    metamodel instanceof GCPApplicationDefaultCredentialsAuthenticationStrategy
  ) {
    const auth =
      new V1_GCPApplicationDefaultCredentialsAuthenticationStrategy();
    return auth;
  } else if (
    metamodel instanceof GCPWorkloadIdentityFederationAuthenticationStrategy
  ) {
    const auth = new V1_GCPWorkloadIdentityFederationAuthenticationStrategy();
    auth.serviceAccountEmail = metamodel.serviceAccountEmail;
    auth.additionalGcpScopes = metamodel.additionalGcpScopes;
    return auth;
  } else if (metamodel instanceof UsernamePasswordAuthenticationStrategy) {
    const auth = new V1_UsernamePasswordAuthenticationStrategy();
    auth.baseVaultReference = metamodel.baseVaultReference;
    auth.userNameVaultReference = metamodel.userNameVaultReference;
    auth.passwordVaultReference = metamodel.passwordVaultReference;
    return auth;
  } else if (
    metamodel instanceof MiddleTierUsernamePasswordAuthenticationStrategy
  ) {
    const auth = new V1_MiddleTierUsernamePasswordAuthenticationStrategy();
    auth.vaultReference = metamodel.vaultReference;
    return auth;
  } else if (
    metamodel instanceof TrinoDelegatedKerberosAuthenticationStrategy
  ) {
    const auth = new V1_TrinoDelegatedKerberosAuthenticationStrategy();
    auth.kerberosRemoteServiceName = metamodel.kerberosRemoteServiceName;
    auth.kerberosUseCanonicalHostname = metamodel.kerberosUseCanonicalHostname;
    return auth;
  }
  const extraConnectionAuthenticationStrategyTransformers =
    context.plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
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
  connection.store = metamodel.store.valueForSerialization ?? '';
  connection.authenticationStrategy = transformAuthenticationStrategy(
    metamodel.authenticationStrategy,
    context,
  );
  connection.datasourceSpecification = transformDatasourceSpecification(
    metamodel.datasourceSpecification,
    context,
  );
  connection.localMode = metamodel.localMode;
  connection.type = metamodel.type;
  connection.databaseType = connection.type;
  connection.timeZone = metamodel.timeZone;
  connection.quoteIdentifiers = metamodel.quoteIdentifiers;
  if (metamodel.postProcessors.length) {
    connection.postProcessors = metamodel.postProcessors.map((postprocessor) =>
      V1_transformPostProcessor(postprocessor, context),
    );
  }
  return connection;
};

export const V1_transformConnectionPointer = (
  metamodel: ConnectionPointer,
): V1_ConnectionPointer => {
  const connection = new V1_ConnectionPointer();
  connection.connection =
    metamodel.packageableConnection.valueForSerialization ?? '';
  return connection;
};

const transformModelChainConnection = (
  element: ModelChainConnection,
): V1_ModelChainConnection => {
  const connection = new V1_ModelChainConnection();
  connection.store = element.store.valueForSerialization;
  connection.mappings = element.mappings.map(
    (mapping) => mapping.valueForSerialization ?? '',
  );
  return connection;
};

const transformJsonModelConnection = (
  element: JsonModelConnection,
): V1_JsonModelConnection => {
  const connection = new V1_JsonModelConnection();
  connection.class = element.class.valueForSerialization ?? '';
  connection.store = element.store.valueForSerialization;
  connection.url = element.url;
  return connection;
};

const transformXmlModelConnection = (
  element: XmlModelConnection,
): V1_XmlModelConnection => {
  const connection = new V1_XmlModelConnection();
  connection.class = element.class.valueForSerialization ?? '';
  connection.store = element.store.valueForSerialization;
  connection.url = element.url;
  return connection;
};

const transformFlatDataConnection = (
  element: FlatDataConnection,
): V1_FlatDataConnection => {
  const connection = new V1_FlatDataConnection();
  connection.store = element.store.valueForSerialization ?? '';
  connection.url = element.url;
  return connection;
};

class ConnectionTransformer implements ConnectionVisitor<V1_Connection> {
  context: V1_GraphTransformerContext;

  constructor(context: V1_GraphTransformerContext) {
    this.context = context;
  }

  visit_Connection(connection: Connection): V1_Connection {
    const extraConnectionTransformers = this.context.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionTransformers?.() ?? [],
    );
    for (const transformer of extraConnectionTransformers) {
      const connectionProtocol = transformer(connection, this.context);
      if (connectionProtocol) {
        return connectionProtocol;
      }
    }
    throw new UnsupportedOperationError(
      `Can't transform connection: no compatible transformer available from plugins`,
      connection,
    );
  }

  visit_INTERNAL__UnknownConnection(
    connection: INTERNAL__UnknownConnection,
  ): V1_Connection {
    const protocol = new V1_INTERNAL__UnknownConnection();
    protocol.store = connection.store?.valueForSerialization;
    protocol.content = connection.content;
    return protocol;
  }

  visit_ConnectionPointer(connection: ConnectionPointer): V1_Connection {
    return V1_transformConnectionPointer(connection);
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
