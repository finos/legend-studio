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
  type DatabaseConnection,
  type DatabaseType,
  type DatabricksDatasourceSpecification,
  type DatasourceSpecification,
  type DelegatedKerberosAuthenticationStrategy,
  type EmbeddedH2DatasourceSpecification,
  type EnumerationMapping,
  type LocalH2DatasourceSpecification,
  type OAuthAuthenticationStrategy,
  type PropertyMapping,
  type RedshiftDatasourceSpecification,
  type RelationalDatabaseConnection,
  type RelationalInputData,
  type RelationalPropertyMapping,
  type RootRelationalInstanceSetImplementation,
  type SnowflakeDatasourceSpecification,
  type SnowflakePublicAuthenticationStrategy,
  type StaticDatasourceSpecification,
  type UsernamePasswordAuthenticationStrategy,
  getRelationalInputType,
} from '@finos/legend-graph';
import { action } from 'mobx';

// --------------------------------------------- DB Connection -------------------------------------

export const dBConnection_setType = action(
  (con: DatabaseConnection, val: DatabaseType): void => {
    con.type = val;
  },
);

export const dBConnection_setQuoteIdentifiers = action(
  (con: DatabaseConnection, val: boolean): void => {
    con.quoteIdentifiers = val;
  },
);

export const relationDbConnection_setDatasourceSpecification = action(
  (con: RelationalDatabaseConnection, val: DatasourceSpecification): void => {
    con.datasourceSpecification = val;
  },
);

export const relationDbConnection_setAuthenticationStrategy = action(
  (con: RelationalDatabaseConnection, val: AuthenticationStrategy): void => {
    con.authenticationStrategy = val;
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
//

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
    value: EnumerationMapping | undefined,
  ): void => {
    v.transformer = value;
  },
);
export const relationalPropertyMapping_setBindingTransformer = action(
  (
    v: RelationalPropertyMapping,
    value: BindingTransformer | undefined,
  ): void => {
    v.bindingTransformer = value;
  },
);

export const rootRelationalSetImp_setPropertyMappings = action(
  (
    v: RootRelationalInstanceSetImplementation,
    value: PropertyMapping[],
  ): void => {
    v.propertyMappings = value;
  },
);
