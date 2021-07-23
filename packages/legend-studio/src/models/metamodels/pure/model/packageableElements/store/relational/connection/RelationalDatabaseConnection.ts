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

import { observable, computed, makeObservable, action } from 'mobx';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import { hashArray, guaranteeType } from '@finos/legend-studio-shared';
import type { ConnectionVisitor } from '../../../../../model/packageableElements/connection/Connection';
import { Connection } from '../../../../../model/packageableElements/connection/Connection';
import type { DatasourceSpecification } from '../../../../../model/packageableElements/store/relational/connection/DatasourceSpecification';
import type { AuthenticationStrategy } from '../../../../../model/packageableElements/store/relational/connection/AuthenticationStrategy';
import { Database } from '../../../../../model/packageableElements/store/relational/model/Database';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';
import type { PostProcessor } from './postprocessor/PostProcessor';

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
  Presto = 'Presto',
  Redshift = 'Redshift',
  BigQuery = 'BigQuery',
}

export abstract class DatabaseConnection extends Connection {
  type: DatabaseType;
  // debug?: boolean;
  timeZone?: string;
  quoteIdentifiers?: boolean;

  constructor(
    store: PackageableElementReference<Database>,
    type: DatabaseType,
  ) {
    super(store);

    makeObservable(this, {
      type: observable,
      timeZone: observable,
      quoteIdentifiers: observable,
      setType: action,
      setQuoteIdentifiers: action,
    });

    this.type = type;
  }

  setType(val: DatabaseType): void {
    this.type = val;
  }

  setQuoteIdentifiers(val: boolean): void {
    this.quoteIdentifiers = val;
  }
}

export class RelationalDatabaseConnection extends DatabaseConnection {
  datasourceSpecification: DatasourceSpecification;
  authenticationStrategy: AuthenticationStrategy;
  postProcessors: PostProcessor[] = [];

  get database(): Database {
    return guaranteeType(
      this.store.value,
      Database,
      'Relational database connection must have a database store',
    );
  }

  constructor(
    store: PackageableElementReference<Database>,
    type: DatabaseType,
    datasourceSpecification: DatasourceSpecification,
    authenticationStrategy: AuthenticationStrategy,
  ) {
    super(store, type);

    makeObservable(this, {
      datasourceSpecification: observable,
      authenticationStrategy: observable,
      database: computed,
      hashCode: computed,
      setDatasourceSpecification: action,
      setAuthenticationStrategy: action,
    });

    this.datasourceSpecification = datasourceSpecification;
    this.authenticationStrategy = authenticationStrategy;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_DATABASE_CONNECTION,
      this.store.valueForSerialization,
      this.timeZone ?? '',
      this.quoteIdentifiers?.toString() ?? '',
      this.datasourceSpecification,
      this.authenticationStrategy,
      hashArray(this.postProcessors),
    ]);
  }

  setDatasourceSpecification(val: DatasourceSpecification): void {
    this.datasourceSpecification = val;
  }

  setAuthenticationStrategy(val: AuthenticationStrategy): void {
    this.authenticationStrategy = val;
  }

  accept_ConnectionVisitor<T>(visitor: ConnectionVisitor<T>): T {
    return visitor.visit_RelationalDatabaseConnection(this);
  }
}
