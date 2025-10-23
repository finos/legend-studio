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
  CORE_PURE_PATH,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  INTERNAL__TDSColumn,
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
  TDSBuilder,
  TDSExecutionResult,
  TDSRow,
  TabularDataSet,
} from '@finos/legend-graph';
import {
  assertNonNullable,
  csvStringify,
  formatDate,
  guaranteeNonNullable,
  isNullable,
  UnsupportedOperationError,
  uuid,
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
  private _catalog: Map<string, DuckDBCatalogTable> = new Map();

  private _database?: duckdb.AsyncDuckDB | undefined;

  private get database(): duckdb.AsyncDuckDB {
    return guaranteeNonNullable(
      this._database,
      `Cache manager database not initialized`,
    );
  }

  retrieveCatalogTable(ref: string) {
    return guaranteeNonNullable(
      this._catalog.get(ref),
      `Can't find reference ${ref}`,
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

    const connection = await this.database.connect();
    await connection.query(`SET builtin_httpfs = false;`);
  }

  async cache(result: TDSExecutionResult) {
    const schema = LegendDataCubeDuckDBEngine.DUCKDB_DEFAULT_SCHEMA_NAME;
    LegendDataCubeDuckDBEngine.cacheTableCounter += 1;
    const table = `${LegendDataCubeDuckDBEngine.CACHE_TABLE_NAME_PREFIX}${LegendDataCubeDuckDBEngine.cacheTableCounter}`;
    const csvFileName = `${LegendDataCubeDuckDBEngine.CACHE_FILE_NAME}${LegendDataCubeDuckDBEngine.cacheTableCounter}.csv`;

    const columns: string[] = [];
    const columnNames: string[] = [];
    result.builder.columns.forEach((col) => {
      let colType: string;
      switch (col.type as string) {
        case PRIMITIVE_TYPE.BINARY: {
          colType = 'BIT';
          break;
        }
        case PRIMITIVE_TYPE.BOOLEAN: {
          colType = 'BOOLEAN';
          break;
        }
        case PRECISE_PRIMITIVE_TYPE.DOUBLE:
        case PRECISE_PRIMITIVE_TYPE.NUMERIC:
        case PRIMITIVE_TYPE.NUMBER: {
          colType = 'DOUBLE';
          break;
        }
        case PRECISE_PRIMITIVE_TYPE.INT:
        case PRECISE_PRIMITIVE_TYPE.TINY_INT:
        case PRECISE_PRIMITIVE_TYPE.U_TINY_INT:
        case PRECISE_PRIMITIVE_TYPE.SMALL_INT:
        case PRECISE_PRIMITIVE_TYPE.U_SMALL_INT:
        case PRECISE_PRIMITIVE_TYPE.U_INT:
        case PRECISE_PRIMITIVE_TYPE.BIG_INT:
        case PRECISE_PRIMITIVE_TYPE.U_BIG_INT:
        case PRIMITIVE_TYPE.INTEGER: {
          colType = 'INTEGER';
          break;
        }
        // TODO: we need precision and scale
        case PRECISE_PRIMITIVE_TYPE.DECIMAL:
        case PRIMITIVE_TYPE.DECIMAL: {
          colType = 'DECIMAL';
          break;
        }
        case PRECISE_PRIMITIVE_TYPE.FLOAT:
        case PRIMITIVE_TYPE.FLOAT: {
          colType = 'FLOAT';
          break;
        }
        case PRECISE_PRIMITIVE_TYPE.STRICTDATE:
        case PRIMITIVE_TYPE.STRICTDATE:
        case PRIMITIVE_TYPE.DATE: {
          colType = 'DATE';
          break;
        }
        case PRECISE_PRIMITIVE_TYPE.TIMESTAMP:
        case PRECISE_PRIMITIVE_TYPE.STRICTTIME:
        case PRECISE_PRIMITIVE_TYPE.DATETIME:
        case PRIMITIVE_TYPE.DATETIME: {
          colType = 'TIMESTAMP';
          break;
        }
        case PRECISE_PRIMITIVE_TYPE.VARCHAR:
        case CORE_PURE_PATH.VARIANT:
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

    const data = result.result.rows.map((row) => row.values);

    const csvContent = csvStringify([columnNames, ...data]);
    await this.database.registerFileText(csvFileName, csvContent);

    const connection = await this.database.connect();

    // we create our own table schema becuase of date type conversions from arrow to duckDB data types
    const CREATE_TABLE_SQL = `CREATE TABLE ${schema}.${table} (${columns.join(',')})`;
    await connection.query(CREATE_TABLE_SQL);

    await connection.insertCSVFromPath(csvFileName, {
      schema: schema,
      name: table,
      create: false,
      header: true, // we add header and get it to autodetect otherwise we would have to provide column details with arrow datatypes
      detect: true,
    });
    await connection.close();

    return { schema, table, rowCount: result.result.rows.length };
  }

  async ingestLocalFileData(data: string, format: string, refId?: string) {
    if (!isNullable(refId) && this._catalog.has(refId)) {
      const dbDetails = guaranteeNonNullable(this._catalog.get(refId));
      return {
        dbReference: refId,
        columnNames: dbDetails.columns.map((col) => col[0] as string),
      };
    }
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
        spec[LegendDataCubeDuckDBEngine.COLUMN_NAME] as string,
        spec[LegendDataCubeDuckDBEngine.COLUMN_TYPE] as string,
      ]);
    await connection.close();

    const ref = isNullable(refId) ? uuid() : refId;
    this._catalog.set(ref, {
      schemaName: schema,
      tableName: table,
      columns: tableSpec,
    } satisfies DuckDBCatalogTable);

    return {
      dbReference: ref,
      columnNames: tableSpec.map((spec) => spec[0] as string),
    };
  }

  async ingestIcebergTable(
    warehouse: string,
    paths: string[],
    catalogApi: string,
    token?: string,
  ) {
    const schemaName = LegendDataCubeDuckDBEngine.DUCKDB_DEFAULT_SCHEMA_NAME;
    LegendDataCubeDuckDBEngine.ingestFileTableCounter += 1;
    const tableName = `${LegendDataCubeDuckDBEngine.INGEST_TABLE_NAME_PREFIX}${LegendDataCubeDuckDBEngine.ingestFileTableCounter}`;

    const connection = await this.database.connect();

    const secret = `CREATE OR REPLACE SECRET iceberg_secret (
      TYPE ICEBERG,
      TOKEN '${token}'
    );`;
    await connection.query(secret);

    const catalog = `ATTACH OR REPLACE '${warehouse}' AS iceberg_catalog (
      TYPE iCEBERG,
      SECRET iceberg_secret,
      ENDPOINT '${catalogApi}',
      SUPPORT_NESTED_NAMESPACES true
    );`;
    await connection.query(catalog);

    const selectQuery = `SELECT * from iceberg_catalog."${paths[0]}.${paths[1]}".${paths[2]};`;
    const results = await connection.query(selectQuery);

    await connection.insertArrowTable(results, {
      name: tableName,
      create: true,
      schema: schemaName,
    });

    const describeQuery = `DESCRIBE ${schemaName}.${tableName};`;
    const describeResult = await connection.query(describeQuery);

    const tableSpec = describeResult
      .toArray()
      .map((spec) => [
        spec[LegendDataCubeDuckDBEngine.COLUMN_NAME] as string,
        spec[LegendDataCubeDuckDBEngine.COLUMN_TYPE] as string,
      ]);
    await connection.close();

    const ref = uuid();
    this._catalog.set(ref, {
      schemaName,
      tableName,
      columns: tableSpec,
    } satisfies DuckDBCatalogTable);

    return {
      dbReference: ref,
    };
  }

  async runSQLQuery(sql: string) {
    const connection = await this.database.connect();
    const result = await connection.query(sql);
    await connection.close();

    const data = result.toArray();
    const columnNames = result.schema.fields.map((field) => field.name);
    const columnTypesIds = result.schema.fields.map((field) => field.typeId);
    const rows = data.map((row) => {
      const tdsRow = new TDSRow();
      tdsRow.values = columnNames.map((column, idx) => {
        const value = row[column] as unknown;
        // NOTE: DuckDB WASM returns ArrayBuffer for numeric value, such as for count(*)
        // so we need to convert it to number
        if (ArrayBuffer.isView(value)) {
          return row[column].valueOf() as number;
        } else if (columnTypesIds[idx] === Type.Date) {
          return formatDate(new Date(Number(value)), DATE_FORMAT);
        } else if (columnTypesIds[idx] === Type.Timestamp) {
          return formatDate(new Date(Number(value)), DATE_TIME_FORMAT);
        } else if (typeof value === 'bigint') {
          // BigInt is not supported by ag-grid, so we need to convert it to native number
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
        case Type.Date:
        case Type.DateDay:
        case Type.DateMillisecond: {
          col.type = PRIMITIVE_TYPE.DATE;
          break;
        }
        case Type.Timestamp: {
          col.type = PRIMITIVE_TYPE.DATETIME;
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

export type DuckDBCatalogTable = {
  schemaName: string;
  tableName: string;
  columns: string[][];
};
