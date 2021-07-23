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
  assertNonEmptyString,
  UnsupportedOperationError,
  assertNonNullable,
  guaranteeNonEmptyString,
} from '@finos/legend-studio-shared';
import type { DatasourceSpecification } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import {
  LocalH2DatasourceSpecification,
  StaticDatasourceSpecification,
  EmbeddedH2DatasourceSpecification,
  SnowflakeDatasourceSpecification,
  RedshiftDatasourceSpecification,
  BigQueryDatasourceSpecification,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import type { AuthenticationStrategy } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import {
  SnowflakePublicAuthenticationStrategy,
  GCPApplicationDefaultCredentialsAuthenticationStrategy,
  OAuthAuthenticationStrategy,
  DefaultH2AuthenticationStrategy,
  DelegatedKerberosAuthenticationStrategy,
  TestDatabaseAuthenticationStrategy,
  UserPasswordAuthenticationStrategy,
} from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_DatasourceSpecification } from '../../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import {
  V1_LocalH2DataSourceSpecification,
  V1_StaticDatasourceSpecification,
  V1_EmbeddedH2DatasourceSpecification,
  V1_SnowflakeDatasourceSpecification,
  V1_RedshiftDatasourceSpecification,
  V1_BigQueryDatasourceSpecification,
} from '../../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import type { V1_AuthenticationStrategy } from '../../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import {
  V1_SnowflakePublicAuthenticationStrategy,
  V1_GCPApplicationDefaultCredentialsAuthenticationStrategy,
  V1_OAuthAuthenticationStrategy,
  V1_DefaultH2AuthenticationStrategy,
  V1_DelegatedKerberosAuthenticationStrategy,
  V1_TestDatabaseAuthenticationStrategy,
  V1_UserPasswordAuthenticationStrategy,
} from '../../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';

export const V1_buildDatasourceSpecification = (
  protocol: V1_DatasourceSpecification,
  context: V1_GraphBuilderContext,
): DatasourceSpecification => {
  if (protocol instanceof V1_StaticDatasourceSpecification) {
    assertNonEmptyString(
      protocol.host,
      'Static datasource specification host is missing',
    );
    assertNonEmptyString(
      protocol.databaseName,
      'Static datasource specification database is missing',
    );
    assertNonNullable(
      protocol.port,
      'Static datasource specification port is missing',
    );
    const staticSpec = new StaticDatasourceSpecification(
      protocol.host,
      protocol.port,
      protocol.databaseName,
    );
    return staticSpec;
  } else if (protocol instanceof V1_EmbeddedH2DatasourceSpecification) {
    assertNonEmptyString(
      protocol.databaseName,
      'Embedded H2 datasource specification databaseName is missing',
    );
    assertNonEmptyString(
      protocol.directory,
      'Embedded H2 datasource specification directory is missing',
    );
    assertNonNullable(
      protocol.autoServerMode,
      'Embedded H2 datasource specification autoServerMode is missing',
    );
    const embeddedSpec = new EmbeddedH2DatasourceSpecification(
      protocol.databaseName,
      protocol.directory,
      protocol.autoServerMode,
    );
    return embeddedSpec;
  } else if (protocol instanceof V1_SnowflakeDatasourceSpecification) {
    assertNonEmptyString(
      protocol.accountName,
      'Snowflake datasource specification property is missing',
    );
    assertNonEmptyString(
      protocol.region,
      'Snowflake datasource specification region is missing',
    );
    assertNonEmptyString(
      protocol.warehouseName,
      'Snowflake datasource specification warehouseName is missing',
    );
    assertNonNullable(
      protocol.databaseName,
      'Snowflake datasource specification databaseName is missing',
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
    return snowflakeSpec;
  } else if (protocol instanceof V1_BigQueryDatasourceSpecification) {
    assertNonEmptyString(
      protocol.projectId,
      'BigQuery datasource specification property project ID is missing',
    );
    const bigQuerySpec = new BigQueryDatasourceSpecification(
      protocol.projectId,
      protocol.defaultDataset,
    );
    return bigQuerySpec;
  } else if (protocol instanceof V1_LocalH2DataSourceSpecification) {
    const metamodel = new LocalH2DatasourceSpecification();
    metamodel.testDataSetupCsv = protocol.testDataSetupCsv;
    metamodel.testDataSetupSqls = protocol.testDataSetupSqls;
    return metamodel;
  } else if (protocol instanceof V1_RedshiftDatasourceSpecification) {
    assertNonEmptyString(
      protocol.databaseName,
      'Redshift datasource specification databaseName is missing',
    );
    assertNonEmptyString(
      protocol.endpoint,
      'Redshift datasource specification endpoint is missing',
    );
    assertNonNullable(
      protocol.port,
      'Redshift datasource specification port is missing',
    );
    const redshiftSpec = new RedshiftDatasourceSpecification(
      protocol.databaseName,
      protocol.endpoint,
      protocol.port,
    );
    return redshiftSpec;
  }
  const extraConnectionDatasourceSpecificationBuilders =
    context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
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
  if (protocol instanceof V1_DefaultH2AuthenticationStrategy) {
    return new DefaultH2AuthenticationStrategy();
  } else if (protocol instanceof V1_DelegatedKerberosAuthenticationStrategy) {
    const metamodel = new DelegatedKerberosAuthenticationStrategy();
    metamodel.serverPrincipal = protocol.serverPrincipal;
    return metamodel;
  } else if (protocol instanceof V1_SnowflakePublicAuthenticationStrategy) {
    assertNonEmptyString(
      protocol.privateKeyVaultReference,
      'Snowflake public authentication strategy private key vault reference is missing or empty',
    );
    assertNonEmptyString(
      protocol.passPhraseVaultReference,
      'Snowflake public authentication strategy pass phrase vault reference is missing or empty',
    );
    assertNonEmptyString(
      protocol.publicUserName,
      'Snowflake public authentication user name is missing or empty',
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
  } else if (protocol instanceof V1_TestDatabaseAuthenticationStrategy) {
    return new TestDatabaseAuthenticationStrategy();
  } else if (protocol instanceof V1_OAuthAuthenticationStrategy) {
    return new OAuthAuthenticationStrategy(
      guaranteeNonEmptyString(
        protocol.oauthKey,
        `OAuth authentication specification 'oauthKey' field is missing or empty`,
      ),
      guaranteeNonEmptyString(
        protocol.scopeName,
        `OAuth authentication specification 'scopeName' field is missing or empty`,
      ),
    );
  } else if (protocol instanceof V1_UserPasswordAuthenticationStrategy) {
    assertNonEmptyString(
      protocol.userName,
      'User password authentication strategy userName is missing or empty',
    );
    assertNonEmptyString(
      protocol.passwordVaultReference,
      'User password authentication strategy passwordVaultReference is missing or empty',
    );
    return new UserPasswordAuthenticationStrategy(
      protocol.userName,
      protocol.passwordVaultReference,
    );
  }
  const extraConnectionAuthenticationStrategyBuilders =
    context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as StoreRelational_PureProtocolProcessorPlugin_Extension
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
