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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../../../graph/Core_HashUtils.js';

export abstract class V1_DatasourceSpecification implements Hashable {
  abstract get hashCode(): string;
}

export class V1_StaticDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  host!: string;
  port!: number;
  databaseName!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.STATIC_DATASOURCE_SPECIFICATION,
      this.host,
      this.port.toString(),
      this.databaseName,
    ]);
  }
}

export class V1_EmbeddedH2DatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  databaseName!: string;
  directory!: string;
  autoServerMode!: boolean;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EMBEDDED_H2_DATASOURCE_SPECIFICATION,
      this.databaseName,
      this.directory,
      this.autoServerMode.toString(),
    ]);
  }
}

export class V1_DatabricksDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  hostname!: string;
  port!: string;
  protocol!: string;
  httpPath!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DATABRICKS_DATASOURCE_SPECIFICATION,
      this.hostname,
      this.port,
      this.protocol,
      this.httpPath,
    ]);
  }
}

export class V1_SnowflakeDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  accountName!: string;
  region!: string;
  warehouseName!: string;
  databaseName!: string;
  cloudType?: string | undefined;
  quotedIdentifiersIgnoreCase?: boolean | undefined;
  enableQueryTags?: boolean | undefined;
  proxyHost?: string | undefined;
  proxyPort?: string | undefined;
  nonProxyHosts?: string | undefined;
  organization?: string | undefined;
  accountType?: string | undefined;
  role?: string | undefined;
  tempTableDb?: string | undefined;
  tempTableSchema?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_DATASOURCE_SPECIFICATION,
      this.accountName,
      this.region,
      this.warehouseName,
      this.databaseName,
      this.cloudType ?? '',
      this.proxyHost ?? '',
      this.proxyPort ?? '',
      this.nonProxyHosts ?? '',
      this.organization ?? '',
      this.accountType ?? '',
      this.role ?? '',
      this.quotedIdentifiersIgnoreCase?.toString() ?? '',
      this.enableQueryTags?.toString() ?? '',
      this.tempTableDb ?? '',
      this.tempTableSchema ?? '',
    ]);
  }
}

export class V1_RedshiftDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  clusterID!: string;
  databaseName!: string;
  host!: string;
  port!: number;
  region!: string;
  endpointURL!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REDSHIFT_DATASOURCE_SPECIFICATION,
      this.databaseName,
      this.endpointURL,
      this.port.toString(),
      this.clusterID,
      this.host,
      this.region,
    ]);
  }
}

export class V1_BigQueryDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  projectId!: string;
  defaultDataset!: string;
  proxyHost?: string | undefined;
  proxyPort?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.BIGQUERY_DATASOURCE_SPECIFICATION,
      this.projectId,
      this.defaultDataset,
      this.proxyHost ?? '',
      this.proxyPort ?? '',
    ]);
  }
}

export class V1_SpannerDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  projectId!: string;
  instanceId!: string;
  databaseId!: string;
  proxyHost?: string | undefined;
  proxyPort?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SPANNER_DATASOURCE_SPECIFICATION,
      this.projectId,
      this.instanceId,
      this.databaseId,
      this.proxyHost ?? '',
      this.proxyPort ?? '',
    ]);
  }
}

export class V1_LocalH2DataSourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  testDataSetupCsv?: string | undefined;
  testDataSetupSqls: string[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.LOCAL_H2_DATASOURCE_SPECIFICATION,
      this.testDataSetupCsv ?? '',
      hashArray(this.testDataSetupSqls),
    ]);
  }
}

export class V1_TrinoSslSpecification implements Hashable {
  ssl!: boolean;
  trustStorePathVaultReference?: string | undefined;
  trustStorePasswordVaultReference?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TRINO_SSL_SPECIFICATION,
      this.ssl.toString(),
      this.trustStorePathVaultReference ?? '',
      this.trustStorePasswordVaultReference ?? '',
    ]);
  }
}

export class V1_TrinoDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  host!: string;
  port!: number;
  sslSpecification!: V1_TrinoSslSpecification;
  catalog?: string | undefined;
  schema?: string | undefined;
  clientTags?: string | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TRINO_DATASOURCE_SPECIFICATION,
      this.host,
      this.port.toString(),
      this.sslSpecification,
      this.catalog ?? '',
      this.schema ?? '',
      this.clientTags ?? '',
    ]);
  }
}

export class V1_DuckDBDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  path!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DUCKDB_DATASOURCE_SPECIFICATION,
      this.path,
    ]);
  }
}
