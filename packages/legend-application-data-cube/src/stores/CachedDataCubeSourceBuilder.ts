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
  V1_AppliedFunction,
  V1_Binary,
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_Column,
  V1_Database,
  V1_Date,
  V1_Double,
  V1_DuckDBDatasourceSpecification,
  V1_EngineRuntime,
  V1_IdentifiedConnection,
  V1_Integer,
  V1_RelationStoreAccessor,
  V1_PackageableElementPointer,
  V1_PackageableRuntime,
  V1_PureModelContextData,
  V1_RelationalDataType,
  V1_RelationalDatabaseConnection,
  V1_Schema,
  V1_StoreConnections,
  V1_Table,
  V1_TestAuthenticationStrategy,
  V1_VarChar,
} from '@finos/legend-graph';
import type { LegendQueryDataCubeSource } from './model/LegendQueryDataCubeSource.js';
import { serialize } from 'serializr';
import { CachedDataCubeSource } from '@finos/legend-data-cube';
import { guaranteeType } from '@finos/legend-shared';

export function synthesizeCachedSource(
  source: LegendQueryDataCubeSource,
  builder: TDSBuilder,
) {
  const cachedSource = new CachedDataCubeSource();
  cachedSource.columns = source.columns;
  cachedSource.query = synthesizeQuery(
    guaranteeType(
      source.query,
      V1_AppliedFunction,
      `Can't process value specification`,
    ),
    'local::duckb::cachedStore.cached_tbl',
  );
  cachedSource.originalSource = source;
  cachedSource.model = serialize(synthesizeModel(builder));
  cachedSource.runtime = 'local::duckdb::runtime';
  return cachedSource;
}

function synthesizeQuery(query: V1_AppliedFunction, databaseAccessor: string) {
  addDatabaseAccessor(query, databaseAccessor);
  return query;
}

function addDatabaseAccessor(
  appliedFunction: V1_AppliedFunction,
  databaseAccessor: string,
) {
  if (
    appliedFunction.parameters[0] instanceof V1_AppliedFunction &&
    appliedFunction.parameters[0].function === 'getAll'
  ) {
    const classInstance = new V1_ClassInstance();
    classInstance.type = V1_ClassInstanceType.RELATION_STORE_ACCESSOR;
    const storeAccessor = new V1_RelationStoreAccessor();
    storeAccessor.path = [databaseAccessor];
    classInstance.value = storeAccessor;
    appliedFunction.parameters[0] = classInstance;
    return;
  } else {
    appliedFunction.parameters.forEach((param) => {
      if (param instanceof V1_AppliedFunction) {
        addDatabaseAccessor(param, databaseAccessor);
      }
    });
  }
}

function synthesizeModel(builder: TDSBuilder) {
  const schemas = synthesizeSchema([synthesizeTable(builder)]);
  const database = synthesizeDatabase([schemas]);
  const runtime = synthesizeRuntime(synthesizeConnection(), database);
  const packageableRuntime = new V1_PackageableRuntime();
  packageableRuntime.runtimeValue = runtime;
  packageableRuntime.package = 'local::duckdb';
  packageableRuntime.name = 'runtime';

  const pmcd = new V1_PureModelContextData();
  pmcd.elements = [database, packageableRuntime];
  return pmcd;
}

function synthesizeDatabase(schemas: V1_Schema[]) {
  const database = new V1_Database();
  database.name = 'cachedStore';
  database.package = 'local::duckdb';
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
  schema.name = 'main';
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

function synthesizeConnection() {
  const connection = new V1_RelationalDatabaseConnection();
  connection.databaseType = 'DuckDB';
  const dataSourceSpec = new V1_DuckDBDatasourceSpecification();
  dataSourceSpec.path = '/temp/path';
  connection.datasourceSpecification = dataSourceSpec;
  connection.authenticationStrategy = new V1_TestAuthenticationStrategy();
  return connection;
}

function synthesizeRuntime(
  connection: V1_RelationalDatabaseConnection,
  db: V1_Database,
) {
  const runtime = new V1_EngineRuntime();
  const storeConnections = new V1_StoreConnections();
  storeConnections.store = new V1_PackageableElementPointer(
    'STORE',
    db.package + '::' + db.name,
  );
  const idConnection = new V1_IdentifiedConnection();
  idConnection.connection = connection;
  idConnection.id = 'local_duckdb_connection';
  storeConnections.storeConnections = [idConnection];
  runtime.connections = [storeConnections];
  return runtime;
}
