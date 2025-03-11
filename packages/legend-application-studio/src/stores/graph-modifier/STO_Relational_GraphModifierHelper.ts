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
  type ApiTokenAuthenticationStrategy,
  type AuthenticationStrategy,
  type BigQueryDatasourceSpecification,
  type BindingTransformer,
  type Database,
  type DatabaseConnection,
  type DatabricksDatasourceSpecification,
  type DatasourceSpecification,
  type DelegatedKerberosAuthenticationStrategy,
  type EmbeddedH2DatasourceSpecification,
  type LocalH2DatasourceSpecification,
  type OAuthAuthenticationStrategy,
  type PropertyMapping,
  type RedshiftDatasourceSpecification,
  type TrinoDatasourceSpecification,
  type RelationalDatabaseConnection,
  type RelationalInputData,
  type RelationalPropertyMapping,
  type RootRelationalInstanceSetImplementation,
  type Schema,
  type SnowflakeDatasourceSpecification,
  type SnowflakePublicAuthenticationStrategy,
  type StaticDatasourceSpecification,
  type UsernamePasswordAuthenticationStrategy,
  type GCPWorkloadIdentityFederationAuthenticationStrategy,
  type MiddleTierUsernamePasswordAuthenticationStrategy,
  type TrinoDelegatedKerberosAuthenticationStrategy,
  type ObserverContext,
  type EnumerationMappingReference,
  type TableAlias,
  type Mapper,
  type PostProcessor,
  type SpannerDatasourceSpecification,
  getRelationalInputType,
  observe_DatasourceSpecification,
  observe_AuthenticationStrategy,
  observe_BindingTransformer,
  observe_PropertyMapping,
  observe_EnumerationMappingReference,
  observe_TableAlias,
  type SchemaNameMapper,
  type MapperPostProcessor,
  observe_PostProcessor,
  observe_Mapper,
} from '@finos/legend-graph';
// Using 'any' type for Filter and Join to avoid import issues
// These are used in the database graph modifier helpers
import { addUniqueEntry, deleteEntry } from '@finos/legend-shared';
import { action } from 'mobx';
import type { RelationalDatabaseConnectionValueState } from '../editor/editor-state/element-editor-state/connection/ConnectionEditorState.js';

// --------------------------------------------- DB Connection -------------------------------------

export const dBConnection_setType = action(
  (con: DatabaseConnection, val: string): void => {
    con.type = val;
  },
);

export const dBConnection_setQuoteIdentifiers = action(
  (con: DatabaseConnection, val: boolean): void => {
    con.quoteIdentifiers = val;
  },
);

export const dBConnection_setQueryTimeOut = action(
  (con: DatabaseConnection, val: number | undefined): void => {
    con.queryTimeOutInSeconds = val;
  },
);

export const relationDbConnection_setLocalMode = action(
  (con: RelationalDatabaseConnection, val: boolean | undefined): void => {
    con.localMode = val;
  },
);

export const relationDbConnection_setDatasourceSpecification = action(
  (
    con: RelationalDatabaseConnection,
    val: DatasourceSpecification,
    context: ObserverContext,
  ): void => {
    con.datasourceSpecification = observe_DatasourceSpecification(val, context);
  },
);

export const relationDbConnection_setNewAuthenticationStrategy = action(
  (
    con: RelationalDatabaseConnection,
    val: AuthenticationStrategy,
    context: ObserverContext,
  ): void => {
    con.authenticationStrategy = observe_AuthenticationStrategy(val, context);
  },
);

// --------------------------------------------- AuthenticationStrategy -------------------------------------

export const delegatedKerberosAuthenticationStrategy_setServerPrincipal =
  action((v: DelegatedKerberosAuthenticationStrategy, val?: string): void => {
    v.serverPrincipal = val;
  });
export const apiTokenAuthenticationStrategy_setApiToken = action(
  (v: ApiTokenAuthenticationStrategy, val: string): void => {
    v.apiToken = val;
  },
);

export const oAuthAuthenticationStrategy_setOauthKey = action(
  (v: OAuthAuthenticationStrategy, val: string): void => {
    v.oauthKey = val;
  },
);

export const oAuthAuthenticationStrategy_setScopeName = action(
  (v: OAuthAuthenticationStrategy, val: string): void => {
    v.scopeName = val;
  },
);
export const snowflakePublicAuthenticationStrategy_setPrivateKeyVaultReference =
  action((v: SnowflakePublicAuthenticationStrategy, val: string): void => {
    v.privateKeyVaultReference = val;
  });

export const snowflakePublicAuthenticationStrategy_setPassPhraseVaultReference =
  action((v: SnowflakePublicAuthenticationStrategy, val: string): void => {
    v.passPhraseVaultReference = val;
  });

export const snowflakePublicAuthenticationStrategy_setPublicUserName = action(
  (v: SnowflakePublicAuthenticationStrategy, val: string): void => {
    v.publicUserName = val;
  },
);
export const usernamePasswordAuthenticationStrategy_setBaseVaultReference =
  action(
    (
      v: UsernamePasswordAuthenticationStrategy,
      val: string | undefined,
    ): void => {
      v.baseVaultReference = val;
    },
  );

export const usernamePasswordAuthenticationStrategy_setUserNameVaultReference =
  action((v: UsernamePasswordAuthenticationStrategy, val: string): void => {
    v.userNameVaultReference = val;
  });

export const usernamePasswordAuthenticationStrategy_setPasswordVaultReference =
  action((v: UsernamePasswordAuthenticationStrategy, val: string): void => {
    v.passwordVaultReference = val;
  });

export const trinoDelegatedKerberosAuthenticationStrategy_setKerberosRemoteServiceName =
  action(
    (v: TrinoDelegatedKerberosAuthenticationStrategy, val: string): void => {
      v.kerberosRemoteServiceName = val;
    },
  );

export const trinoDelegatedKerberosAuthenticationStrategy_setKerberosUseCanonicalHostname =
  action(
    (v: TrinoDelegatedKerberosAuthenticationStrategy, val: boolean): void => {
      v.kerberosUseCanonicalHostname = val;
    },
  );

export const gcpWorkloadIdentityFederationAuthenticationStrategy_setServiceAccountEmail =
  action(
    (
      v: GCPWorkloadIdentityFederationAuthenticationStrategy,
      val: string,
    ): void => {
      v.serviceAccountEmail = val;
    },
  );

export const gcpWorkloadIdentityFederationAuthenticationStrategy_setAdditionalGcpScopes =
  action(
    (
      v: GCPWorkloadIdentityFederationAuthenticationStrategy,
      val: string[],
    ): void => {
      v.additionalGcpScopes = val;
    },
  );

export const middleTierUsernamePasswordAuthenticationStrategy_setVaultReference =
  action(
    (
      v: MiddleTierUsernamePasswordAuthenticationStrategy,
      val: string,
    ): void => {
      v.vaultReference = val;
    },
  );
// --------------------------------------------- DatasourceSpecification -------------------------------------
export const staticDatasourceSpecification_setHost = action(
  (v: StaticDatasourceSpecification, val: string): void => {
    v.host = val;
  },
);

export const staticDatasourceSpecification_setPort = action(
  (v: StaticDatasourceSpecification, val: number): void => {
    v.port = val;
  },
);

export const staticDatasourceSpecification_setDatabaseName = action(
  (v: StaticDatasourceSpecification, val: string): void => {
    v.databaseName = val;
  },
);
export const databricksDatasourceSpecification_setHostName = action(
  (v: DatabricksDatasourceSpecification, val: string): void => {
    v.hostname = val;
  },
);

export const databricksDatasourceSpecification_setPort = action(
  (v: DatabricksDatasourceSpecification, val: string): void => {
    v.port = val;
  },
);

export const databricksDatasourceSpecification_setProtocol = action(
  (v: DatabricksDatasourceSpecification, val: string): void => {
    v.protocol = val;
  },
);

export const databricksDatasourceSpecification_setHttpPath = action(
  (v: DatabricksDatasourceSpecification, val: string): void => {
    v.httpPath = val;
  },
);

export const embeddedH2DatasourceSpecification_setDatabaseName = action(
  (v: EmbeddedH2DatasourceSpecification, val: string): void => {
    v.databaseName = val;
  },
);

export const embeddedH2DatasourceSpecification_setDirectory = action(
  (v: EmbeddedH2DatasourceSpecification, val: string): void => {
    v.directory = val;
  },
);

export const embeddedH2DatasourceSpecification_setAutoServerMode = action(
  (v: EmbeddedH2DatasourceSpecification, val: boolean): void => {
    v.autoServerMode = val;
  },
);
export const localH2DatasourceSpecification_setTestDataSetupSqls = action(
  (v: LocalH2DatasourceSpecification, val: string[]): void => {
    v.testDataSetupSqls = val;
  },
);

export const localH2DatasourceSpecification_setTestDataSetupCsv = action(
  (v: LocalH2DatasourceSpecification, val: string): void => {
    v.testDataSetupCsv = val;
  },
);
export const snowflakeDatasourceSpec_setTempTableDb = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.tempTableDb = val;
  },
);

export const snowflakeDatasourceSpec_setTempTableSchema = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.tempTableSchema = val;
  },
);

export const snowflakeDatasourceSpec_setAccountName = action(
  (spec: SnowflakeDatasourceSpecification, val: string): void => {
    spec.accountName = val;
  },
);

export const snowflakeDatasourceSpec_setRegion = action(
  (spec: SnowflakeDatasourceSpecification, val: string): void => {
    spec.region = val;
  },
);

export const snowflakeDatasourceSpec_setWarehouseName = action(
  (spec: SnowflakeDatasourceSpecification, val: string): void => {
    spec.warehouseName = val;
  },
);

export const snowflakeDatasourceSpec_setDatabaseName = action(
  (spec: SnowflakeDatasourceSpecification, val: string): void => {
    spec.databaseName = val;
  },
);

export const snowflakeDatasourceSpec_setCloudType = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.cloudType = val;
  },
);

export const snowflakeDatasourceSpec_setQuotedIdentifiersIgnoreCase = action(
  (spec: SnowflakeDatasourceSpecification, val: boolean | undefined): void => {
    spec.quotedIdentifiersIgnoreCase = val;
  },
);

export const snowflakeDatasourceSpec_setEnableQueryTags = action(
  (spec: SnowflakeDatasourceSpecification, val: boolean | undefined): void => {
    spec.enableQueryTags = val;
  },
);

export const snowflakeDatasourceSpec_setProxyHost = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.proxyHost = val;
  },
);

export const snowflakeDatasourceSpec_setProxyPort = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.proxyPort = val;
  },
);

export const snowflakeDatasourceSpec_setNonProxyHosts = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.nonProxyHosts = val;
  },
);

export const snowflakeDatasourceSpec_setOrganization = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.organization = val;
  },
);

export const snowflakeDatasourceSpec_setAccountType = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.accountType = val;
  },
);

export const snowflakeDatasourceSpec_setRole = action(
  (spec: SnowflakeDatasourceSpecification, val: string | undefined): void => {
    spec.role = val;
  },
);

export const redshiftDatasourceSpecification_setDatabaseName = action(
  (spec: RedshiftDatasourceSpecification, val: string): void => {
    spec.databaseName = val;
  },
);

export const redshiftDatasourceSpecification_setEndpointURL = action(
  (spec: RedshiftDatasourceSpecification, val: string): void => {
    spec.endpointURL = val;
  },
);

export const redshiftDatasourceSpecification_setPort = action(
  (spec: RedshiftDatasourceSpecification, val: number): void => {
    spec.port = val;
  },
);
export const redshiftDatasourceSpecification_setRegion = action(
  (spec: RedshiftDatasourceSpecification, val: string): void => {
    spec.region = val;
  },
);

export const redshiftDatasourceSpecification_setHost = action(
  (spec: RedshiftDatasourceSpecification, val: string): void => {
    spec.host = val;
  },
);

export const redshiftDatasourceSpecification_setClusterID = action(
  (spec: RedshiftDatasourceSpecification, val: string): void => {
    spec.clusterID = val;
  },
);
export const bigQueryDatasourceSpecification_setProjectId = action(
  (spec: BigQueryDatasourceSpecification, val: string): void => {
    spec.projectId = val;
  },
);
export const bigQueryDatasourceSpecification_setDefaultDataset = action(
  (spec: BigQueryDatasourceSpecification, val: string): void => {
    spec.defaultDataset = val;
  },
);
export const bigQueryDatasourceSpecification_setProxyHost = action(
  (spec: BigQueryDatasourceSpecification, val: string | undefined): void => {
    spec.proxyHost = val;
  },
);
export const bigQueryDatasourceSpecification_setProxyPort = action(
  (spec: BigQueryDatasourceSpecification, val: string | undefined): void => {
    spec.proxyPort = val;
  },
);
export const spannerDatasourceSpecification_setProjectId = action(
  (spec: SpannerDatasourceSpecification, val: string): void => {
    spec.projectId = val;
  },
);
export const spannerDatasourceSpecification_setInstanceId = action(
  (spec: SpannerDatasourceSpecification, val: string): void => {
    spec.instanceId = val;
  },
);
export const spannerDatasourceSpecification_setDatabaseId = action(
  (spec: SpannerDatasourceSpecification, val: string): void => {
    spec.databaseId = val;
  },
);
export const spannerDatasourceSpecification_setProxyHost = action(
  (spec: SpannerDatasourceSpecification, val: string | undefined): void => {
    spec.proxyHost = val;
  },
);
export const spannerDatasourceSpecification_setProxyPort = action(
  (spec: SpannerDatasourceSpecification, val: string | undefined): void => {
    spec.proxyPort = val;
  },
);

export const trinoDatasourceSpecification_setHost = action(
  (spec: TrinoDatasourceSpecification, val: string): void => {
    spec.host = val;
  },
);

export const trinoDatasourceSpecification_setPort = action(
  (spec: TrinoDatasourceSpecification, val: number): void => {
    spec.port = val;
  },
);

export const trinoDatasourceSpecification_setCatalog = action(
  (spec: TrinoDatasourceSpecification, val: string | undefined): void => {
    spec.catalog = val;
  },
);

export const trinoDatasourceSpecification_setSchema = action(
  (spec: TrinoDatasourceSpecification, val: string | undefined): void => {
    spec.schema = val;
  },
);

export const trinoDatasourceSpecification_setClientTags = action(
  (spec: TrinoDatasourceSpecification, val: string | undefined): void => {
    spec.clientTags = val;
  },
);

export const trinoDatasourceSpecification_setSsl = action(
  (spec: TrinoDatasourceSpecification, val: boolean): void => {
    spec.sslSpecification.ssl = val;
  },
);

export const trinoDatasourceSpecification_setTrustStorePathVaultReference =
  action(
    (spec: TrinoDatasourceSpecification, val: string | undefined): void => {
      spec.sslSpecification.trustStorePathVaultReference = val;
    },
  );

export const trinoDatasourceSpecification_setTrustStorePasswordVaultReference =
  action(
    (spec: TrinoDatasourceSpecification, val: string | undefined): void => {
      spec.sslSpecification.trustStorePasswordVaultReference = val;
    },
  );

export const relationalInputData_setData = action(
  (input: RelationalInputData, value: string): void => {
    input.data = value;
  },
);

export const relationalInputData_setInputType = action(
  (input: RelationalInputData, value: string): void => {
    input.inputType = getRelationalInputType(value);
  },
);

export const relationalPropertyMapping_setTransformer = action(
  (
    v: RelationalPropertyMapping,
    value: EnumerationMappingReference | undefined,
  ): void => {
    v.transformer = value
      ? observe_EnumerationMappingReference(value)
      : undefined;
  },
);
export const relationalPropertyMapping_setBindingTransformer = action(
  (
    v: RelationalPropertyMapping,
    value: BindingTransformer | undefined,
  ): void => {
    v.bindingTransformer = value
      ? observe_BindingTransformer(value)
      : undefined;
  },
);

export const rootRelationalSetImp_setMainTableAlias = action(
  (v: RootRelationalInstanceSetImplementation, value: TableAlias): void => {
    v.mainTableAlias = observe_TableAlias(value);
  },
);

export const rootRelationalSetImp_setPropertyMappings = action(
  (
    v: RootRelationalInstanceSetImplementation,
    value: PropertyMapping[],
    observeContext: ObserverContext,
  ): void => {
    v.propertyMappings = value.map((pm) =>
      observe_PropertyMapping(pm, observeContext),
    );
  },
);

// --------------------------------------------- Post-Processor -------------------------------------

export const relationalDatabaseConnection_addPostProcessor = action(
  (
    connectionValueState: RelationalDatabaseConnectionValueState,
    postProcessor: PostProcessor,
    observerContext: ObserverContext,
  ): void => {
    addUniqueEntry(
      connectionValueState.connection.postProcessors,
      observe_PostProcessor(postProcessor, observerContext),
    );
  },
);

export const relationalDatabaseConnection_deletePostProcessor = action(
  (
    connectionValueState: RelationalDatabaseConnectionValueState,
    postProcessor: PostProcessor,
  ): void => {
    deleteEntry(connectionValueState.connection.postProcessors, postProcessor);
  },
);

export const mapperPostProcessor_addMapper = action(
  (mapperPostProcessor: MapperPostProcessor, mapper: Mapper): void => {
    addUniqueEntry(mapperPostProcessor.mappers, observe_Mapper(mapper));
  },
);

export const mapper_setFrom = action((mapper: Mapper, val: string): void => {
  mapper.from = val;
});

export const mapper_setTo = action((mapper: Mapper, val: string): void => {
  mapper.to = val;
});

export const schemaNameMapper_setTo = action(
  (schemaNameMapper: SchemaNameMapper, val: string): void => {
    schemaNameMapper.to = val;
  },
);

export const schemaNameMapper_setFrom = action(
  (schemaNameMapper: SchemaNameMapper, val: string): void => {
    schemaNameMapper.from = val;
  },
);

export const mapperPostProcessor_deleteMapper = action(
  (mapperPostProcessor: MapperPostProcessor, val: Mapper): void => {
    deleteEntry(mapperPostProcessor.mappers, val);
  },
);
// --------------------------------------------- Database -------------------------------------

export const database_setName = action(
  (database: Database, name: string): void => {
    database.name = name;
  },
);

export const database_addSchema = action(
  (database: Database, schema: Schema): void => {
    addUniqueEntry(database.schemas, schema);
  },
);

export const database_removeSchema = action(
  (database: Database, schema: Schema): void => {
    deleteEntry(database.schemas, schema);
  },
);

export const database_addJoin = action(
  (database: Database, join: unknown): void => {
    addUniqueEntry(database.joins, join);
  },
);

export const database_removeJoin = action(
  (database: Database, join: unknown): void => {
    deleteEntry(database.joins, join);
  },
);

export const database_addFilter = action(
  (database: Database, filter: unknown): void => {
    addUniqueEntry(database.filters, filter);
  },
);

export const database_removeFilter = action(
  (database: Database, filter: unknown): void => {
    deleteEntry(database.filters, filter);
  },
);
