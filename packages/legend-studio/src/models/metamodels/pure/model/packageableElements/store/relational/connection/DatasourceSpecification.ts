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

import type { Hashable } from '@finos/legend-studio-shared';
import { hashArray } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { observable, computed, makeObservable, action } from 'mobx';

export abstract class DatasourceSpecification implements Hashable {
  private readonly _$nominalTypeBrand!: 'DatasourceSpecification';

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

    makeObservable(this, {
      host: observable,
      port: observable,
      databaseName: observable,
      hashCode: computed,
      setHost: action,
      setPort: action,
      setDatabaseName: action,
    });
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

  setHost(val: string): void {
    this.host = val;
  }

  setPort(val: number): void {
    this.port = val;
  }

  setDatabaseName(val: string): void {
    this.databaseName = val;
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

    makeObservable(this, {
      databaseName: observable,
      directory: observable,
      autoServerMode: observable,
      hashCode: computed,
      setDatabaseName: action,
      setDirectory: action,
      setAutoServerMode: action,
    });
    this.databaseName = databaseName;
    this.directory = directory;
    this.autoServerMode = autoServerMode;
  }

  setDatabaseName(val: string): void {
    this.databaseName = val;
  }

  setDirectory(val: string): void {
    this.directory = val;
  }

  setAutoServerMode(val: boolean): void {
    this.autoServerMode = val;
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
  testDataSetupCsv?: string;
  testDataSetupSqls: string[] = [];

  constructor() {
    super();

    makeObservable(this, {
      testDataSetupCsv: observable,
      testDataSetupSqls: observable,
      setTestDataSetupCsv: action,
      setTestDataSetupSqls: action,
      hashCode: computed,
    });
  }

  setTestDataSetupCsv(val: string | undefined): void {
    this.testDataSetupCsv = val;
  }

  setTestDataSetupSqls(val: string[]): void {
    this.testDataSetupSqls = val;
  }

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
  cloudType?: string;
  quotedIdentifiersIgnoreCase?: boolean;

  constructor(
    accountName: string,
    region: string,
    warehouseName: string,
    databaseName: string,
  ) {
    super();

    makeObservable(this, {
      accountName: observable,
      region: observable,
      warehouseName: observable,
      databaseName: observable,
      cloudType: observable,
      quotedIdentifiersIgnoreCase: observable,
      hashCode: computed,
      setAccountName: action,
      setRegion: action,
      setWarehouseName: action,
      setDatabaseName: action,
      setCloudType: action,
      setQuotedIdentifiersIgnoreCase: action,
    });

    this.region = region;
    this.warehouseName = warehouseName;
    this.databaseName = databaseName;
    this.accountName = accountName;
  }

  setAccountName(val: string): void {
    this.accountName = val;
  }

  setRegion(val: string): void {
    this.region = val;
  }

  setWarehouseName(val: string): void {
    this.warehouseName = val;
  }

  setDatabaseName(val: string): void {
    this.databaseName = val;
  }

  setCloudType(val: string | undefined): void {
    this.cloudType = val;
  }

  setQuotedIdentifiersIgnoreCase(val: boolean | undefined): void {
    this.quotedIdentifiersIgnoreCase = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SNOWFLAKE_DATASOURCE_SPECIFICATION,
      this.accountName,
      this.region,
      this.warehouseName,
      this.databaseName,
      this.cloudType ?? '',
      this.quotedIdentifiersIgnoreCase?.toString() ?? '',
    ]);
  }
}

export class RedshiftDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  databaseName: string;
  endpoint: string;
  port: number;

  constructor(databaseName: string, endpoint: string, port: number) {
    super();

    makeObservable(this, {
      databaseName: observable,
      endpoint: observable,
      port: observable,
      hashCode: computed,
      setDatabaseName: action,
      setEndpoint: action,
      setPort: action,
    });

    this.databaseName = databaseName;
    this.endpoint = endpoint;
    this.port = port;
  }

  setDatabaseName(val: string): void {
    this.databaseName = val;
  }

  setEndpoint(val: string): void {
    this.endpoint = val;
  }

  setPort(val: number): void {
    this.port = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REDSHIFT_DATASOURCE_SPECIFICATION,
      this.databaseName,
      this.endpoint,
      this.port.toString(),
    ]);
  }
}

export class BigQueryDatasourceSpecification
  extends DatasourceSpecification
  implements Hashable
{
  projectId: string;
  defaultDataset: string;

  constructor(projectId: string, defaultDataset: string) {
    super();

    makeObservable(this, {
      projectId: observable,
      defaultDataset: observable,
      hashCode: computed,
      setProjectId: action,
      setDefaultDataset: action,
    });
    this.projectId = projectId;
    this.defaultDataset = defaultDataset;
  }

  setProjectId(val: string): void {
    this.projectId = val;
  }
  setDefaultDataset(val: string): void {
    this.defaultDataset = val;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.BIGQUERY_DATASOURCE_SPECIFICATION,
      this.projectId,
      this.defaultDataset,
    ]);
  }
}
