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

import { guaranteeType } from '@finos/legend-studio-shared';
import { Database } from '../../../../packageableElements/store/relational/model/Database';
import type { Schema } from '../../../../packageableElements/store/relational/model/Schema';
import type { Table } from '../../../../packageableElements/store/relational/model/Table';

const collectIncludedDBs = (
  results: Set<Database>,
  databases: Database[],
): void => {
  databases.forEach((i) => {
    const includedDb = guaranteeType(i, Database);
    if (!results.has(includedDb)) {
      results.add(includedDb);
      collectIncludedDBs(
        results,
        includedDb.includes.map((s) => guaranteeType(s.value, Database)),
      );
    }
  });
};

export const getAllIncludedDbs = (db: Database): Set<Database> => {
  const includes = db.includes;
  const results = new Set<Database>();
  results.add(db);
  if (!includes.length) {
    return results;
  }
  collectIncludedDBs(
    results,
    db.includes.map((includedStore) =>
      guaranteeType(includedStore.value, Database),
    ),
  );
  return results;
};

export const getDbNullableSchema = (
  name: string,
  db: Database,
): Schema | undefined => db.schemas.find((schema) => schema.name === name);

export const getSchemaNullableTable = (
  name: string,
  schema: Schema,
): Table | undefined => schema.tables.find((table) => table.name === name);

export const getDbNullableTable = (
  _table: string,
  _schema: string,
  db: Database,
): Table | undefined => {
  const schema = getDbNullableSchema(_schema, db);
  if (schema) {
    return getSchemaNullableTable(_table, schema);
  }
  return undefined;
};
