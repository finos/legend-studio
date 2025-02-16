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

export class LegendDataCubeDuckDBEngine {
  private static readonly DUCKDB_DEFAULT_SCHEMA_NAME = 'main'; // See https://duckdb.org/docs/sql/statements/use.html
  private static readonly CACHE_TABLE_NAME_PREFIX = 'cache';
  private static readonly INGEST_TABLE_NAME_PREFIX = 'ingest';
  private static readonly CACHE_FILE_NAME = 'cacheData';
  private static readonly INGEST_FILE_DATA_FILE_NAME = 'ingestData';
  private static cacheTableCounter = 0;
  private static ingestFileTableCounter = 0;
  // https://duckdb.org/docs/guides/meta/describe.html
  private static readonly COLUMN_NAME = 'column_name';
  private static readonly COLUMN_TYPE = 'column_type';
  // Options for creating csv using papa parser: https://www.papaparse.com/docs#config
  private static readonly ESCAPE_CHAR = `'`;
  private static readonly QUOTE_CHAR = `'`;

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
    const schema = LegendDataCubeDuckDBEngine.DUCKDB_DEFAULT_SCHEMA_NAME;
    LegendDataCubeDuckDBEngine.cacheTableCounter += 1;
    const table = `${LegendDataCubeDuckDBEngine.CACHE_TABLE_NAME_PREFIX}${LegendDataCubeDuckDBEngine.cacheTableCounter}`;
    const csvFileName = `${LegendDataCubeDuckDBEngine.CACHE_FILE_NAME}${LegendDataCubeDuckDBEngine.cacheTableCounter}.csv`;

    const columnNames: string[] = [];
    result.builder.columns.forEach((col) => columnNames.push(col.name));

    const data = result.result.rows.map((row) => row.values);

    const csvContent = csvStringify([columnNames, ...data], {
      escapeChar: LegendDataCubeDuckDBEngine.ESCAPE_CHAR,
      quoteChar: LegendDataCubeDuckDBEngine.QUOTE_CHAR,
    });
    await this.database.registerFileText(csvFileName, csvContent);

    const connection = await this.database.connect();
    await connection.insertCSVFromPath(csvFileName, {
      schema: schema,
      name: table,
      create: true,
      header: true,
      detect: true,
      dateFormat: 'YYYY-MM-DD',
      timestampFormat: 'YYYY-MM-DD', // make sure Date is not auto-converted to timestamp
      escape: LegendDataCubeDuckDBEngine.ESCAPE_CHAR,
      quote: LegendDataCubeDuckDBEngine.QUOTE_CHAR,
    });
    await connection.close();

    return { schema, table, rowCount: result.result.rows.length };
  }

  async ingestLocalFileData(data: string, format: string) {
    const schema = LegendDataCubeDuckDBEngine.DUCKDB_DEFAULT_SCHEMA_NAME;
    LegendDataCubeDuckDBEngine.ingestFileTableCounter += 1;
    const table = `${LegendDataCubeDuckDBEngine.INGEST_TABLE_NAME_PREFIX}${LegendDataCubeDuckDBEngine.ingestFileTableCounter}`;
    const fileName = `${LegendDataCubeDuckDBEngine.INGEST_FILE_DATA_FILE_NAME}${LegendDataCubeDuckDBEngine.ingestFileTableCounter}`;

    await this._database?.registerFileText(fileName, data);

    const connection = await this.database.connect();

    switch (format.toLowerCase()) {
      case 'csv': {
        await connection.insertCSVFromPath(fileName, {
          schema: schema,
          name: table,
          header: true,
          detect: true,
          dateFormat: 'YYYY-MM-DD',
          timestampFormat: 'YYYY-MM-DD', // make sure Date is not auto-converted to timestamp
          escape: LegendDataCubeDuckDBEngine.ESCAPE_CHAR,
          quote: LegendDataCubeDuckDBEngine.QUOTE_CHAR,
        });
        break;
      }
      default: {
        throw new UnsupportedOperationError(
          `Can't ingest local file data: unsupported format '${format}'`,
        );
      }
    }

    const tableSpec = (await connection.query(`DESCRIBE ${schema}.${table}`))
      .toArray()
      .map((spec) => [
        spec[LegendDataCubeDuckDBEngine.COLUMN_NAME],
        spec[LegendDataCubeDuckDBEngine.COLUMN_TYPE],
      ]);
    await connection.close();

    return { schema, table, tableSpec };
  }

  async runSQLQuery(sql: string) {
    const connection = await this.database.connect();
    const result = await connection.query(sql);
    await connection.close();

    const data = result.toArray();
    const columnNames = result.schema.fields.map((field) => field.name);
    const rows = data.map((row) => {
      const tdsRow = new TDSRow();
      tdsRow.values = columnNames.map((column) => {
        const value = row[column] as unknown;
        // NOTE: DuckDB WASM returns ArrayBuffer for numeric value, such as for count(*)
        // so we need to convert it to number
        if (ArrayBuffer.isView(value)) {
          return row[column].valueOf() as number;
          // BigInt is not supported by ag-grid, so we need to convert it to native number
        } else if (typeof value === 'bigint') {
          return Number(value);
        }
        return value as string | number | boolean | null;
      });
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
        case Type.Timestamp:
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
