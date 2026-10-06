/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  BigInt,
  Binary,
  Bit,
  Char,
  Column,
  Database,
  Date as ColumnDate,
  Decimal,
  Double,
  Float,
  Integer,
  Json,
  Numeric,
  Other,
  Real,
  type RelationalDataType,
  Schema,
  SemiStructured,
  SmallInt,
  Table,
  Timestamp,
  TinyInt,
  VarBinary,
  VarChar,
} from '@finos/legend-graph';
import { buildTableToTDSQueryColumnQuery } from '../connection/DatabaseBuilderState.js';

// One column per relational type, with the `TDSRow` getter the column preview
// must read it with, and whether the preview computes numeric aggregates
const RELATIONAL_COLUMNS: [
  string,
  () => RelationalDataType,
  string,
  boolean,
][] = [
  ['C_BIGINT', () => new BigInt(), 'getInteger', true],
  ['C_SMALLINT', () => new SmallInt(), 'getInteger', true],
  ['C_TINYINT', () => new TinyInt(), 'getInteger', true],
  ['C_INTEGER', () => new Integer(), 'getInteger', true],
  ['C_FLOAT', () => new Float(), 'getFloat', true],
  ['C_DOUBLE', () => new Double(), 'getFloat', true],
  ['C_REAL', () => new Real(), 'getFloat', true],
  ['C_DECIMAL', () => new Decimal(10, 2), 'getDecimal', true],
  ['C_NUMERIC', () => new Numeric(10, 2), 'getDecimal', true],
  ['C_VARCHAR', () => new VarChar(20), 'getString', false],
  ['C_CHAR', () => new Char(5), 'getString', false],
  ['C_BIT', () => new Bit(), 'getBoolean', false],
  ['C_DATE', () => new ColumnDate(), 'getStrictDate', false],
  ['C_TIMESTAMP', () => new Timestamp(), 'getDateTime', false],
  ['C_BINARY', () => new Binary(10), 'getString', false],
  ['C_VARBINARY', () => new VarBinary(10), 'getString', false],
  ['C_OTHER', () => new Other(), 'getString', false],
  ['C_JSON', () => new Json(), 'getString', false],
  ['C_SEMISTRUCTURED', () => new SemiStructured(), 'getString', false],
];

const buildColumn = (
  table: Table,
  name: string,
  type: RelationalDataType,
): Column => {
  const column = new Column();
  column.name = name;
  column.type = type;
  column.owner = table;
  table.columns.push(column);
  return column;
};

test(
  unitTest(
    'Database builder column preview reads each column type with the matching TDS getter',
  ),
  () => {
    const schema = new Schema('S', new Database('MyDatabase'));
    const table = new Table('T', schema);
    const actual = Object.fromEntries(
      RELATIONAL_COLUMNS.map(([name, createType]) => {
        const [query, isNumeric] = buildTableToTDSQueryColumnQuery(
          buildColumn(table, name, createType()),
        );
        // every getter call in the query, deduplicated
        const getterCalls = new Set(query.match(/\$row\.\w+\('\w+'\)/gu));
        return [name, [Array.from(getterCalls), isNumeric]];
      }),
    );
    expect(actual).toEqual(
      Object.fromEntries(
        RELATIONAL_COLUMNS.map(([name, , getter, isNumeric]) => [
          name,
          [[`$row.${getter}('${name}')`], isNumeric],
        ]),
      ),
    );
  },
);
