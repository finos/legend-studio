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
  CubeEngineError,
  CubeEngineErrorKind,
  CubeTableFlag,
  type CubeModelOutline,
  type CubeOutlineDatabase,
  type CubeOutlineRuntime,
  type CubeOutlineSchema,
  type CubeOutlineTable,
} from '../graph-manager/CubeEngine.js';
import { getRuntimesForDatabase } from '../graph-manager/CubeModelOutlineHelper.js';
import type { CubeEditorState } from './CubeEditorState.js';
import type { BundledModel } from './LocalModelCatalog.js';

const toMessage = (error: unknown): string => {
  assertErrorThrown(error);
  return error instanceof CubeEngineError ? error.firstLine : error.message;
};

/** Whether a table can be picked: a table with a column Cube can't read can't */
export const isTableSelectable = (table: CubeOutlineTable): boolean =>
  !table.flags.includes(CubeTableFlag.UNAVAILABLE);

/**
 * The source picker (PLAN §6.2.7, Settled before M1.8): model, then database,
 * then a runtime keyed by that database, then schema and table. A step with
 * a single choice is picked automatically. The first table fixes the cube's
 * model and runtime; later tables come from the same database and runtime.
 * A table is added only once its schema has resolved.
 */
export class CubeSourcePickerState {
  readonly editorState: CubeEditorState;

  isOpen = false;
  model: ModelContext | undefined;
  outline: CubeModelOutline | undefined;
  isLoadingModel = false;
  databasePath: string | undefined;
  runtimePath: string | undefined;
  schemaName: string | undefined;
  tableName: string | undefined;
  tableSearch = '';
  isResolving = false;
  /** Why the outline or the table couldn't be loaded, shown in the dialog */
  error: string | undefined;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      isOpen: observable,
      model: observable.ref,
      outline: observable.ref,
      isLoadingModel: observable,
      databasePath: observable,
      runtimePath: observable,
      schemaName: observable,
      tableName: observable,
      tableSearch: observable,
      isResolving: observable,
      error: observable,
      fixedContext: computed,
      fixedDatabasePath: computed,
      databases: computed,
      runtimes: computed,
      schemas: computed,
      tables: computed,
      canConfirm: computed,
      open: action,
      close: action,
      selectDatabase: action,
      selectRuntime: action,
      selectSchema: action,
      selectTable: action,
      setTableSearch: action,
      selectModel: flow,
      confirm: flow,
    });
    this.editorState = editorState;
  }

  get models(): readonly BundledModel[] {
    return this.editorState.host.modelCatalog.models;
  }

  /** Once the cube has a model, every table comes from it */
  get fixedContext(): CubeContext | undefined {
    return this.editorState.document.context;
  }

  /** Once the cube has a table, every other one comes from its database */
  get fixedDatabasePath(): string | undefined {
    return this.editorState.document.query.nodes.find(
      (node): node is RelationalTableSource =>
        node instanceof RelationalTableSource,
    )?.database;
  }

  get databases(): readonly CubeOutlineDatabase[] {
    const databases = this.outline?.databases ?? [];
    const fixedRuntime = this.fixedContext?.runtime;
    return databases.filter(
      (database) =>
        (this.fixedDatabasePath === undefined ||
          database.path === this.fixedDatabasePath) &&
        (fixedRuntime === undefined ||
          (this.outline &&
            getRuntimesForDatabase(this.outline, database.path).some(
              (runtime) => runtime.path === fixedRuntime,
            ))),
    );
  }

  get runtimes(): readonly CubeOutlineRuntime[] {
    if (!this.outline || this.databasePath === undefined) {
      return [];
    }
    const fixedRuntime = this.fixedContext?.runtime;
    return getRuntimesForDatabase(this.outline, this.databasePath).filter(
      (runtime) => fixedRuntime === undefined || runtime.path === fixedRuntime,
    );
  }

  get schemas(): readonly CubeOutlineSchema[] {
    return (
      this.databases.find((database) => database.path === this.databasePath)
        ?.schemas ?? []
    );
  }

  /** The schema's tables, views left out, filtered by the search text */
  get tables(): readonly CubeOutlineTable[] {
    const search = this.tableSearch.trim().toLowerCase();
    return (
      this.schemas.find((schema) => schema.name === this.schemaName)?.tables ??
      []
    ).filter(
      (table) =>
        !table.isView &&
        getRelationalDisplayName(table.name).toLowerCase().includes(search),
    );
  }

  get canConfirm(): boolean {
    const table = this.tables.find(
      (candidate) => candidate.name === this.tableName,
    );
    return (
      !this.isLoadingModel &&
      !this.isResolving &&
      this.model !== undefined &&
      this.runtimePath !== undefined &&
      table !== undefined &&
      isTableSelectable(table)
    );
  }

  /**
   * Opens the dialog on the cube's model, or on the only model offered. A
   * model whose outline failed to load is loaded again.
   */
  open(): void {
    this.isOpen = true;
    this.error = undefined;
    const model =
      this.fixedContext?.model ??
      (this.models.length === 1 ? this.models[0]?.model : this.model);
    if (!model) {
      return;
    }
    if (model !== this.model || !this.outline) {
      flowResult(this.selectModel(model)).catch(
        this.editorState.host.applicationStore.alertUnhandledError,
      );
    } else if (
      this.databasePath !== undefined &&
      !this.databases.some((database) => database.path === this.databasePath)
    ) {
      // the cube changed since the last pick, e.g. by undo
      const [onlyDatabase, ...otherDatabases] = this.databases;
      this.selectDatabase(
        onlyDatabase && !otherDatabases.length ? onlyDatabase.path : undefined,
      );
    }
  }

  close(): void {
    this.isOpen = false;
  }

  *selectModel(model: ModelContext): GeneratorFn<void> {
    this.model = model;
    this.outline = undefined;
    this.error = undefined;
    this.resetFrom('database');
    this.isLoadingModel = true;
    try {
      const outline = (yield this.editorState.host.modelCatalog.loadOutline(
        model,
      )) as CubeModelOutline;
      if (this.model !== model) {
        return;
      }
      this.outline = outline;
      const [onlyDatabase, ...otherDatabases] = this.databases;
      if (onlyDatabase && !otherDatabases.length) {
        this.selectDatabase(onlyDatabase.path);
      }
    } catch (error) {
      if (this.model === model) {
        this.error = toMessage(error);
      }
    } finally {
      if (this.model === model) {
        this.isLoadingModel = false;
      }
    }
  }

  selectDatabase(path: string | undefined): void {
    this.databasePath = path;
    this.resetFrom('runtime');
    const [onlyRuntime, ...otherRuntimes] = this.runtimes;
    if (onlyRuntime && !otherRuntimes.length) {
      this.runtimePath = onlyRuntime.path;
    }
    const [onlySchema, ...otherSchemas] = this.schemas;
    if (onlySchema && !otherSchemas.length) {
      this.schemaName = onlySchema.name;
    }
  }

  selectRuntime(path: string | undefined): void {
    this.runtimePath = path;
  }

  selectSchema(name: string | undefined): void {
    this.schemaName = name;
    this.resetFrom('table');
  }

  selectTable(name: string | undefined): void {
    this.tableName = name;
    this.error = undefined;
  }

  setTableSearch(search: string): void {
    this.tableSearch = search;
  }

  /**
   * Types the picked table with the engine, then adds it; the first table
   * also sets the cube's model and runtime, in the same undo step. The cube
   * may have changed while the engine answered: the table is added only if
   * the cube still has the same model and runtime and can take it.
   */
  *confirm(): GeneratorFn<void> {
    if (!this.canConfirm) {
      return;
    }
    const { editorState } = this;
    const model = this.model as ModelContext;
    const runtime = this.runtimePath as string;
    const coordinates = {
      database: this.databasePath as string,
      schema: this.schemaName as string,
      table: this.tableName as string,
    };
    const contextBefore = editorState.document.context;
    // the engine stamps the table's accessor with its node id, so the id comes first
    const id = editorState.document.query.generateId(
      RelationalTableSource.TYPE,
    );
    this.isResolving = true;
    this.error = undefined;
    try {
      const typed = (yield editorState.host.engine.resolveSchemas(
        model,
        new Map([
          [id, [coordinates.database, coordinates.schema, coordinates.table]],
        ]),
      )) as Awaited<ReturnType<typeof editorState.host.engine.resolveSchemas>>;
      const schema = typed.get(id);
      if (schema === undefined || schema instanceof CubeEngineError) {
        throw (
          schema ??
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            `The engine gave no schema for this table`,
          )
        );
      }
      const node = RELATIONAL_TABLE_SOURCE_DEFINITION.resolve(
        RELATIONAL_TABLE_SOURCE_DEFINITION.fromCoordinates(id, coordinates),
        { kind: 'resolved', schema },
      );
      const { document } = editorState;
      if (document.context !== contextBefore || !document.query.canAdd(node)) {
        throw new Error(
          `The cube changed while the table was loading; pick the table again.`,
        );
      }
      const query = document.query.add(node);
      editorState.applyDocument(
        document.context
          ? document.withQuery(query)
          : document.withContext({ model, runtime }).withQuery(query),
      );
      this.isOpen = false;
      this.resetFrom('table');
    } catch (error) {
      this.error = toMessage(error);
    } finally {
      this.isResolving = false;
    }
  }

  private resetFrom(step: 'database' | 'runtime' | 'table'): void {
    if (step === 'database') {
      this.databasePath = undefined;
    }
    if (step === 'database' || step === 'runtime') {
      this.runtimePath = undefined;
      this.schemaName = undefined;
    }
    this.tableName = undefined;
    this.tableSearch = '';
  }
}
