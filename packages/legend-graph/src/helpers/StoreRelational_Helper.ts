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
import { RelationalInputType } from '../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalInputData';
import { Column } from '../models/metamodels/pure/packageableElements/store/relational/model/Column';
import { Database } from '../models/metamodels/pure/packageableElements/store/relational/model/Database';
import type { Filter } from '../models/metamodels/pure/packageableElements/store/relational/model/Filter';
import type { Join } from '../models/metamodels/pure/packageableElements/store/relational/model/Join';
import {
  JoinType,
  type Relation,
} from '../models/metamodels/pure/packageableElements/store/relational/model/RelationalOperationElement';
import type { Schema } from '../models/metamodels/pure/packageableElements/store/relational/model/Schema';
import type { Table } from '../models/metamodels/pure/packageableElements/store/relational/model/Table';
import type { View } from '../models/metamodels/pure/packageableElements/store/relational/model/View';

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

export const getJoinType = (type: string): JoinType => {
  switch (type) {
    case JoinType.INNER:
      return JoinType.INNER;
    case JoinType.LEFT_OUTER:
      return JoinType.LEFT_OUTER;
    case JoinType.RIGHT_OUTER:
      return JoinType.RIGHT_OUTER;
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
): Table | undefined => schema.tables.find((table) => table.name === name);

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

export const getColumn = (relation: Table | View, name: string): Column =>
  guaranteeNonNullable(
    relation.columns
      .filter(filterByType(Column))
      .find((column) => column.name === name),
    `Can't find column '${name}' in table '${relation.name}'`,
  );
