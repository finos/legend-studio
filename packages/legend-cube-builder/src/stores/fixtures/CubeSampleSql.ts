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

// What the sample models are made of: seeded random numbers, so a sample's
// rows are the same on every load (a saved cube holds the model text, which
// must not change), and setup SQL that H2 and DuckDB both run.

/** A seeded random number generator (mulberry32): numbers in [0, 1) */
export const createSampleRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** An item of the list, picked with the random number given */
export const pickSample = <T>(items: readonly T[], random: number): T => {
  const item = items[Math.floor(random * items.length)];
  if (item === undefined) {
    throw new Error(`Can't pick from an empty list`);
  }
  return item;
};

/** A value of a setup SQL row: a number, a text, a date, or NULL */
export type SampleSqlValue =
  | number
  | string
  | { readonly date: string }
  | { readonly decimal: string }
  | null;

const sqlValue = (value: SampleSqlValue): string => {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    return `'${value.replaceAll("'", "''")}'`;
  }
  return 'date' in value ? `DATE '${value.date}'` : value.decimal;
};

/** One insert of every row of a table */
export const sampleInsert = (
  table: string,
  rows: readonly (readonly SampleSqlValue[])[],
): string =>
  `insert into ${table} values ${rows
    .map((row) => `(${row.map(sqlValue).join(', ')})`)
    .join(', ')}`;

/** A Pure string literal */
export const pureString = (text: string): string =>
  `'${text.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

/** The setup SQL as the `testDataSetupSqls` of a LocalH2 connection */
export const toPureSetupSqls = (sqls: readonly string[]): string =>
  sqls.map((sql) => `      ${pureString(sql)}`).join(',\n');

/** A day as `YYYY-MM-DD`, some days after the first one given */
export const addSampleDays = (first: string, days: number): string => {
  const date = new Date(`${first}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
