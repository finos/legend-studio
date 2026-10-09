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

import { CUBE_CSV_MESSAGE } from '../../__lib__/LegendCubeDirectConnectionLabels.js';

// A CSV loaded into an in-memory DuckDB connection: the CSV becomes setup SQL
// (a table, then its rows as inserts), which the engine runs on every
// connection and the cube saves with its connection. No file reaches the
// engine's host

/** The most rows a CSV may have: the cube saves them, and every connection inserts them again */
export const CUBE_CSV_MAX_ROWS = 10_000;

/** The most characters a CSV may have */
export const CUBE_CSV_MAX_LENGTH = 5_000_000;

/** The schema a CSV's table is created in */
export const CUBE_CSV_SCHEMA = 'csv';

/** How many rows one insert statement holds */
const ROWS_PER_INSERT = 1000;

/** The DuckDB types a CSV's columns are given, from their values */
export enum CubeCsvColumnType {
  INTEGER = 'INTEGER',
  BIGINT = 'BIGINT',
  DOUBLE = 'DOUBLE',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  TIMESTAMP = 'TIMESTAMP',
  VARCHAR = 'VARCHAR',
}

export class CubeCsvError extends Error {}

/** A CSV loaded as a table: its name, its columns and their types, and the setup SQL that creates it */
export interface CubeCsvTable {
  readonly table: string;
  readonly columns: readonly {
    readonly name: string;
    readonly type: CubeCsvColumnType;
  }[];
  readonly rowCount: number;
  /** Statements in the form's setup SQL text: each ends on a line ending in ';' */
  readonly sql: string;
}

/**
 * The records of a CSV (RFC 4180): fields split on commas, a field in double
 * quotes may hold commas, line breaks and doubled quotes; blank lines are
 * skipped
 */
export const parseCubeCsv = (text: string): string[][] => {
  const source = text.startsWith('﻿') ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  let wasQuoted = false;
  let line = 1;
  let quoteLine = 1;
  const endField = (): void => {
    record.push(field);
    field = '';
    wasQuoted = false;
  };
  const endRecord = (): void => {
    const lastWasQuoted = wasQuoted;
    endField();
    // a blank line is one empty field, never quoted
    if (record.length > 1 || record[0] !== '' || lastWasQuoted) {
      records.push(record);
    }
    record = [];
  };
  for (let index = 0; index < source.length; index++) {
    const char = source.charAt(index);
    if (quoted) {
      if (char === '"') {
        if (source.charAt(index + 1) === '"') {
          field += '"';
          index++;
        } else {
          quoted = false;
        }
      } else {
        if (char === '\n') {
          line++;
        }
        field += char;
      }
    } else if (char === '"' && field === '') {
      quoted = true;
      wasQuoted = true;
      quoteLine = line;
    } else if (char === ',') {
      endField();
    } else if (char === '\r' || char === '\n') {
      if (char === '\r' && source.charAt(index + 1) === '\n') {
        index++;
      }
      line++;
      endRecord();
    } else {
      field += char;
    }
  }
  if (quoted) {
    throw new CubeCsvError(CUBE_CSV_MESSAGE.UNCLOSED_QUOTE(quoteLine));
  }
  if (field !== '' || record.length || wasQuoted) {
    endRecord();
  }
  return records;
};

const INTEGER_TEXT = /^[+-]?(?:0|[1-9]\d*)$/u;
const NUMBER_TEXT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u;
const BOOLEAN_TEXT = /^(?:true|false)$/iu;
const DATE_TEXT = /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})$/u;
const TIMESTAMP_TEXT =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})[ T](?<hour>\d{2}):(?<minute>\d{2})(?::(?<second>\d{2})(?:\.\d{1,9})?)?$/u;

const INT32 = { min: -(2n ** 31n), max: 2n ** 31n - 1n };
const INT64 = { min: -(2n ** 63n), max: 2n ** 63n - 1n };

const fits = (text: string, range: { min: bigint; max: bigint }): boolean => {
  const value = BigInt(text);
  return value >= range.min && value <= range.max;
};

/** Whether year, month and day name a real day */
const isDay = (year: string, month: string, day: string): boolean => {
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
};

const isDate = (text: string): boolean => {
  const day = DATE_TEXT.exec(text)?.groups;
  return Boolean(day && isDay(day.year ?? '', day.month ?? '', day.day ?? ''));
};

const isTimestamp = (text: string): boolean => {
  const at = TIMESTAMP_TEXT.exec(text)?.groups;
  return Boolean(
    at &&
      isDay(at.year ?? '', at.month ?? '', at.day ?? '') &&
      Number(at.hour) < 24 &&
      Number(at.minute) < 60 &&
      Number(at.second ?? '0') < 60,
  );
};

/**
 * A column's type from its values, empty ones left out: the narrowest type
 * every value fits. Whole numbers with a leading zero (codes, such as
 * `007`) and ones past 64 bits stay text, so no digit is lost; numbers
 * with a fraction are DOUBLE. A column of empty values is text.
 */
export const inferCubeCsvColumnType = (
  values: readonly string[],
): CubeCsvColumnType => {
  const present = values.filter((value) => value !== '');
  if (!present.length) {
    return CubeCsvColumnType.VARCHAR;
  }
  if (present.every((value) => INTEGER_TEXT.test(value))) {
    if (present.every((value) => fits(value, INT32))) {
      return CubeCsvColumnType.INTEGER;
    }
    return present.every((value) => fits(value, INT64))
      ? CubeCsvColumnType.BIGINT
      : CubeCsvColumnType.VARCHAR;
  }
  if (
    present.every((value) => NUMBER_TEXT.test(value)) &&
    // a whole number with a leading zero is a code, not a number
    !present.some((value) => /^[+-]?0\d/u.test(value))
  ) {
    return CubeCsvColumnType.DOUBLE;
  }
  if (present.every((value) => BOOLEAN_TEXT.test(value))) {
    return CubeCsvColumnType.BOOLEAN;
  }
  if (present.every(isDate)) {
    return CubeCsvColumnType.DATE;
  }
  if (present.every((value) => isDate(value) || isTimestamp(value))) {
    return CubeCsvColumnType.TIMESTAMP;
  }
  return CubeCsvColumnType.VARCHAR;
};

/**
 * The keywords that can't name a column or table unquoted: DuckDB's
 * `reserved` and `type_function` ones, as `duckdb_keywords()` lists them on
 * the engine's DuckDB (1.3)
 */
const RESERVED_WORDS = new Set([
  'all',
  'analyse',
  'analyze',
  'and',
  'anti',
  'any',
  'array',
  'as',
  'asc',
  'asof',
  'asymmetric',
  'at',
  'authorization',
  'binary',
  'both',
  'case',
  'cast',
  'check',
  'collate',
  'collation',
  'column',
  'columns',
  'concurrently',
  'constraint',
  'create',
  'cross',
  'default',
  'deferrable',
  'desc',
  'describe',
  'distinct',
  'do',
  'else',
  'end',
  'except',
  'false',
  'fetch',
  'for',
  'foreign',
  'freeze',
  'from',
  'full',
  'generated',
  'glob',
  'group',
  'having',
  'ilike',
  'in',
  'initially',
  'inner',
  'intersect',
  'into',
  'is',
  'isnull',
  'join',
  'lambda',
  'lateral',
  'leading',
  'left',
  'like',
  'limit',
  'map',
  'natural',
  'not',
  'notnull',
  'null',
  'offset',
  'on',
  'only',
  'or',
  'order',
  'outer',
  'overlaps',
  'pivot',
  'pivot_longer',
  'pivot_wider',
  'placing',
  'positional',
  'primary',
  'qualify',
  'references',
  'returning',
  'right',
  'select',
  'semi',
  'show',
  'similar',
  'some',
  'struct',
  'summarize',
  'symmetric',
  'table',
  'tablesample',
  'then',
  'to',
  'trailing',
  'true',
  'try_cast',
  'union',
  'unique',
  'unpack',
  'unpivot',
  'using',
  'variadic',
  'verbose',
  'when',
  'where',
  'window',
  'with',
]);

/**
 * A name the database takes unquoted: letters, digits and underscores, not
 * starting with a digit, and no reserved word (one gets a trailing
 * underscore)
 */
export const toCubeCsvName = (text: string, fallback: string): string => {
  const name = text.trim().replace(/[^A-Za-z0-9_]+/gu, '_');
  const safe = !name || /^_*$/u.test(name) ? fallback : name;
  const start = /^[0-9]/u.test(safe) ? `_${safe}` : safe;
  return RESERVED_WORDS.has(start.toLowerCase()) ? `${start}_` : start;
};

/** The header's names made safe, and distinct whatever their case */
const toColumnNames = (header: readonly string[]): string[] => {
  const used = new Set<string>();
  return header.map((text, index) => {
    const base = toCubeCsvName(text, `column_${index + 1}`);
    let name = base;
    for (let suffix = 2; used.has(name.toLowerCase()); suffix++) {
      name = `${base}_${suffix}`;
    }
    used.add(name.toLowerCase());
    return name;
  });
};

/** A string literal: quotes doubled, line breaks as chr(10), so no line of the setup SQL ends inside it */
const quote = (value: string): string =>
  `'${value
    .replace(/'/gu, "''")
    .split(/\r\n|\r|\n/u)
    .join("' || chr(10) || '")}'`;

const toLiteral = (value: string, type: CubeCsvColumnType): string => {
  if (value === '') {
    return 'NULL';
  }
  switch (type) {
    case CubeCsvColumnType.INTEGER:
    case CubeCsvColumnType.BIGINT:
    case CubeCsvColumnType.DOUBLE:
      return value;
    case CubeCsvColumnType.BOOLEAN:
      return value.toLowerCase();
    case CubeCsvColumnType.DATE:
      return `DATE '${value}'`;
    case CubeCsvColumnType.TIMESTAMP:
      return `TIMESTAMP '${value.replace('T', ' ')}'`;
    default:
      return quote(value);
  }
};

/**
 * A CSV, with a header row, as a table of the `csv` schema: setup SQL that
 * creates the schema if needed, drops and creates the table, then inserts
 * the rows. Refuses an empty CSV, a record whose values don't match the
 * header, and one past the limits.
 */
export const buildCubeCsvTable = (
  text: string,
  tableName: string,
): CubeCsvTable => {
  if (text.length > CUBE_CSV_MAX_LENGTH) {
    throw new CubeCsvError(CUBE_CSV_MESSAGE.TOO_LONG(CUBE_CSV_MAX_LENGTH));
  }
  const [header, ...rows] = parseCubeCsv(text);
  if (!header) {
    throw new CubeCsvError(CUBE_CSV_MESSAGE.EMPTY);
  }
  if (rows.length > CUBE_CSV_MAX_ROWS) {
    throw new CubeCsvError(
      CUBE_CSV_MESSAGE.TOO_MANY_ROWS(rows.length, CUBE_CSV_MAX_ROWS),
    );
  }
  rows.forEach((row, index) => {
    if (row.length !== header.length) {
      throw new CubeCsvError(
        CUBE_CSV_MESSAGE.RAGGED_ROW(index + 1, row.length, header.length),
      );
    }
  });
  const table = toCubeCsvName(tableName, 'csv_data');
  const names = toColumnNames(header);
  const columns = names.map((name, index) => ({
    name,
    type: inferCubeCsvColumnType(rows.map((row) => row[index] ?? '')),
  }));
  const qualified = `${CUBE_CSV_SCHEMA}.${table}`;
  const statements = [
    `create schema if not exists ${CUBE_CSV_SCHEMA};`,
    `drop table if exists ${qualified};`,
    `create table ${qualified} (${columns
      .map((column) => `${column.name} ${column.type}`)
      .join(', ')});`,
  ];
  for (let start = 0; start < rows.length; start += ROWS_PER_INSERT) {
    const chunk = rows.slice(start, start + ROWS_PER_INSERT);
    statements.push(
      [
        `insert into ${qualified} values`,
        ...chunk.map(
          (row, index) =>
            `(${row
              .map((value, column) =>
                toLiteral(
                  value,
                  columns[column]?.type ?? CubeCsvColumnType.VARCHAR,
                ),
              )
              .join(', ')})${index === chunk.length - 1 ? ';' : ','}`,
        ),
      ].join('\n'),
    );
  }
  return { table, columns, rowCount: rows.length, sql: statements.join('\n') };
};
