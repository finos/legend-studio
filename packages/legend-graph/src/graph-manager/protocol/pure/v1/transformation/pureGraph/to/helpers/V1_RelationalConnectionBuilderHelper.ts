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
  UnsupportedOperationError,
  assertNonNullable,
  assertIsString,
  guaranteeIsString,
} from '@finos/legend-shared';
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
  TrinoSslSpecification,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/DatasourceSpecification.js';
import {
  type AuthenticationStrategy,
  SnowflakePublicAuthenticationStrategy,
  GCPApplicationDefaultCredentialsAuthenticationStrategy,
  UsernamePasswordAuthenticationStrategy,
  ApiTokenAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  DefaultH2AuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  GCPWorkloadIdentityFederationAuthenticationStrategy,
  MiddleTierUsernamePasswordAuthenticationStrategy,
  TrinoDelegatedKerberosAuthenticationStrategy,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/AuthenticationStrategy.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import {
  type V1_DatasourceSpecification,
  V1_LocalH2DataSourceSpecification,
  V1_StaticDatasourceSpecification,
  V1_EmbeddedH2DatasourceSpecification,
  V1_DatabricksDatasourceSpecification,
  V1_SnowflakeDatasourceSpecification,
  V1_RedshiftDatasourceSpecification,
  V1_BigQueryDatasourceSpecification,
  V1_SpannerDatasourceSpecification,
  V1_TrinoDatasourceSpecification,
} from '../../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification.js';
import {
  type V1_AuthenticationStrategy,
  V1_SnowflakePublicAuthenticationStrategy,
  V1_GCPApplicationDefaultCredentialsAuthenticationStrategy,
  V1_OAuthAuthenticationStrategy,
  V1_DefaultH2AuthenticationStrategy,
  V1_ApiTokenAuthenticationStrategy,
  V1_DelegatedKerberosAuthenticationStrategy,
  V1_UsernamePasswordAuthenticationStrategy,
  V1_GCPWorkloadIdentityFederationAuthenticationStrategy,
  V1_MiddleTierUsernamePasswordAuthenticationStrategy,
  V1_TrinoDelegatedKerberosAuthenticationStrategy,
} from '../../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy.js';
import type { STO_Relational_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/STO_Relational_PureProtocolProcessorPlugin_Extension.js';
import { INTERNAL__UnknownDatasourceSpecification } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/INTERNAL__UnknownDatasourceSpecification.js';
import { INTERNAL__UnknownAuthenticationStrategy } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/connection/INTERNAL__UnknownAuthenticationStrategy.js';
import { V1_INTERNAL__UnknownDatasourceSpecification } from '../../../../model/packageableElements/store/relational/connection/V1_INTERNAL__UnknownDatasourceSpecification.js';
import { V1_INTERNAL__UnknownAuthenticationStrategy } from '../../../../model/packageableElements/store/relational/connection/V1_INTERNAL__UnknownAuthenticationStrategy.js';

export const V1_buildDatasourceSpecification = (
  protocol: V1_DatasourceSpecification,
  context: V1_GraphBuilderContext,
): DatasourceSpecification => {
  if (protocol instanceof V1_INTERNAL__UnknownDatasourceSpecification) {
    const metamodel = new INTERNAL__UnknownDatasourceSpecification();
    metamodel.content = protocol.content;
    return metamodel;
  } else if (protocol instanceof V1_StaticDatasourceSpecification) {
    assertIsString(
      protocol.host,
      `Static datasource specification 'host' field is missing or empty`,
    );
    assertIsString(
      protocol.databaseName,
      `Static datasource specification 'databaseName' field is missing or empty`,
    );
    assertNonNullable(
      protocol.port,
      `Static datasource specification 'port' field is missing`,
    );
    const staticSpec = new StaticDatasourceSpecification(
      protocol.host,
      protocol.port,
      protocol.databaseName,
    );
    return staticSpec;
  } else if (protocol instanceof V1_EmbeddedH2DatasourceSpecification) {
    assertIsString(
      protocol.databaseName,
      `Embedded H2 datasource specification 'databaseName' field is missing or empty`,
    );
    assertIsString(
      protocol.directory,
      `Embedded H2 datasource specification 'directory' field is missing or empty`,
    );
    assertNonNullable(
      protocol.autoServerMode,
      `Embedded H2 datasource specification 'autoServerMode' field is missing or empty`,
    );
    const embeddedSpec = new EmbeddedH2DatasourceSpecification(
      protocol.databaseName,
      protocol.directory,
      protocol.autoServerMode,
    );
    return embeddedSpec;
  } else if (protocol instanceof V1_DatabricksDatasourceSpecification) {
    assertIsString(
      protocol.hostname,
      'Databricks hostname specification is missing',
    );
    assertIsString(protocol.port, 'Databricks port specification is missing');
    assertIsString(
      protocol.protocol,
      'Databricks protocol specification is missing',
    );
    assertIsString(
      protocol.httpPath,
      'Databricks httpPath specification is missing',
    );
    const databricksSpec = new DatabricksDatasourceSpecification(
      protocol.hostname,
      protocol.port,
      protocol.protocol,
      protocol.httpPath,
    );
    return databricksSpec;
  } else if (protocol instanceof V1_SnowflakeDatasourceSpecification) {
    assertIsString(
      protocol.accountName,
      `Snowflake datasource specification 'accountName' field is missing or empty`,
    );
    assertIsString(
      protocol.region,
      `Snowflake datasource specification 'region' field is missing or empty`,
    );
    assertIsString(
      protocol.warehouseName,
      `Snowflake datasource specification 'warehouseName' field is missing or empty`,
    );
    assertIsString(
      protocol.databaseName,
      `Snowflake datasource specification 'databaseName' field is missing`,
    );
    const snowflakeSpec = new SnowflakeDatasourceSpecification(
      protocol.accountName,
      protocol.region,
      protocol.warehouseName,
      protocol.databaseName,
    );
    snowflakeSpec.cloudType = protocol.cloudType;
    snowflakeSpec.quotedIdentifiersIgnoreCase =
      protocol.quotedIdentifiersIgnoreCase;
    snowflakeSpec.enableQueryTags = protocol.enableQueryTags;
    snowflakeSpec.proxyHost = protocol.proxyHost;
    snowflakeSpec.proxyPort = protocol.proxyPort;
    snowflakeSpec.nonProxyHosts = protocol.nonProxyHosts;
    snowflakeSpec.organization = protocol.organization;
    snowflakeSpec.accountType = protocol.accountType;
    snowflakeSpec.role = protocol.role;
    snowflakeSpec.tempTableDb = protocol.tempTableDb;
    snowflakeSpec.tempTableSchema = protocol.tempTableSchema;
    return snowflakeSpec;
  } else if (protocol instanceof V1_BigQueryDatasourceSpecification) {
    assertIsString(
      protocol.projectId,
      `BigQuery datasource specification 'projectId' field is missing or empty`,
    );
    const bigQuerySpec = new BigQueryDatasourceSpecification(
      protocol.projectId,
      protocol.defaultDataset,
    );
    bigQuerySpec.proxyHost = protocol.proxyHost;
    bigQuerySpec.proxyPort = protocol.proxyPort;
    return bigQuerySpec;
  } else if (protocol instanceof V1_LocalH2DataSourceSpecification) {
    const metamodel = new LocalH2DatasourceSpecification();
    metamodel.testDataSetupCsv = protocol.testDataSetupCsv;
    metamodel.testDataSetupSqls = protocol.testDataSetupSqls;
    return metamodel;
  } else if (protocol instanceof V1_RedshiftDatasourceSpecification) {
    assertIsString(
      protocol.databaseName,
      `Redshift datasource specification 'databaseName' field is missing or empty`,
    );
    assertIsString(
      protocol.host,
      `Redshift datasource specification 'host' field is missing or empty`,
    );
    assertIsString(
      protocol.port.toString(),
      `Redshift datasource specification 'port' field is missing or empty`,
    );
    assertIsString(
      protocol.clusterID,
      `Redshift datasource specification 'clusterID' field is missing or empty`,
    );

    assertIsString(
      protocol.region,
      `Redshift datasource specification 'region' field is missing or empty`,
    );

    const redshiftSpec = new RedshiftDatasourceSpecification(
      protocol.databaseName,
      protocol.endpointURL,
      protocol.port,
      protocol.host,
      protocol.clusterID,
      protocol.region,
    );
    return redshiftSpec;
  } else if (protocol instanceof V1_SpannerDatasourceSpecification) {
    assertIsString(
      protocol.projectId,
      `Spanner datasource specification 'projectId' field is missing or empty`,
    );
    assertIsString(
      protocol.instanceId,
      `Spanner datasource specification 'instanceId' field is missing or empty`,
    );
    assertIsString(
      protocol.databaseId,
      `Spanner datasource specification 'databaseId' field is missing or empty`,
    );

    const spannerSpec = new SpannerDatasourceSpecification(
      protocol.projectId,
      protocol.instanceId,
      protocol.databaseId,
      protocol.proxyHost,
      protocol.proxyPort,
    );
    return spannerSpec;
  } else if (protocol instanceof V1_TrinoDatasourceSpecification) {
    assertIsString(
      protocol.host,
      `Trino datasource specification 'host' field is missing or empty`,
    );
    assertNonNullable(
      protocol.port,
      `Trino datasource specification 'port' field is missing or empty`,
    );
    assertNonNullable(
      protocol.sslSpecification.ssl,
      `Trino datasource specification 'ssl' field is missing or empty`,
    );
    const sslSpecification = new TrinoSslSpecification(
      protocol.sslSpecification.ssl,
    );
    sslSpecification.trustStorePathVaultReference =
      protocol.sslSpecification.trustStorePathVaultReference;
    sslSpecification.trustStorePasswordVaultReference =
      protocol.sslSpecification.trustStorePasswordVaultReference;
    const trinoSpec = new TrinoDatasourceSpecification(
      protocol.host,
      protocol.port,
      sslSpecification,
    );
    trinoSpec.catalog = protocol.catalog;
    trinoSpec.schema = protocol.schema;
    trinoSpec.clientTags = protocol.clientTags;
    return trinoSpec;
  }
  const extraConnectionDatasourceSpecificationBuilders =
    context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionDatasourceSpecificationBuilders?.() ?? [],
    );
  for (const builder of extraConnectionDatasourceSpecificationBuilders) {
    const datasourceSpec = builder(protocol, context);
    if (datasourceSpec) {
      return datasourceSpec;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build datasource specification: no compatible builder available from plugins`,
    protocol,
  );
};

export const V1_buildAuthenticationStrategy = (
  protocol: V1_AuthenticationStrategy,
  context: V1_GraphBuilderContext,
): AuthenticationStrategy => {
  if (protocol instanceof V1_INTERNAL__UnknownAuthenticationStrategy) {
    const metamodel = new INTERNAL__UnknownAuthenticationStrategy();
    metamodel.content = protocol.content;
    return metamodel;
  } else if (protocol instanceof V1_DefaultH2AuthenticationStrategy) {
    return new DefaultH2AuthenticationStrategy();
  } else if (protocol instanceof V1_DelegatedKerberosAuthenticationStrategy) {
    const metamodel = new DelegatedKerberosAuthenticationStrategy();
    metamodel.serverPrincipal = protocol.serverPrincipal;
    return metamodel;
  } else if (protocol instanceof V1_ApiTokenAuthenticationStrategy) {
    assertIsString(protocol.apiToken, 'API token is missing or empty');
    return new ApiTokenAuthenticationStrategy(protocol.apiToken);
  } else if (protocol instanceof V1_SnowflakePublicAuthenticationStrategy) {
    assertIsString(
      protocol.privateKeyVaultReference,
      `Snowflake public authentication strategy 'privateKeyVaultReference' field is missing or empty`,
    );
    assertIsString(
      protocol.passPhraseVaultReference,
      `Snowflake public authentication strategy 'passPhraseVaultReference' field is missing or empty`,
    );
    assertIsString(
      protocol.publicUserName,
      `Snowflake public authentication 'publicUserName' field is missing or empty`,
    );
    return new SnowflakePublicAuthenticationStrategy(
      protocol.privateKeyVaultReference,
      protocol.passPhraseVaultReference,
      protocol.publicUserName,
    );
  } else if (
    protocol instanceof
    V1_GCPApplicationDefaultCredentialsAuthenticationStrategy
  ) {
    return new GCPApplicationDefaultCredentialsAuthenticationStrategy();
  } else if (
    protocol instanceof V1_GCPWorkloadIdentityFederationAuthenticationStrategy
  ) {
    assertIsString(
      protocol.serviceAccountEmail,
      `GCPWorkloadIdentityFederation 'serviceAccountEmail' field is missing or empty`,
    );
    return new GCPWorkloadIdentityFederationAuthenticationStrategy(
      protocol.serviceAccountEmail,
      protocol.additionalGcpScopes,
    );
  } else if (protocol instanceof V1_OAuthAuthenticationStrategy) {
    return new OAuthAuthenticationStrategy(
      guaranteeIsString(
        protocol.oauthKey,
        `OAuth authentication specification 'oauthKey' field is missing or empty`,
      ),
      guaranteeIsString(
        protocol.scopeName,
        `OAuth authentication specification 'scopeName' field is missing or empty`,
      ),
    );
  } else if (protocol instanceof V1_UsernamePasswordAuthenticationStrategy) {
    assertIsString(
      protocol.userNameVaultReference,
      `Username password authentication strategy 'userNameVaultReference' field is missing or empty`,
    );
    assertIsString(
      protocol.passwordVaultReference,
      `Username password authentication strategy 'passwordVaultReference' field is missing or empty`,
    );

    const metamodel = new UsernamePasswordAuthenticationStrategy(
      protocol.userNameVaultReference,
      protocol.passwordVaultReference,
    );
    metamodel.baseVaultReference = protocol.baseVaultReference;
    return metamodel;
  } else if (
    protocol instanceof V1_MiddleTierUsernamePasswordAuthenticationStrategy
  ) {
    assertIsString(
      protocol.vaultReference,
      `Middle Tier Username password authentication strategy 'vaultReference' field is missing or empty`,
    );

    return new MiddleTierUsernamePasswordAuthenticationStrategy(
      protocol.vaultReference,
    );
  } else if (
    protocol instanceof V1_TrinoDelegatedKerberosAuthenticationStrategy
  ) {
    assertIsString(
      protocol.kerberosRemoteServiceName,
      `Trino delegated kerberos authentication strategy 'kerberosRemoteServiceName' field is missing or empty`,
    );

    return new TrinoDelegatedKerberosAuthenticationStrategy(
      protocol.kerberosRemoteServiceName,
      protocol.kerberosUseCanonicalHostname,
    );
  }

  const extraConnectionAuthenticationStrategyBuilders =
    context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as STO_Relational_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraConnectionAuthenticationStrategyBuilders?.() ?? [],
    );
  for (const builder of extraConnectionAuthenticationStrategyBuilders) {
    const authStrategy = builder(protocol, context);
    if (authStrategy) {
      return authStrategy;
    }
  }
  throw new UnsupportedOperationError(
    `Can't build authentication strategy`,
    protocol,
  );
};
