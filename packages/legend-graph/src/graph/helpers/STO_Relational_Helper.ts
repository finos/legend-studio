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

import {
  filterByType,
  guaranteeNonNullable,
  guaranteeType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { Column } from '../metamodel/pure/packageableElements/store/relational/model/Column.js';
import {
  Database,
  type INTERNAL__LakehouseGeneratedDatabase,
} from '../metamodel/pure/packageableElements/store/relational/model/Database.js';
import type { Filter } from '../metamodel/pure/packageableElements/store/relational/model/Filter.js';
import type { Join } from '../metamodel/pure/packageableElements/store/relational/model/Join.js';
import {
  JoinType,
  type Relation,
} from '../metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
import type { Schema } from '../metamodel/pure/packageableElements/store/relational/model/Schema.js';
import type { Table } from '../metamodel/pure/packageableElements/store/relational/model/Table.js';
import type { View } from '../metamodel/pure/packageableElements/store/relational/model/View.js';
import { RelationalInputType } from '../metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import {
  type RelationalDataType,
  VarChar,
  Char,
  VarBinary,
  Binary,
  Bit,
  BigInt,
  Date,
  Numeric,
  Decimal,
  Double,
  Float,
  Real,
  Integer,
  SmallInt,
  TinyInt,
  Timestamp,
  Other,
  SemiStructured,
  Json,
  RelationalDatabaseConnection,
} from '../../STO_Relational_Exports.js';
import type { PackageableElement } from '../metamodel/pure/packageableElements/PackageableElement.js';
import { PackageableConnection } from '../metamodel/pure/packageableElements/connection/PackageableConnection.js';
import {
  getOrCreateColumnFromGeneratedTable,
  isGeneratedRelation,
} from './STO_Internal_Relational_Helper.js';

const collectIncludedDatabases = (
  results: Set<Database>,
  databases: Database[],
): void => {
  databases.forEach((i) => {
    const includedDb = guaranteeType(i, Database);
    if (!results.has(includedDb)) {
      results.add(includedDb);
      collectIncludedDatabases(
        results,
        includedDb.includes.map((s) => guaranteeType(s.value, Database)),
      );
    }
  });
};

export const getAllIncludedDatabases = (db: Database): Set<Database> => {
  const includes = db.includes;
  const results = new Set<Database>();
  results.add(db);
  if (!includes.length) {
    return results;
  }
  collectIncludedDatabases(
    results,
    db.includes.map((includedStore) =>
      guaranteeType(includedStore.value, Database),
    ),
  );
  return results;
};

export const getAllIncludedGeneratedDatabases = (
  db: Database,
): Set<INTERNAL__LakehouseGeneratedDatabase> => {
  return new Set(
    db.includedStoreSpecifications.map(
      (includedStore) => includedStore.generatedDatabase,
    ),
  );
};

export const getJoinType = (type: string): JoinType => {
  switch (type) {
    case JoinType.INNER:
      return JoinType.INNER;
    case JoinType.LEFT_OUTER:
      return JoinType.LEFT_OUTER;
    case JoinType.RIGHT_OUTER:
      return JoinType.RIGHT_OUTER;
    case JoinType.OUTER:
      return JoinType.OUTER;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported join type '${type}'`,
      );
  }
};

export const getRelationalInputType = (type: string): RelationalInputType => {
  switch (type) {
    case RelationalInputType.SQL:
      return RelationalInputType.SQL;
    case RelationalInputType.CSV:
      return RelationalInputType.CSV;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported relational input type '${type}'`,
      );
  }
};

export const getAllSchemasFromDatabase = (database: Database): Schema[] =>
  Array.from(getAllIncludedDatabases(database))
    .map((d) => d.schemas)
    .flat();

export const getAllTablesFromDatabase = (database: Database): Table[] =>
  getAllSchemasFromDatabase(database)
    .map((t) => t.tables)
    .flat();

export const getNullableSchema = (
  database: Database,
  name: string,
): Schema | undefined =>
  database.schemas.find((schema) => schema.name === name);

export const getNullableFilter = (
  database: Database,
  name: string,
): Filter | undefined =>
  Array.from(getAllIncludedDatabases(database))
    .flatMap((includedDB) => includedDB.filters)
    .find((filter) => filter.name === name);

export const getSchema = (database: Database, name: string): Schema =>
  guaranteeNonNullable(
    getNullableSchema(database, name),
    `Can't find schema '${name}' in database '${database.path}'`,
  );

export const getJoin = (database: Database, name: string): Join =>
  guaranteeNonNullable(
    Array.from(getAllIncludedDatabases(database))
      .flatMap((includedDB) => includedDB.joins)
      .find((join) => join.name === name),
    `Can't find join '${name}' in database '${database.path}'`,
  );

export const getFilter = (database: Database, name: string): Filter =>
  guaranteeNonNullable(
    getNullableFilter(database, name),
    `Can't find filter '${name}' in database '${database.path}'`,
  );

export const getNullableTable = (
  schema: Schema,
  name: string,
): Table | undefined => schema.tables.find((_table) => _table.name === name);

export const getTable = (schema: Schema, name: string): Table =>
  guaranteeNonNullable(
    getNullableTable(schema, name),
    `Can't find table '${name}' in schema '${schema.name}' of database '${schema._OWNER.path}'`,
  );

export const getView = (schema: Schema, name: string): View =>
  guaranteeNonNullable(
    schema.views.find((view) => view.name === name),
    `Can't find view '${name}' in schema '${schema.name}' of database '${schema._OWNER.path}'`,
  );

export const getRelation = (schema: Schema, name: string): Relation => {
  const relations: (Table | View)[] = schema.tables;
  return guaranteeNonNullable(
    relations.concat(schema.views).find((relation) => relation.name === name),
    `Can't find relation '${name}' in schema '${schema.name}' of database '${schema._OWNER.path}'`,
  );
};

export function getColumn(relation: Table | View, name: string): Column {
  if (!isGeneratedRelation(relation)) {
    guaranteeNonNullable(
      relation.columns
        .filter(filterByType(Column))
        .find((column) => column.name === name),
      `Can't find column '${name}' in table '${relation.name}'`,
    );
  }
  return getOrCreateColumnFromGeneratedTable(name, relation);
}

export const stringifyDataType = (type: RelationalDataType): string => {
  if (type instanceof VarChar) {
    return `VARCHAR(${type.size})`;
  } else if (type instanceof Char) {
    return `CHAR(${type.size})`;
  } else if (type instanceof VarBinary) {
    return `VARBINARY(${type.size})`;
  } else if (type instanceof Binary) {
    return `BINARY(${type.size})`;
  } else if (type instanceof Bit) {
    return `BIT`;
  } else if (type instanceof Numeric) {
    return `NUMERIC(${type.precision},${type.scale})`;
  } else if (type instanceof Decimal) {
    return `DECIMAL(${type.precision},${type.scale})`;
  } else if (type instanceof Double) {
    return `DOUBLE`;
  } else if (type instanceof Float) {
    return `FLOAT`;
  } else if (type instanceof Real) {
    return `REAL`;
  } else if (type instanceof Integer) {
    return `INTEGER`;
  } else if (type instanceof BigInt) {
    return `BIGINT`;
  } else if (type instanceof SmallInt) {
    return `SMALLINT`;
  } else if (type instanceof TinyInt) {
    return `TINYINT`;
  } else if (type instanceof Date) {
    return `DATE`;
  } else if (type instanceof Timestamp) {
    return `TIMESTAMP`;
  } else if (type instanceof Other) {
    return `OTHER`;
  } else if (type instanceof SemiStructured) {
    return 'SEMI-STRUCTURED';
  } else if (type instanceof Json) {
    return 'JSON';
  }
  return '(UNKNOWN)';
};

export const guaranteeRelationalDatabaseConnection = (
  val: PackageableElement | undefined,
): RelationalDatabaseConnection =>
  guaranteeType(
    guaranteeType(val, PackageableConnection).connectionValue,
    RelationalDatabaseConnection,
  );

export const isRelationalDatabaseConnection = (
  val: PackageableElement | undefined,
): boolean =>
  val instanceof PackageableConnection &&
  val.connectionValue instanceof RelationalDatabaseConnection;
