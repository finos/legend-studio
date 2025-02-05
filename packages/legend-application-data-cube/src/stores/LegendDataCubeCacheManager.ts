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
  TDSExecutionResult,
  TDSRow,
  TabularDataSet,
} from '@finos/legend-graph';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import { assertNonNullable } from '@finos/legend-shared';

export class LegendDataCubeDataCubeCacheEngine {
  private _database?: duckdb.AsyncDuckDB | undefined;
  private _connection?: AsyncDuckDBConnection | undefined;

  // Documentation: https://duckdb.org/docs/api/wasm/instantiation.html
  async initializeDuckDb(result: TDSExecutionResult) {
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
    assertNonNullable(bundle.mainWorker, `Can't initialize duck db`);
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    this._database = new duckdb.AsyncDuckDB(logger, worker);
    await this._database.instantiate(bundle.mainModule, bundle.pthreadWorker);
    this._connection = await this._database.connect();

    const columns: string[] = [];
    result.builder.columns.forEach((col) =>
      columns.push(`"${col.name}" ${this.getDuckDbType(col.type)}`),
    );

    const CREATE_TABLE_SQL = `CREATE TABLE cached_tbl (${columns.join(',')})`;
    await this._connection.query(CREATE_TABLE_SQL);

    const rowString: string[] = [];

    result.result.rows.forEach((row) => {
      const updatedRows = row.values.map((val) => {
        if (val !== null && typeof val === 'string') {
          return `'${val.replaceAll(`'`, `''`)}'`;
        } else if (val === null) {
          return `NULL`;
        }
        return val;
      });
      rowString.push(`(${updatedRows.join(',')})`);
    });

    const INSERT_TABLE_SQL = `INSERT INTO cached_tbl VALUES ${rowString.join(',')}`;

    await this._connection.query(INSERT_TABLE_SQL);
  }

  async runQuery(sql: string) {
    const result = await this._connection?.query(sql);
    const columnNames = Object.keys(result?.toArray().at(0));
    const rows = result?.toArray().map((row) => {
      const values = new TDSRow();
      values.values = columnNames.map(
        (column) => row[column] as string | number | boolean | null,
      );
      return values;
    });
    const tdsExecutionResult = new TDSExecutionResult();
    const tds = new TabularDataSet();
    tds.columns = columnNames;
    tds.rows = rows !== undefined ? rows : [new TDSRow()];
    tdsExecutionResult.result = tds;
    return tdsExecutionResult;
  }

  async clearDuckDb() {
    await this._connection?.close();
    await this._database?.flushFiles();
    await this._database?.terminate();
  }

  private getDuckDbType(type: string | undefined): string {
    switch (type?.toLowerCase()) {
      //TODO: mapping from tds build to duckdb data types
      case 'string':
        return 'VARCHAR';
      case 'boolean':
        return 'BOOLEAN';
      case 'bigint':
        return 'BIGINT';
      case 'number':
        return 'DOUBLE';
      case 'integer':
        return 'INTEGER';
      case 'date':
        return 'TIMESTAMP';
      default:
        return 'VARCHAR';
    }
  }
}
