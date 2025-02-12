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

import * as duckdb from '@duckdb/duckdb-wasm';
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm';
import duckdb_wasm_next from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm';
import {
  INTERNAL__TDSColumn,
  PRIMITIVE_TYPE,
  TDSBuilder,
  TDSExecutionResult,
  TDSRow,
  TabularDataSet,
} from '@finos/legend-graph';
import {
  assertNonNullable,
  csvStringify,
  guaranteeNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { CachedDataCubeSource } from '@finos/legend-data-cube';
import { Type } from 'apache-arrow';

export class LegendDataCubeDataCubeCacheManager {
  private static readonly DUCKDB_DEFAULT_SCHEMA_NAME = 'main'; // See https://duckdb.org/docs/sql/statements/use.html
  private static readonly TABLE_NAME_PREFIX = 'cache';
  private static readonly CSV_FILE_NAME = 'data';
  private static tableCounter = 0;

  private _database?: duckdb.AsyncDuckDB | undefined;

  private get database(): duckdb.AsyncDuckDB {
    return guaranteeNonNullable(
      this._database,
      `Cache manager database not initialized`,
    );
  }

  async initialize() {
    // Initialize DuckDB with WASM
    // See: https://duckdb.org/docs/api/wasm/instantiation.html
    const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
      mvp: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        mainModule: duckdb_wasm,
        mainWorker: new URL(
          '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
          import.meta.url,
        ).toString(),
      },
      eh: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        mainModule: duckdb_wasm_next,
        mainWorker: new URL(
          '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js',
          import.meta.url,
        ).toString(),
      },
    };
    // Select a bundle based on browser checks
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    // Instantiate the asynchronus version of DuckDB-wasm
    assertNonNullable(
      bundle.mainWorker,
      `Can't initialize cache manager: DuckDB main worker not initialized`,
    );
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING); // only show warnings and errors
    const database = new duckdb.AsyncDuckDB(logger, worker);
    await database.instantiate(bundle.mainModule, bundle.pthreadWorker);
    this._database = database;
  }

  async cache(result: TDSExecutionResult) {
    const schema =
      LegendDataCubeDataCubeCacheManager.DUCKDB_DEFAULT_SCHEMA_NAME;
    LegendDataCubeDataCubeCacheManager.tableCounter += 1;
    const table = `${LegendDataCubeDataCubeCacheManager.TABLE_NAME_PREFIX}${LegendDataCubeDataCubeCacheManager.tableCounter}`;
    const csvFileName = `${LegendDataCubeDataCubeCacheManager.CSV_FILE_NAME}${LegendDataCubeDataCubeCacheManager.tableCounter}.csv`;

    const connection = await this.database.connect();

    const columns: string[] = [];
    const columnNames: string[] = [];
    result.builder.columns.forEach((col) => {
      let colType: string;
      switch (col.type as string) {
        case PRIMITIVE_TYPE.BOOLEAN: {
          colType = 'BOOLEAN';
          break;
        }
        case PRIMITIVE_TYPE.INTEGER: {
          colType = 'INTEGER';
          break;
        }
        case PRIMITIVE_TYPE.NUMBER:
        case PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.FLOAT: {
          colType = 'FLOAT';
          break;
        }
        // We don't use type DATE because DuckDB will automatically convert it to a TIMESTAMP
        case PRIMITIVE_TYPE.STRICTDATE:
        case PRIMITIVE_TYPE.DATETIME:
        case PRIMITIVE_TYPE.DATE: {
          colType = 'VARCHAR';
          break;
        }
        case PRIMITIVE_TYPE.STRING: {
          colType = 'VARCHAR';
          break;
        }
        default: {
          throw new UnsupportedOperationError(
            `Can't initialize cache: failed to find matching DuckDB type for Pure type '${col.type}'`,
          );
        }
      }
      columns.push(`"${col.name}" ${colType}`);
      columnNames.push(col.name);
    });

    const CREATE_TABLE_SQL = `CREATE TABLE ${schema}.${table} (${columns.join(',')})`;
    await connection.query(CREATE_TABLE_SQL);

    const data = result.result.rows.map((row) => row.values);

    const csv = csvStringify([columnNames, ...data], {
      escapeChar: `'`,
      quoteChar: `'`,
    });

    await this._database?.registerFileText(csvFileName, csv);

    await connection.insertCSVFromPath(csvFileName, {
      schema: schema,
      name: table,
      create: false,
      escape: `'`,
      quote: `'`,
      delimiter: ',',
    });

    await connection.close();

    return { table, schema, rowCount: result.result.rows.length };
  }

  async runSQLQuery(sql: string) {
    const connection = await this.database.connect();
    const result = await connection.query(sql);
    await connection.close();

    const data = result.toArray();
    const columnNames = result.schema.fields.map((field) => field.name);
    const rows = data.map((row) => {
      const tdsRow = new TDSRow();
      tdsRow.values = columnNames.map(
        (column) =>
          // NOTE: DuckDB WASM returns ArrayBuffer for numeric value, such as for count(*)
          // so we need to convert it to number
          (ArrayBuffer.isView(row[column])
            ? row[column].valueOf()
            : row[column]) as string | number | boolean | null,
      );
      return tdsRow;
    });
    const tdsExecutionResult = new TDSExecutionResult();
    const tds = new TabularDataSet();
    tds.columns = columnNames;
    tds.rows = rows;
    tdsExecutionResult.result = tds;
    const builder = new TDSBuilder();
    builder.columns = result.schema.fields.map((field) => {
      const col = new INTERNAL__TDSColumn();
      col.name = field.name;
      switch (field.typeId) {
        case Type.Binary: {
          col.type = PRIMITIVE_TYPE.BINARY;
          break;
        }
        case Type.Bool: {
          col.type = PRIMITIVE_TYPE.BOOLEAN;
          break;
        }
        case Type.Date:
        case Type.DateDay:
        case Type.DateMillisecond: {
          col.type = PRIMITIVE_TYPE.DATE;
          break;
        }
        case Type.Utf8:
        case Type.LargeUtf8: {
          col.type = PRIMITIVE_TYPE.STRING;
          break;
        }
        case Type.Decimal: {
          col.type = PRIMITIVE_TYPE.DECIMAL;
          break;
        }
        case Type.Int:
        case Type.Int8:
        case Type.Uint8:
        case Type.Int16:
        case Type.Uint16:
        case Type.Int32:
        case Type.Uint32:
        case Type.Int64:
        case Type.Uint64: {
          col.type = PRIMITIVE_TYPE.INTEGER;
          break;
        }
        case Type.Float:
        case Type.Float16:
        case Type.Float32:
        case Type.Float64: {
          col.type = PRIMITIVE_TYPE.FLOAT;
          break;
        }
        default: {
          throw new UnsupportedOperationError(
            `Can't find matching Pure type for Arrow type ID '${field.typeId}' ${Type.Utf8}`,
          );
        }
      }
      return col;
    });
    tdsExecutionResult.builder = builder;
    return tdsExecutionResult;
  }

  async disposeCache(source: CachedDataCubeSource) {
    const connection = await this.database.connect();
    const DROP_TABLE_SQL = `DROP TABLE IF EXISTS "${source.schema}.${source.table}"`;
    await connection.query(DROP_TABLE_SQL);
    await connection.close();
  }

  async dispose() {
    await this._database?.flushFiles();
    await this._database?.terminate();
  }
}
