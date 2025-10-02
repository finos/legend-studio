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

import { assertTrue, assertType, filterByType } from '@finos/legend-shared';
import { Column } from '../metamodel/pure/packageableElements/store/relational/model/Column.js';
import { Table } from '../metamodel/pure/packageableElements/store/relational/model/Table.js';
import type { View } from '../metamodel/pure/packageableElements/store/relational/model/View.js';
import type { Database } from '../../STO_Relational_Exports.js';
import { INTERNAL__LakehouseGeneratedDatabase } from '../metamodel/pure/packageableElements/store/relational/model/Database.js';
import { Schema } from '../metamodel/pure/packageableElements/store/relational/model/Schema.js';

export const getOrCreateColumnFromGeneratedTable = (
  columnName: string,
  relation: Table | View,
): Column => {
  let column = relation.columns
    .filter(filterByType(Column))
    .find((col) => col.name === columnName);
  if (!column) {
    column = new Column();
    column.name = columnName;
    column.owner = relation;
    relation.columns.push(column);
  }
  return column;
};

export const isGeneratedSchema = (schema: Schema): boolean => {
  return schema._OWNER instanceof INTERNAL__LakehouseGeneratedDatabase;
};

export const isGeneratedRelation = (relation: Table | View): boolean => {
  return isGeneratedSchema(relation.schema);
};

export const getOrCreateTableFromGeneratedSchema = (
  tableName: string,
  schema: Schema,
): Table => {
  assertTrue(isGeneratedSchema(schema), 'Schema must be generated');
  let table = schema.tables.find((t) => t.name === tableName);
  if (!table) {
    table = new Table(tableName, schema);
    schema.tables.push(table);
  }
  return table;
};

export const getOrCreateSchemaFromGeneratedDatabase = (
  schemaName: string,
  db: Database,
): Schema => {
  assertType(
    db,
    INTERNAL__LakehouseGeneratedDatabase,
    'Database must be a generated database',
  );
  const schema = db.schemas.find((s) => s.name === schemaName);
  if (schema) {
    return schema;
  }
  const newSchema = new Schema(schemaName, db);
  db.schemas.push(newSchema);
  return newSchema;
};

export const findGeneratedDatabase = (
  database: Database,
  path: string,
): INTERNAL__LakehouseGeneratedDatabase | undefined => {
  return database.includedStoreSpecifications.find(
    (x) => x.packageableElementPointer.value.path === path,
  )?.generatedDatabase;
};

export const buildGeneratedIndex = (
  database: Database,
): Map<string, INTERNAL__LakehouseGeneratedDatabase> | undefined => {
  const index = new Map<string, INTERNAL__LakehouseGeneratedDatabase>();
  database.includedStoreSpecifications.forEach((inc) =>
    index.set(inc.packageableElementPointer.value.path, inc.generatedDatabase),
  );
  return index.size > 0 ? index : undefined;
};
