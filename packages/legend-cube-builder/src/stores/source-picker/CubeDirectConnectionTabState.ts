/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  type CubeContext,
  getRelationalDisplayName,
  type ModelContext,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  RelationalTableSource,
} from '@finos/legend-cube';
import { assertErrorThrown, type GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  CUBE_CSV_MESSAGE,
  CUBE_DIRECT_MESSAGE,
  CUBE_DIRECT_SAMPLE_SETUP_SQL,
} from '../../__lib__/LegendCubeDirectConnectionLabels.js';
import {
  type CubeConnectionDescription,
  type CubeConnectionDraft,
  type CubeConnectionExplorer,
  type CubeDirectConnection,
  CubeDirectDatabaseType,
  type CubeExploredTable,
} from '../../graph-manager/CubeConnectionExplorer.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_RUNTIME_PATH,
  getCubeDirectConnection,
  getCubeDirectTableCoordinates,
} from '../../graph-manager/CubeDirectConnection.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  CubeTableFlag,
} from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import {
  buildCubeCsvTable,
  CUBE_CSV_SCHEMA,
  CubeCsvError,
} from './CubeCsvSetupSql.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
} from './CubeSourcePickerTab.js';

/** An error as the tab shows it: its first line, with the rest on demand (R48) */
export interface CubeDirectConnectionError {
  readonly message: string;
  readonly detail?: string | undefined;
}

const toError = (error: unknown): CubeDirectConnectionError => {
  assertErrorThrown(error);
  return error instanceof CubeEngineError
    ? {
        message: error.firstLine,
        detail: error.detail !== error.firstLine ? error.detail : undefined,
      }
    : { message: error.message };
};

/**
 * The statements of setup SQL as the form takes it: a statement ends with a
 * line that ends with a semicolon, so a statement may span lines and hold a
 * semicolon elsewhere
 */
export const splitCubeSetupSql = (text: string): string[] => {
  const statements: string[] = [];
  let lines: string[] = [];
  const finish = (): void => {
    const statement = lines.join('\n').trim();
    if (statement) {
      statements.push(statement);
    }
    lines = [];
  };
  text.split(/\r?\n/u).forEach((line) => {
    const trimmed = line.trimEnd();
    if (trimmed.endsWith(';')) {
      lines.push(trimmed.slice(0, -1));
      finish();
    } else {
      lines.push(line);
    }
  });
  finish();
  return statements;
};

/** A file's text, read with a FileReader */
const readFileText = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () =>
      reject(reader.error ?? new Error("The file can't be read"));
    reader.readAsText(file);
  });

/** Whether a table can be picked: a table with a column Cube can't read can't */
export const isExploredTableSelectable = (table: CubeExploredTable): boolean =>
  !table.flags.includes(CubeTableFlag.UNAVAILABLE);

/**
 * The source picker's database connection tab (PLAN §6.8): a connection
 * form, then Test Connection, which lists its schemas, then a schema's
 * tables. Add types the table, then adds it; the first table saves the
 * connection as the cube's model. Once saved, the connection can't be edited
 * here (D8): its schemas are listed when the dialog opens. Any edit, or
 * closing the dialog, drops the answers still on their way.
 */
export class CubeDirectConnectionTabState implements CubeSourcePickerTab {
  readonly key = CubeSourcePickerTabKey.DIRECT_CONNECTION;
  readonly label = 'Direct Connection';
  readonly editorState: CubeEditorState;

  databaseType = CubeDirectDatabaseType.H2;
  setupSqlText = CUBE_DIRECT_SAMPLE_SETUP_SQL;
  /** DuckDB only: a database file on the engine's host, or '' for an in-memory database */
  duckDbPath = '';
  /** The connection's schemas; none until the connection is tested */
  schemas: readonly string[] | undefined;
  schemaName: string | undefined;
  /** The schema's tables; none until they are listed */
  schemaTables: readonly CubeExploredTable[] | undefined;
  /** The picked table, by its stored (quoted) name */
  tableName: string | undefined;
  tableSearch = '';
  isTesting = false;
  isListing = false;
  isResolving = false;
  error: CubeDirectConnectionError | undefined;
  /** DuckDB only: a CSV to add to the setup SQL as a table, pasted or read from a file */
  csvText = '';
  /** The CSV's table name: a chosen file's name, or what the viewer types */
  csvTableName = '';
  /** What the last CSV did: the table it added, or why it couldn't */
  csvNote: { readonly message: string; readonly isError: boolean } | undefined;

  /** The connection the schemas were listed from */
  private testedConnection: CubeDirectConnection | undefined;
  /** Each counts its calls: an edit or closing the dialog moves it on, so a late answer is dropped */
  private testRequest = 0;
  private listRequest = 0;
  private confirmRequest = 0;
  private csvFileRequest = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      databaseType: observable,
      setupSqlText: observable,
      duckDbPath: observable,
      schemas: observable.ref,
      schemaName: observable,
      schemaTables: observable.ref,
      tableName: observable,
      tableSearch: observable,
      isTesting: observable,
      isListing: observable,
      isResolving: observable,
      error: observable.ref,
      csvText: observable,
      csvTableName: observable,
      csvNote: observable.ref,
      fixedConnection: computed,
      isAvailable: computed,
      isOffered: computed,
      isBusy: computed,
      setupSqls: computed,
      formProblem: computed,
      // kept while unobserved too: the tab compares connections by identity
      connection: computed({ keepAlive: true }),
      description: computed,
      tables: computed,
      canTest: computed,
      canConfirm: computed,
      canAddCsv: computed,
      setDatabaseType: action,
      setSetupSqlText: action,
      setDuckDbPath: action,
      selectSchema: action,
      selectTable: action,
      setTableSearch: action,
      setCsvText: action,
      setCsvTableName: action,
      addCsv: action,
      loadCsvFile: flow,
      open: action,
      close: action,
      testConnection: flow,
      listTables: flow,
      confirm: flow,
    });
    this.editorState = editorState;
  }

  get explorer(): CubeConnectionExplorer | undefined {
    return this.editorState.host.connectionExplorer;
  }

  /** The cube's saved connection: once its first table is picked, every table comes from it */
  get fixedConnection(): CubeDirectConnection | undefined {
    const model = this.editorState.document.context?.model;
    return model ? getCubeDirectConnection(model) : undefined;
  }

  /** Hosts without a connection explorer have no database connections */
  get isAvailable(): boolean {
    return this.explorer !== undefined;
  }

  /** The tab is for an empty cube or a direct one, never a cube on a model (R11) */
  get isOffered(): boolean {
    return (
      this.isAvailable &&
      (this.editorState.document.context === undefined ||
        this.fixedConnection !== undefined)
    );
  }

  get isBusy(): boolean {
    return this.isTesting || this.isListing || this.isResolving;
  }

  ownsContext(context: CubeContext): boolean {
    return getCubeDirectConnection(context.model) !== undefined;
  }

  get setupSqls(): readonly string[] {
    return splitCubeSetupSql(this.setupSqlText);
  }

  /** What the form lacks before it makes a connection */
  get formProblem(): string | undefined {
    return this.databaseType === CubeDirectDatabaseType.H2 &&
      !this.setupSqls.length
      ? CUBE_DIRECT_MESSAGE.H2_NEEDS_SETUP_SQL
      : undefined;
  }

  /** The cube's connection, or the one the form describes */
  get connection(): CubeDirectConnection | undefined {
    if (this.fixedConnection) {
      return this.fixedConnection;
    }
    if (!this.explorer || this.formProblem) {
      return undefined;
    }
    const draft: CubeConnectionDraft = {
      databaseType: this.databaseType,
      setupSqls: this.setupSqls,
      ...(this.databaseType === CubeDirectDatabaseType.DUCKDB
        ? { path: this.duckDbPath.trim() }
        : {}),
    };
    return this.explorer.buildConnection(draft);
  }

  /** Whether Cube can use the connection, and its summary: no engine call */
  get description(): CubeConnectionDescription | undefined {
    return this.connection && this.explorer
      ? this.explorer.describeConnection(this.connection)
      : undefined;
  }

  /** The schema's tables, filtered by the search text on their names as stored */
  get tables(): readonly CubeExploredTable[] {
    const search = this.tableSearch.trim().toLowerCase();
    return (this.schemaTables ?? []).filter((table) =>
      getRelationalDisplayName(table.name).toLowerCase().includes(search),
    );
  }

  get canTest(): boolean {
    return (
      this.isOffered &&
      !this.isTesting &&
      !this.isResolving &&
      this.description?.supported === true
    );
  }

  get canConfirm(): boolean {
    const table = this.schemaTables?.find(
      (candidate) => candidate.storedName === this.tableName,
    );
    return (
      this.isOffered &&
      !this.isTesting &&
      !this.isListing &&
      !this.isResolving &&
      this.connection !== undefined &&
      this.connection === this.testedConnection &&
      this.schemaName !== undefined &&
      table !== undefined &&
      isExploredTableSelectable(table)
    );
  }

  /** A CSV is loaded into an in-memory DuckDB database, before the cube has a connection */
  get canAddCsv(): boolean {
    return (
      !this.fixedConnection &&
      this.databaseType === CubeDirectDatabaseType.DUCKDB &&
      this.csvText.trim() !== ''
    );
  }

  setCsvText(text: string): void {
    this.csvText = text;
    this.csvNote = undefined;
  }

  setCsvTableName(name: string): void {
    this.csvTableName = name;
    this.csvNote = undefined;
  }

  /** Reads a chosen file as the CSV, its name (without extension) as the table's */
  *loadCsvFile(file: File): GeneratorFn<void> {
    const request = ++this.csvFileRequest;
    try {
      const text = (yield readFileText(file)) as string;
      if (request !== this.csvFileRequest) {
        return;
      }
      this.csvText = text;
      this.csvTableName = file.name.replace(/\.[^.]*$/u, '');
      this.csvNote = undefined;
    } catch {
      if (request === this.csvFileRequest) {
        this.csvNote = {
          message: CUBE_CSV_MESSAGE.UNREADABLE_FILE(file.name),
          isError: true,
        };
      }
    }
  }

  /**
   * Adds the CSV to the setup SQL as a table: in place of the sample setup
   * SQL the form starts with, after any other. Says why when it can't.
   */
  addCsv(): boolean {
    if (!this.canAddCsv) {
      return false;
    }
    try {
      const table = buildCubeCsvTable(this.csvText, this.csvTableName);
      const existing = this.setupSqlText.trim();
      this.setSetupSqlText(
        existing === '' || existing === CUBE_DIRECT_SAMPLE_SETUP_SQL
          ? table.sql
          : `${existing}\n${table.sql}`,
      );
      this.csvFileRequest++;
      this.csvText = '';
      this.csvTableName = '';
      this.csvNote = {
        message: CUBE_CSV_MESSAGE.ADDED(
          `${CUBE_CSV_SCHEMA}.${table.table}`,
          table.rowCount,
          table.columns.length,
        ),
        isError: false,
      };
      return true;
    } catch (error) {
      if (!(error instanceof CubeCsvError)) {
        throw error;
      }
      this.csvNote = { message: error.message, isError: true };
      return false;
    }
  }

  setDatabaseType(databaseType: CubeDirectDatabaseType): void {
    if (!this.fixedConnection && databaseType !== this.databaseType) {
      this.databaseType = databaseType;
      this.resetResults();
    }
  }

  setSetupSqlText(text: string): void {
    if (!this.fixedConnection && text !== this.setupSqlText) {
      this.setupSqlText = text;
      this.resetResults();
    }
  }

  setDuckDbPath(path: string): void {
    if (!this.fixedConnection && path !== this.duckDbPath) {
      this.duckDbPath = path;
      this.resetResults();
    }
  }

  selectSchema(name: string | undefined): void {
    if (name === this.schemaName) {
      return;
    }
    this.schemaName = name;
    this.listRequest++;
    this.schemaTables = undefined;
    this.isListing = false;
    this.resetTable();
    if (name !== undefined) {
      flowResult(this.listTables(name)).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  selectTable(storedName: string | undefined): void {
    this.tableName = storedName;
    this.error = undefined;
  }

  setTableSearch(search: string): void {
    this.tableSearch = search;
  }

  /**
   * When the dialog opens on the tab: answers read from another connection
   * than the cube's are dropped, e.g. after an undo; a saved connection's
   * schemas are listed, which is the tab's only engine call on opening
   */
  open(): void {
    if (this.connection !== this.testedConnection) {
      this.resetResults();
    }
    if (this.fixedConnection && this.schemas === undefined && this.canTest) {
      flowResult(this.testConnection()).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    } else if (
      this.schemaName !== undefined &&
      this.schemaTables === undefined &&
      !this.isListing
    ) {
      // the dialog closed while the schema's tables were listing
      flowResult(this.listTables(this.schemaName)).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    }
  }

  /** Drops every answer still on its way */
  close(): void {
    this.testRequest++;
    this.listRequest++;
    this.confirmRequest++;
    this.isTesting = false;
    this.isListing = false;
    this.isResolving = false;
  }

  /** Lists the connection's schemas; with a single one, lists its tables */
  *testConnection(): GeneratorFn<void> {
    const { explorer, connection } = this;
    if (!this.canTest || !explorer || !connection) {
      return;
    }
    this.resetResults();
    const request = ++this.testRequest;
    this.isTesting = true;
    try {
      const schemas = (yield explorer.listSchemas(
        connection,
      )) as readonly string[];
      if (request !== this.testRequest) {
        return;
      }
      this.schemas = schemas;
      this.testedConnection = connection;
      const [onlySchema, ...otherSchemas] = schemas;
      if (onlySchema === undefined) {
        this.error = { message: CUBE_DIRECT_MESSAGE.NO_SCHEMA_FOUND };
      } else if (!otherSchemas.length) {
        this.selectSchema(onlySchema);
      }
    } catch (error) {
      if (request === this.testRequest) {
        this.error = toError(error);
      }
    } finally {
      if (request === this.testRequest) {
        this.isTesting = false;
      }
    }
  }

  /** Lists a schema's tables; a retry lists them again */
  *listTables(schema: string): GeneratorFn<void> {
    const { explorer, connection } = this;
    if (!explorer || !connection || connection !== this.testedConnection) {
      return;
    }
    const request = ++this.listRequest;
    this.isListing = true;
    this.error = undefined;
    try {
      const tables = (yield explorer.listTables(
        connection,
        schema,
      )) as readonly CubeExploredTable[];
      if (request !== this.listRequest) {
        return;
      }
      this.schemaTables = tables;
    } catch (error) {
      if (request === this.listRequest) {
        this.error = toError(error);
      }
    } finally {
      if (request === this.listRequest) {
        this.isListing = false;
      }
    }
  }

  /**
   * Types the picked table with the engine, then adds it; the first table
   * also saves the connection as the cube's model, with the direct runtime,
   * in the same undo step. The cube may have changed while the engine
   * answered: the table is added only if the cube still has the same context
   * and can take it. Gives whether the table was added.
   */
  *confirm(): GeneratorFn<boolean> {
    if (!this.canConfirm) {
      return false;
    }
    const { editorState } = this;
    const contextBefore = editorState.document.context;
    const model: ModelContext =
      contextBefore?.model ??
      createCubeDirectModel(this.connection as CubeDirectConnection);
    const table = this.schemaTables?.find(
      (candidate) => candidate.storedName === this.tableName,
    ) as CubeExploredTable;
    const coordinates = getCubeDirectTableCoordinates(
      this.schemaName as string,
      table,
    );
    // the engine stamps the table's accessor with its node id, so the id comes first
    const id = editorState.document.query.generateId(
      RelationalTableSource.TYPE,
    );
    const request = ++this.confirmRequest;
    this.isResolving = true;
    this.error = undefined;
    try {
      const typed = (yield editorState.host.engine.resolveSchemas(
        model,
        new Map([
          [id, [coordinates.database, coordinates.schema, coordinates.table]],
        ]),
      )) as Awaited<ReturnType<typeof editorState.host.engine.resolveSchemas>>;
      if (request !== this.confirmRequest) {
        return false;
      }
      const schema = typed.get(id);
      if (schema === undefined || schema instanceof CubeEngineError) {
        throw (
          schema ??
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            CUBE_DIRECT_MESSAGE.NO_TABLE_SCHEMA,
          )
        );
      }
      const node = RELATIONAL_TABLE_SOURCE_DEFINITION.resolve(
        RELATIONAL_TABLE_SOURCE_DEFINITION.fromCoordinates(id, coordinates),
        { kind: 'resolved', schema },
      );
      const { document } = editorState;
      if (document.context !== contextBefore || !document.query.canAdd(node)) {
        throw new Error(CUBE_DIRECT_MESSAGE.CUBE_CHANGED);
      }
      const query = document.query.add(node);
      editorState.applyDocument(
        document.context
          ? document.withQuery(query)
          : document
              .withContext({ model, runtime: CUBE_DIRECT_RUNTIME_PATH })
              .withQuery(query),
      );
      // what was tested is now the cube's connection
      this.testedConnection = this.connection;
      this.resetTable();
      return true;
    } catch (error) {
      if (request === this.confirmRequest) {
        this.error = toError(error);
      }
      return false;
    } finally {
      if (request === this.confirmRequest) {
        this.isResolving = false;
      }
    }
  }

  /** Forgets what was read from the connection: it changed, or its answers are stale */
  private resetResults(): void {
    this.testRequest++;
    this.listRequest++;
    this.confirmRequest++;
    this.isTesting = false;
    this.isListing = false;
    this.isResolving = false;
    this.testedConnection = undefined;
    this.schemas = undefined;
    this.schemaName = undefined;
    this.schemaTables = undefined;
    this.error = undefined;
    this.resetTable();
  }

  private resetTable(): void {
    this.tableName = undefined;
    this.tableSearch = '';
  }
}
