/**
 * Copyright Goldman Sachs
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
import type { Connection } from '../../model/packageableElements/connection/Connection';
import { uuid } from '@finos/legend-studio-shared';

export class StorePattern {
  uuid = uuid();
  schemaPattern = '';
  tablePattern = '';
  escapeSchemaPattern?: boolean;
  escapeTablePattern?: boolean;

  constructor() {
    makeObservable(this, {
      schemaPattern: observable,
      tablePattern: observable,
      escapeSchemaPattern: observable,
      escapeTablePattern: observable,
      setTablePattern: action,
      setSchemaPattern: action,
    });
  }

  setSchemaPattern(val: string): void {
    this.schemaPattern = val;
  }

  setTablePattern(val: string): void {
    this.tablePattern = val;
  }
}

export class GenerateStoreInput {
  targetPackage = '';
  targetName = '';
  maxTables?: number = 100000;
  enrichTables?: boolean = true;
  enrichPrimaryKeys?: boolean;
  enrichColumns?: boolean;
  connection: Connection;
  patterns: StorePattern[] = [];

  constructor(connection: Connection) {
    makeObservable(this, {
      targetPackage: observable,
      targetName: observable,
      maxTables: observable,
      enrichTables: observable,
      enrichPrimaryKeys: observable,
      enrichColumns: observable,
      patterns: observable,
    });
    this.connection = connection;
  }
}
