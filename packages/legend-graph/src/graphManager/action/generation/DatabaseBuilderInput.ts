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

import type { RelationalDatabaseConnection } from '../../../graph/metamodel/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection.js';

export class DatabasePattern {
  schemaPattern = '';
  tablePattern = '';
  escapeSchemaPattern?: boolean | undefined;
  escapeTablePattern?: boolean | undefined;

  constructor(schemaPattern: string, tablePattern: string) {
    this.schemaPattern = schemaPattern;
    this.tablePattern = tablePattern;
  }
}

export class DatabaseBuilderConfig {
  maxTables?: number | undefined = 100000;
  enrichTables = false;
  enrichPrimaryKeys = false;
  enrichColumns = false;
  patterns: DatabasePattern[] = [];
}

export class TargetDatabase {
  name: string;
  package: string;

  constructor(_package: string, name: string) {
    this.package = _package;
    this.name = name;
  }
}

export class DatabaseBuilderInput {
  targetDatabase: TargetDatabase;
  config: DatabaseBuilderConfig;
  connection: RelationalDatabaseConnection;

  constructor(connection: RelationalDatabaseConnection) {
    this.connection = connection;
    this.targetDatabase = new TargetDatabase('', '');
    this.config = new DatabaseBuilderConfig();
  }
}
