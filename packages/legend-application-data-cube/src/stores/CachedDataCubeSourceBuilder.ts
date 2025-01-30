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

import type { TDSBuilder } from '../../../legend-graph/src/graph-manager/action/execution/ExecutionResult.js';
import {
  V1_Binary,
  V1_Column,
  V1_Database,
  V1_Date,
  V1_Double,
  V1_Integer,
  V1_RelationalDataType,
  V1_Schema,
  V1_Table,
  V1_VarChar,
} from '@finos/legend-graph';
import { CachedDataCubeSource } from './model/CachedDataCubeSource.js';
import type { LegendQueryDataCubeSource } from './model/LegendQueryDataCubeSource.js';

export function synthesizeCachedSource(
  source: LegendQueryDataCubeSource,
  builder: TDSBuilder,
) {
  const cachedSource = new CachedDataCubeSource();
  cachedSource.columns = source.columns;
  cachedSource.query = source.query;
  cachedSource.originalSource = source;
  //  synthesizeModel();
}

function synthesizeModel(builder: TDSBuilder) {
  const schemas = synthesizeSchema([synthesizeTable(builder)]);
  const database = synthesizeDatabase([schemas]);
}

function synthesizeDatabase(schemas: V1_Schema[]) {
  const database = new V1_Database();
  database.name = 'DuckDb';
  database.package = 'cached';
  database.schemas = schemas;
  return database;
}

function synthesizeTable(builder: TDSBuilder) {
  const table = new V1_Table();
  table.name = 'cached_tbl';
  table.columns = builder.columns.map((col) => {
    const column = new V1_Column();
    column.name = col.name;
    column.type = getColumnType(col.type);
    return column;
  });
  return table;
}

function synthesizeSchema(tables: V1_Table[]) {
  const schema = new V1_Schema();
  schema.tables = tables;
  return schema;
}

// TODO: need a better way to infer datatype from tds builder
function getColumnType(type: string | undefined): V1_RelationalDataType {
  if (type === undefined) {
    throw Error();
  }
  switch (type) {
    case 'string':
      return new V1_VarChar();
    case 'integer':
      return new V1_Integer();
    case 'date':
      return new V1_Date();
    case 'boolean':
      return new V1_Binary();
    case 'number':
      return new V1_Double();
    default:
      return new V1_VarChar();
  }
}

// function synthesizeConnection(database: V1_Database)
// {
//   const connection = new V1_RelationalDatabaseConnection();
//   connection.databaseType =
// }
