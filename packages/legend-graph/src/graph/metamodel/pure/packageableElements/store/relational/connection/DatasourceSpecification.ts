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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';

export abstract class DatasourceSpecification implements Hashable {
  abstract get hashCode(): string;
}

export class StaticDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  host: string;
  port: number;
  databaseName: string;

  constructor(host: string, port: number, databaseName: string) {
    super();
    this.host = host;
    this.port = port;
    this.databaseName = databaseName;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.STATIC_DATASOURCE_SPECIFICATION,
      this.host,
      this.port.toString(),
      this.databaseName,
    ]);
  }
}

export class DatabricksDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  hostname: string;
  port: string;
  protocol: string;
  httpPath: string;

  constructor(
    hostname: string,
    port: string,
    protocol: string,
    httpPath: string,
  ) {
    super();
    this.hostname = hostname;
    this.port = port;
    this.protocol = protocol;
    this.httpPath = httpPath;
  }

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

export class EmbeddedH2DatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  databaseName: string;
  directory: string;
  autoServerMode: boolean;

  constructor(
    databaseName: string,
    directory: string,
    autoServerMode: boolean,
  ) {
    super();
    this.databaseName = databaseName;
    this.directory = directory;
    this.autoServerMode = autoServerMode;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EMBEDDED_H2_DATASOURCE_SPECIFICATION,
      this.databaseName,
      this.directory,
      this.autoServerMode.toString(),
    ]);
  }
}

export class LocalH2DatasourceSpecification
  extends DatasourceSpecification
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

export class SnowflakeDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  accountName: string;
  region: string;
  warehouseName: string;
  databaseName: string;
  cloudType?: string | undefined;
  quotedIdentifiersIgnoreCase?: boolean | undefined;
  proxyHost?: string | undefined;
  proxyPort?: string | undefined;
  nonProxyHosts?: string | undefined;
  organization?: string | undefined;
  accountType?: string | undefined;
  role?: string | undefined;
  enableQueryTags?: boolean | undefined;
  tempTableDb?: string | undefined;
  tempTableSchema?: string | undefined;

  constructor(
    accountName: string,
    region: string,
    warehouseName: string,
    databaseName: string,
  ) {
    super();
    this.region = region;
    this.warehouseName = warehouseName;
    this.databaseName = databaseName;
    this.accountName = accountName;
  }

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

export class RedshiftDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  clusterID: string;
  databaseName: string;
  host: string;
  port: number;
  region: string;
  endpointURL: string;

  constructor(
    databaseName: string,
    endpointURL: string,
    port: number,
    host: string,
    clusterID: string,
    region: string,
  ) {
    super();
    this.clusterID = clusterID;
    this.region = region;
    this.host = host;
    this.databaseName = databaseName;
    this.endpointURL = endpointURL;
    this.port = port;
  }

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

export class BigQueryDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  projectId: string;
  defaultDataset: string;
  proxyHost?: string | undefined;
  proxyPort?: string | undefined;

  constructor(projectId: string, defaultDataset: string) {
    super();
    this.projectId = projectId;
    this.defaultDataset = defaultDataset;
  }

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

export class SpannerDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  projectId!: string;
  instanceId!: string;
  databaseId!: string;
  proxyHost?: string | undefined;
  proxyPort?: string | undefined;

  constructor(
    projectId: string,
    instanceId: string,
    databaseId: string,
    proxyHost: string | undefined,
    proxyPort: string | undefined,
  ) {
    super();
    this.projectId = projectId;
    this.instanceId = instanceId;
    this.databaseId = databaseId;
    this.proxyHost = proxyHost;
    this.proxyPort = proxyPort;
  }

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
export class TrinoSslSpecification implements Hashable {
  ssl: boolean;
  trustStorePathVaultReference?: string | undefined;
  trustStorePasswordVaultReference?: string | undefined;

  constructor(ssl: boolean) {
    this.ssl = ssl;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.TRINO_SSL_SPECIFICATION,
      this.ssl.toString(),
      this.trustStorePathVaultReference ?? '',
      this.trustStorePasswordVaultReference ?? '',
    ]);
  }
}

export class TrinoDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  host: string;
  port: number;
  sslSpecification: TrinoSslSpecification;
  catalog?: string | undefined;
  schema?: string | undefined;
  clientTags?: string | undefined;

  constructor(
    host: string,
    port: number,
    sslSpecification: TrinoSslSpecification,
  ) {
    super();
    this.host = host;
    this.port = port;
    this.sslSpecification = sslSpecification;
  }

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
