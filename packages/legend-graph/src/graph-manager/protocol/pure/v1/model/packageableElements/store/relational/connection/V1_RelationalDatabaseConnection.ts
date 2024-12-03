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
import {
  type V1_ConnectionVisitor,
  V1_Connection,
} from '../../../../../model/packageableElements/connection/V1_Connection.js';
import type { V1_DatasourceSpecification } from './V1_DatasourceSpecification.js';
import type { V1_AuthenticationStrategy } from './V1_AuthenticationStrategy.js';
import type { V1_PostProcessor } from './postprocessor/V1_PostProcessor.js';

/**
 * TODO: to be modularized or handled differently
 *
 * @modularize
 * See https://github.com/finos/legend-studio/issues/946
 * See https://github.com/finos/legend-studio/issues/65
 */
export enum V1_DatabaseType {
  DB2 = 'DB2',
  H2 = 'H2',
  MemSQL = 'MemSQL',
  Sybase = 'Sybase',
  SybaseIQ = 'SybaseIQ',
  Composite = 'Composite',
  Postgres = 'Postgres',
  SqlServer = 'SqlServer',
  Hive = 'Hive',
  Snowflake = 'Snowflake',
  BigQuery = 'BigQuery',
  Databricks = 'Databricks',
  Presto = 'Presto',
  Redshift = 'Redshift',
  Spanner = 'Spanner',
  Trino = 'Trino',
}

export abstract class V1_DatabaseConnection extends V1_Connection {
  type!: string;
  // this mirrors `type` and probably should removed
  databaseType!: string;
  timeZone?: string | undefined;
  quoteIdentifiers?: boolean | undefined;
  queryTimeOutInSeconds?: number | undefined;
  postProcessorWithParameter: unknown[] = [];
}

export class V1_RelationalDatabaseConnection
  extends V1_DatabaseConnection
  implements Hashable
{
  datasourceSpecification!: V1_DatasourceSpecification;
  authenticationStrategy!: V1_AuthenticationStrategy;
  postProcessors: V1_PostProcessor[] = [];

  /**
   * HACKY: this is done to quickly add support for local connection
   * See https://github.com/finos/legend-engine/pull/1807
   */
  localMode?: boolean | undefined;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATABASE_CONNECTION,
      this.store ?? '',
      this.timeZone ?? '',
      this.quoteIdentifiers?.toString() ?? '',
      this.datasourceSpecification,
      this.authenticationStrategy,
      this.localMode?.toString() ?? '',
      this.queryTimeOutInSeconds?.toString() ?? '',
      hashArray(this.postProcessors),
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: V1_ConnectionVisitor<T>): T {
    return visitor.visit_RelationalDatabaseConnection(this);
  }
}
