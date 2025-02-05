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

import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { hashArray } from '@finos/legend-shared';
import {
  type ConnectionVisitor,
  Connection,
} from '../../../connection/Connection.js';
import type { DatasourceSpecification } from './DatasourceSpecification.js';
import type { AuthenticationStrategy } from './AuthenticationStrategy.js';
import type { Database } from '../model/Database.js';
import type { PackageableElementReference } from '../../../PackageableElementReference.js';
import type { PostProcessor } from './postprocessor/PostProcessor.js';

/**
 * TODO: to be modularized or handled differently
 *
 * @modularize
 * See https://github.com/finos/legend-studio/issues/946
 * See https://github.com/finos/legend-studio/issues/65
 */
export enum DatabaseType {
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
  Databricks = 'Databricks',
  Presto = 'Presto',
  Redshift = 'Redshift',
  BigQuery = 'BigQuery',
  Spanner = 'Spanner',
  Trino = 'Trino',
  DuckDB = 'DuckDB',
}

export abstract class DatabaseConnection extends Connection {
  declare store: PackageableElementReference<Database>;

  /**
   * For convenience, we use a Typescript enum instead of the native
   * Pure enumeration meta::relational::runtime::DatabaseType
   *
   * @discrepancy model
   */
  type: string;
  timeZone?: string | undefined;
  quoteIdentifiers?: boolean | undefined;
  queryTimeOutInSeconds?: number | undefined;
  postProcessorWithParameter: unknown[] = [];

  constructor(store: PackageableElementReference<Database>, type: string) {
    super(store);
    this.type = type;
  }
}

export class RelationalDatabaseConnection extends DatabaseConnection {
  datasourceSpecification: DatasourceSpecification;
  authenticationStrategy: AuthenticationStrategy;
  postProcessors: PostProcessor[] = [];

  /**
   * HACKY: this is done to quickly add support for local connection
   * See https://github.com/finos/legend-engine/pull/1807
   */
  localMode?: boolean | undefined;

  constructor(
    store: PackageableElementReference<Database>,
    type: string,
    datasourceSpecification: DatasourceSpecification,
    authenticationStrategy: AuthenticationStrategy,
  ) {
    super(store, type);
    this.datasourceSpecification = datasourceSpecification;
    this.authenticationStrategy = authenticationStrategy;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATABASE_CONNECTION,
      this.store.valueForSerialization ?? '',
      this.timeZone ?? '',
      this.quoteIdentifiers?.toString() ?? '',
      this.datasourceSpecification,
      this.authenticationStrategy,
      this.localMode?.toString() ?? '',
      this.queryTimeOutInSeconds?.toString() ?? '',
      hashArray(this.postProcessors),
    ]);
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_RelationalDatabaseConnection(this);
  }
}
