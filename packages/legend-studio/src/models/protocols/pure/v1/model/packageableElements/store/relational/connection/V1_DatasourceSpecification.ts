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
import { CORE_HASH_STRUCTURE } from '../../../../../../../../MetaModelConst';

export enum V1_DatasourceSpecificationType {
  STATIC = 'static',
  H2_EMBEDDED = 'h2Embedded',
  SNOWFLAKE = 'snowflake',
  BIGQUERY = 'bigQuery',
  H2_LOCAL = 'h2Local',
  REDSHIFT = 'redshift',
}

export abstract class V1_DatasourceSpecification implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_DatasourceSpecification';

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

export class V1_SnowflakeDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  accountName!: string;
  region!: string;
  warehouseName!: string;
  databaseName!: string;
  cloudType?: string;
  quotedIdentifiersIgnoreCase?: boolean;

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

export class V1_RedshiftDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  databaseName!: string;
  endpoint!: string;
  port!: number;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.REDSHIFT_DATASOURCE_SPECIFICATION,
      this.databaseName,
      this.endpoint,
      this.port.toString(),
    ]);
  }
}

export class V1_BigQueryDatasourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  projectId!: string;
  defaultDataset!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.BIGQUERY_DATASOURCE_SPECIFICATION,
      this.projectId,
      this.defaultDataset,
    ]);
  }
}

export class V1_LocalH2DataSourceSpecification
  extends V1_DatasourceSpecification
  implements Hashable
{
  testDataSetupCsv?: string;
  testDataSetupSqls: string[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.LOCAL_H2_DATASOURCE_SPECIFICATION,
      this.testDataSetupCsv ?? '',
      hashArray(this.testDataSetupSqls),
    ]);
  }
}
