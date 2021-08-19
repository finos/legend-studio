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

import { makeObservable, observable, action } from 'mobx';
import { uuid } from '@finos/legend-shared';
import type { RelationalDatabaseConnection } from '../../../model/packageableElements/store/relational/connection/RelationalDatabaseConnection';

export class DatabasePattern {
  uuid = uuid();
  schemaPattern = '';
  tablePattern = '';
  escapeSchemaPattern?: boolean;
  escapeTablePattern?: boolean;

  constructor(schemaPattern: string, tablePattern: string) {
    makeObservable(this, {
      schemaPattern: observable,
      tablePattern: observable,
      escapeSchemaPattern: observable,
      escapeTablePattern: observable,
      setTablePattern: action,
      setSchemaPattern: action,
    });
    this.schemaPattern = schemaPattern;
    this.tablePattern = tablePattern;
  }

  setSchemaPattern(val: string): void {
    this.schemaPattern = val;
  }

  setTablePattern(val: string): void {
    this.tablePattern = val;
  }
}

export class DatabaseBuilderConfig {
  maxTables?: number = 100000;
  enrichTables = false;
  enrichPrimaryKeys = false;
  enrichColumns = false;
  patterns: DatabasePattern[] = [];

  constructor() {
    makeObservable(this, {
      maxTables: observable,
      enrichTables: observable,
      enrichPrimaryKeys: observable,
      enrichColumns: observable,
      patterns: observable,
    });
  }
}

export class TargetDatabase {
  name: string;
  package: string;
  constructor(_package: string, name: string) {
    makeObservable(this, {
      name: observable,
      package: observable,
    });
    this.package = _package;
    this.name = name;
  }
}

export class DatabaseBuilderInput {
  targetDatabase: TargetDatabase;
  config: DatabaseBuilderConfig;
  connection: RelationalDatabaseConnection;

  constructor(connection: RelationalDatabaseConnection) {
    makeObservable(this, {
      targetDatabase: observable,
      config: observable,
      connection: observable,
    });
    this.connection = connection;
    this.targetDatabase = new TargetDatabase('', '');
    this.config = new DatabaseBuilderConfig();
  }
}
