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

import { guaranteeType, UnsupportedOperationError } from '@finos/legend-shared';
import { RelationalInputType } from '../models/metamodels/pure/packageableElements/store/relational/mapping/RelationalInputData';
import { Database } from '../models/metamodels/pure/packageableElements/store/relational/model/Database';
import type { Filter } from '../models/metamodels/pure/packageableElements/store/relational/model/Filter';
import { JoinType } from '../models/metamodels/pure/packageableElements/store/relational/model/RelationalOperationElement';
import type { Schema } from '../models/metamodels/pure/packageableElements/store/relational/model/Schema';
import type { Table } from '../models/metamodels/pure/packageableElements/store/relational/model/Table';

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

export const getNullableDatabaseSchema = (
  name: string,
  db: Database,
): Schema | undefined => db.schemas.find((schema) => schema.name === name);

export const getNullableSchemaTable = (
  name: string,
  schema: Schema,
): Table | undefined => schema.tables.find((table) => table.name === name);

export const getNullableDatabaseFilter = (
  filterName: string,
  db: Database,
): Filter | undefined =>
  db.filters.find((filter) => filter.name === filterName);

export const getNullableDatabaseTable = (
  _table: string,
  _schema: string,
  db: Database,
): Table | undefined => {
  const schema = getNullableDatabaseSchema(_schema, db);
  if (schema) {
    return getNullableSchemaTable(_table, schema);
  }
  return undefined;
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
