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

import {
  areCompatibleTypes,
  foldColumnName,
  getRelationalDisplayName,
  type Schema,
} from '@finos/legend-cube';
import type {
  CubeModelOutline,
  CubeOutlineJoinColumn,
} from '../../graph-manager/CubeEngine.js';
import type { CubeColumnOrigin } from './CubeJoinDraft.js';

// The join columns the Join editor suggests (user, 2026-10-16), strongest
// first: a join the database defines between the tables the two inputs'
// columns come from, a primary key both sides name alike, a `<table>_ID`
// column against that table's `ID`, then a column both sides name alike.
// Only pairs whose types can be compared are suggested.

export enum CubeJoinSuggestionReason {
  /** A join the database defines between the columns' tables */
  DATABASE_JOIN = 'databaseJoin',
  /** A table's primary key, the other side naming its columns alike */
  PRIMARY_KEY = 'primaryKey',
  /** `CUSTOMER_ID` against the `ID` of a `CUSTOMERS` table */
  NAME_PATTERN = 'namePattern',
  /** A column both sides name alike, in any case */
  SAME_NAME = 'sameName',
}

/** Join columns the editor suggests, paired by position, and why */
export interface CubeJoinKeySuggestion {
  readonly leftColumns: readonly string[];
  readonly rightColumns: readonly string[];
  readonly reason: CubeJoinSuggestionReason;
  /** The database join's name, or the table whose key or name matched */
  readonly detail?: string | undefined;
  /** Whether a same-named column looks like a key, e.g. `CUSTOMER_ID` */
  readonly isKeyLike?: boolean | undefined;
}

/** What the suggestions read: each input's schema, where its columns come from, and the model's outline */
export interface CubeJoinSuggestionInput {
  readonly leftSchema: Schema;
  readonly rightSchema: Schema;
  readonly leftOrigins: (column: string) => readonly CubeColumnOrigin[];
  readonly rightOrigins: (column: string) => readonly CubeColumnOrigin[];
  readonly outline: CubeModelOutline | undefined;
}

/** A name that looks like a key: `ID`, `CUSTOMER_ID`, `CustomerId`, `ORDER_KEY`, `CODE` */
const KEY_LIKE = /(?:^|_)(?:id|key|code|no|num|number)$|[a-z]Id$|ID$/u;

export const isKeyLikeColumnName = (name: string): boolean =>
  KEY_LIKE.test(name) || KEY_LIKE.test(name.toLowerCase());

const originKey = (
  database: string,
  schema: string,
  table: string,
  column: string,
): string => JSON.stringify([database, schema, table, column]);

/** The ways to say a table's name, lower case, unquoted: `customers`, `customer` */
const tableNameForms = (table: string): string[] => {
  const name = getRelationalDisplayName(table).toLowerCase();
  const forms = new Set([name]);
  if (name.endsWith('ies')) {
    forms.add(`${name.slice(0, -3)}y`);
  }
  if (name.endsWith('es')) {
    forms.add(name.slice(0, -2));
  }
  if (name.endsWith('s')) {
    forms.add(name.slice(0, -1));
  }
  return [...forms];
};

/** The table a column names as `<table>_ID` or `<table>Id`, lower case: `customer` for `CUSTOMER_ID` */
const referencedTableOf = (column: string): string | undefined => {
  const table = /^(?<table>.+?)_?id$/iu.exec(column)?.groups?.table;
  return table ? table.toLowerCase().replace(/_$/u, '') : undefined;
};

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((each, index) => each === b[index]);

const isSameSuggestion = (
  a: CubeJoinKeySuggestion,
  b: CubeJoinKeySuggestion,
): boolean =>
  sameList(a.leftColumns, b.leftColumns) &&
  sameList(a.rightColumns, b.rightColumns);

/**
 * The join columns to suggest for two inputs, strongest first, each once:
 * the database's joins between their columns' tables, either way round;
 * a primary key of either side that the other names alike; a `<table>_ID`
 * against that table's `ID` or single primary key; then each column both
 * sides name alike, key-like names first. Only comparable types.
 */
export const suggestJoinKeys = (
  input: CubeJoinSuggestionInput,
): CubeJoinKeySuggestion[] => {
  const { leftSchema, rightSchema, outline } = input;
  const comparable = (left: string, right: string): boolean => {
    const leftType = leftSchema.type(left);
    const rightType = rightSchema.type(right);
    return (
      leftType !== undefined &&
      rightType !== undefined &&
      areCompatibleTypes(leftType, rightType)
    );
  };
  // each side's columns by the table column they come from
  const byOrigin = (
    schema: Schema,
    originsOf: (column: string) => readonly CubeColumnOrigin[],
  ): Map<string, string> => {
    const columns = new Map<string, string>();
    schema.names().forEach((name) =>
      originsOf(name).forEach(({ source, column }) => {
        const key = originKey(
          source.database,
          source.schema,
          source.table,
          column,
        );
        if (!columns.has(key)) {
          columns.set(key, name);
        }
      }),
    );
    return columns;
  };
  const leftByOrigin = byOrigin(leftSchema, input.leftOrigins);
  const rightByOrigin = byOrigin(rightSchema, input.rightOrigins);
  const suggestions: CubeJoinKeySuggestion[] = [];
  const add = (suggestion: CubeJoinKeySuggestion): void => {
    if (
      suggestion.leftColumns.length > 0 &&
      suggestion.leftColumns.every((left, index) => {
        const right = suggestion.rightColumns[index];
        return right !== undefined && comparable(left, right);
      }) &&
      !suggestions.some((each) => isSameSuggestion(each, suggestion))
    ) {
      suggestions.push(suggestion);
    }
  };

  // the database's joins, either way round, every pair mapped
  outline?.databases.forEach((database) =>
    (database.joins ?? []).forEach((join) => {
      const keyOf = (column: CubeOutlineJoinColumn): string =>
        originKey(database.path, column.schema, column.table, column.column);
      [false, true].forEach((reversed) => {
        const pairs = join.pairs.map(([a, b]) => {
          const [leftEnd, rightEnd] = reversed ? [b, a] : [a, b];
          return [
            leftByOrigin.get(keyOf(leftEnd)),
            rightByOrigin.get(keyOf(rightEnd)),
          ];
        });
        if (
          pairs.every(
            (pair): pair is [string, string] =>
              pair[0] !== undefined && pair[1] !== undefined,
          )
        ) {
          add({
            leftColumns: pairs.map(([left]) => left),
            rightColumns: pairs.map(([, right]) => right),
            reason: CubeJoinSuggestionReason.DATABASE_JOIN,
            detail: join.name,
          });
        }
      });
    }),
  );

  // each table of a side whose whole primary key the side has, its
  // columns in key order
  const primaryKeysOf = (
    schema: Schema,
    originsOf: (column: string) => readonly CubeColumnOrigin[],
  ): { table: string; columns: string[] }[] => {
    const keys = new Map<
      string,
      {
        table: string;
        primaryKey: readonly string[];
        names: Map<string, string>;
      }
    >();
    schema.names().forEach((name) =>
      originsOf(name).forEach(({ source, column }) => {
        const primaryKey = outline?.databases
          .find((each) => each.path === source.database)
          ?.schemas.find((each) => each.name === source.schema)
          ?.tables.find((each) => each.name === source.table)?.primaryKey;
        if (!primaryKey?.includes(column)) {
          return;
        }
        const tableKey = JSON.stringify([
          source.database,
          source.schema,
          source.table,
        ]);
        const entry = keys.get(tableKey) ?? {
          table: getRelationalDisplayName(source.table),
          primaryKey,
          names: new Map<string, string>(),
        };
        if (!entry.names.has(column)) {
          entry.names.set(column, name);
        }
        keys.set(tableKey, entry);
      }),
    );
    return [...keys.values()].flatMap(({ table, primaryKey, names }) => {
      const columns = primaryKey.map((column) => names.get(column));
      return columns.every((each): each is string => each !== undefined)
        ? [{ table, columns }]
        : [];
    });
  };
  const sameNamed = (name: string, schema: Schema): string | undefined =>
    schema
      .names()
      .find((each) => foldColumnName(each) === foldColumnName(name));
  primaryKeysOf(rightSchema, input.rightOrigins).forEach(
    ({ table, columns }) => {
      const lefts = columns.map((column) => sameNamed(column, leftSchema));
      if (lefts.every((left): left is string => left !== undefined)) {
        add({
          leftColumns: lefts,
          rightColumns: columns,
          reason: CubeJoinSuggestionReason.PRIMARY_KEY,
          detail: table,
        });
      }
    },
  );
  primaryKeysOf(leftSchema, input.leftOrigins).forEach(({ table, columns }) => {
    const rights = columns.map((column) => sameNamed(column, rightSchema));
    if (rights.every((right): right is string => right !== undefined)) {
      add({
        leftColumns: columns,
        rightColumns: rights,
        reason: CubeJoinSuggestionReason.PRIMARY_KEY,
        detail: table,
      });
    }
  });

  // `CUSTOMER_ID` against the `ID`, or the single primary key, of a CUSTOMERS table
  const tablesOf = (
    name: string,
    originsOf: (column: string) => readonly CubeColumnOrigin[],
  ): string[] => originsOf(name).map(({ source }) => source.table);
  const singleKeyOf = (
    schema: Schema,
    originsOf: (column: string) => readonly CubeColumnOrigin[],
  ): Map<string, string> =>
    new Map(
      primaryKeysOf(schema, originsOf)
        .filter(({ columns }) => columns.length === 1)
        .map(({ table, columns }) => [
          table.toLowerCase(),
          columns[0] as string,
        ]),
    );
  const patterns = (
    referencing: Schema,
    referenced: Schema,
    referencedOrigins: (column: string) => readonly CubeColumnOrigin[],
  ): [string, string, string][] => {
    const keys = singleKeyOf(referenced, referencedOrigins);
    return referencing.names().flatMap((name): [string, string, string][] => {
      const target = referencedTableOf(name);
      if (target === undefined) {
        return [];
      }
      return referenced.names().flatMap((other): [string, string, string][] =>
        tablesOf(other, referencedOrigins)
          .filter((table) => tableNameForms(table).includes(target))
          .filter(
            (table) =>
              foldColumnName(other) === 'id' ||
              keys.get(getRelationalDisplayName(table).toLowerCase()) === other,
          )
          .filter(() => foldColumnName(other) !== foldColumnName(name))
          .map((table): [string, string, string] => [
            name,
            other,
            getRelationalDisplayName(table),
          ]),
      );
    });
  };
  patterns(leftSchema, rightSchema, input.rightOrigins).forEach(
    ([left, right, table]) =>
      add({
        leftColumns: [left],
        rightColumns: [right],
        reason: CubeJoinSuggestionReason.NAME_PATTERN,
        detail: table,
      }),
  );
  patterns(rightSchema, leftSchema, input.leftOrigins).forEach(
    ([right, left, table]) =>
      add({
        leftColumns: [left],
        rightColumns: [right],
        reason: CubeJoinSuggestionReason.NAME_PATTERN,
        detail: table,
      }),
  );

  // each column both sides name alike, key-like names first
  const alike = leftSchema
    .names()
    .flatMap((left) => {
      const right = sameNamed(left, rightSchema);
      return right === undefined ? [] : [[left, right] as const];
    })
    .map(([left, right]) => ({
      leftColumns: [left],
      rightColumns: [right],
      reason: CubeJoinSuggestionReason.SAME_NAME,
      isKeyLike: isKeyLikeColumnName(left),
    }));
  [
    ...alike.filter((each) => each.isKeyLike),
    ...alike.filter((each) => !each.isKeyLike),
  ].forEach(add);
  return suggestions;
};

/**
 * The suggestion a new Join takes without asking, when one is clearly it
 * (user, 2026-10-16): the only database join, else the only primary key both
 * sides name alike, else the only key-like column both sides name alike;
 * none when there is no such one, or more than one
 */
export const getClearJoinKeySuggestion = (
  suggestions: readonly CubeJoinKeySuggestion[],
): CubeJoinKeySuggestion | undefined => {
  const only = (
    found: readonly CubeJoinKeySuggestion[],
  ): CubeJoinKeySuggestion | undefined =>
    found.length === 1 ? found[0] : undefined;
  const of = (reason: CubeJoinSuggestionReason): CubeJoinKeySuggestion[] =>
    suggestions.filter((each) => each.reason === reason);
  const databaseJoins = of(CubeJoinSuggestionReason.DATABASE_JOIN);
  if (databaseJoins.length) {
    return only(databaseJoins);
  }
  const primaryKeys = of(CubeJoinSuggestionReason.PRIMARY_KEY);
  if (primaryKeys.length) {
    return only(primaryKeys);
  }
  return only(
    of(CubeJoinSuggestionReason.SAME_NAME).filter((each) => each.isKeyLike),
  );
};
