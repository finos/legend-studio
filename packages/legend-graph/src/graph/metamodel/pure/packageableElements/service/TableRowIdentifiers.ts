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

import type { TablePtr } from './TablePtr.js';

export class ColumnValuePair {
  name!: string;
  value!: object;

  constructor(name: string, value: object) {
    this.name = name;
    this.value = value;
  }
}

export class RowIdentifier {
  columnValuePairs: ColumnValuePair[] = [];

  constructor(columnValuePairs: ColumnValuePair[]) {
    this.columnValuePairs = columnValuePairs;
  }
}

export class TableRowIdentifiers {
  table!: TablePtr;
  rowIdentifiers: RowIdentifier[] = [];

  constructor(table: TablePtr, rowIdentifiers: RowIdentifier[]) {
    this.table = table;
    this.rowIdentifiers = rowIdentifiers;
  }
}
