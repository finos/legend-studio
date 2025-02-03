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
import { action, makeObservable, observable } from 'mobx';
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';

export class LegendDataCubeDataCubeCacheEngine {
  db?: duckdb.AsyncDuckDB | undefined;
  conn?: AsyncDuckDBConnection | undefined;

  constructor() {
    makeObservable(this, {
      db: observable,
      initializeDuckDb: action,
    });
  }

  async initializeDuckDb(result: TDSExecutionResult): Promise<void> {
    const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
      mvp: {
        mainModule: duckdb_wasm,
        mainWorker: new URL(
          '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js',
          import.meta.url,
        ).toString(),
      },
      eh: {
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
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    this.db = new duckdb.AsyncDuckDB(logger, worker);
    await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    this.conn = await this.db.connect();

    let columns: string[] = [];
    result.builder.columns.forEach((col) =>
      columns.push(`"${col.name}" ${this.getDuckDbType(col.type)}`),
    );

    const CREATE_TABLE_SQL = `CREATE TABLE cached_tbl (${columns.join(',')})`;
    await this.conn.query(CREATE_TABLE_SQL);

    let rowString: string[] = [];

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

    await this.conn.query(INSERT_TABLE_SQL);
    return Promise.resolve();
  }

  async runQuery(sql: string) {
    const result = await this.conn?.query(sql);
    const columnNames = Object.keys(result?.toArray().at(0));
    const result1 = result?.toArray().map((row) => {
      const values = new TDSRow();
      values.values = columnNames.map((column) => row[column]);
      return values;
    });
    const tdsExecutionResult = new TDSExecutionResult();
    const tds = new TabularDataSet();
    tds.columns = columnNames;
    tds.rows = result1!;
    tdsExecutionResult.result = tds;
    return tdsExecutionResult;
  }

  async clearDuckDb() {
    await this.conn?.close();
    await this.db?.flushFiles();
    await this.db?.terminate();
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
