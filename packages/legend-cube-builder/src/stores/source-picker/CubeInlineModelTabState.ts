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
  type EnteredValue,
  FUNCTION_SOURCE_DEFINITION,
  type FunctionParameter,
  FunctionSource,
  getRelationalDisplayName,
  type ModelContext,
  parseValue,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  RelationalTableSource,
  resolveCubeType,
  getFunctionParameterValueError,
  Schema,
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
  type CubeOutlineFunction,
  type CubeOutlineRuntime,
  type CubeOutlineSchema,
  type CubeOutlineTable,
} from '../../graph-manager/CubeEngine.js';
import { getRuntimesForDatabase } from '../../graph-manager/CubeModelOutlineHelper.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { loadCubeModelOutline } from '../CubeHost.js';
import { recheckCubeFunctionSources } from '../CubeFunctionRecheck.js';
import { CUBE_FUNCTION_MESSAGE } from '../../__lib__/LegendCubeFunctionLabels.js';
import { type BundledModel, createTextModel } from '../LocalModelCatalog.js';
import {
  type CubeSourcePickerTab,
  CubeSourcePickerTabKey,
  CUBE_TABLE_PREVIEW_DELAY_MS,
  generateCubeNodeIds,
} from './CubeSourcePickerTab.js';

const toMessage = (error: unknown): string => {
  assertErrorThrown(error);
  return error instanceof CubeEngineError ? error.firstLine : error.message;
};

/** Whether a table can be picked: a table with a column Cube can't read can't */
export const isTableSelectable = (table: CubeOutlineTable): boolean =>
  !table.flags.includes(CubeTableFlag.UNAVAILABLE);

/** What the tab adds from the model: a table, or a function that returns a relation (PLAN §6.5) */
export enum CubeModelReadKind {
  TABLE = 'table',
  FUNCTION = 'function',
}

/**
 * A parameter's value from its text: none for empty text, whatever the type,
 * so an optional String left empty passes `[]`, not `''`
 */
export const readCubeFunctionValue = (
  text: string,
  parameter: FunctionParameter,
): EnteredValue => (text === '' ? undefined : parseValue(text, parameter.type));

/** A function's parameters as Cube types: `[0..1]` ones optional */
export const getCubeFunctionParameters = (
  fn: CubeOutlineFunction,
): FunctionParameter[] =>
  fn.parameters.map((parameter) => ({
    name: parameter.name,
    type: resolveCubeType(parameter.type),
    optional: parameter.multiplicity === '[0..1]',
  }));

/**
 * The source picker's Model tab (PLAN §6.2.7, Settled before M1.8): model,
 * then database, then a runtime keyed by that database, then schema and
 * table. A step with a single choice is picked automatically. The first
 * table fixes the cube's model and runtime; later tables come from the same
 * database and runtime. A table is added only once its schema has resolved.
 * It serves every cube no other tab claims, e.g. one on Pure text.
 */
export class CubeInlineModelTabState implements CubeSourcePickerTab {
  readonly key: CubeSourcePickerTabKey = CubeSourcePickerTabKey.MODEL;
  readonly label: string = 'Sample Data';
  readonly editorState: CubeEditorState;

  model: ModelContext | undefined;
  /** The model is Pure text the user pastes, not a bundled one */
  isPastingModel = false;
  pastedModelText = '';
  /** The model the paste box last loaded: only it keeps the box shown */
  private pastedModel: ModelContext | undefined;
  outline: CubeModelOutline | undefined;
  isLoadingModel = false;
  databasePath: string | undefined;
  runtimePath: string | undefined;
  schemaName: string | undefined;
  /** The picked tables, in the order picked; several are added at once */
  tableNames: readonly string[] = [];
  tableSearch = '';
  /** Whether the tab adds a table or a function */
  readKind = CubeModelReadKind.TABLE;
  functionSearch = '';
  /** The picked function's full name */
  functionSignature: string | undefined;
  /** The text entered for each of its parameters */
  functionValueTexts: string[] = [];
  /** The runtime picked for a function that leaves it to its caller */
  functionRuntimePath: string | undefined;
  isResolving = false;
  /** The table whose columns the tab shows under the list: the one picked last */
  previewTableName: string | undefined;
  /**
   * The columns of each table previewed, or why they couldn't be read, by
   * database, schema and table; Add takes them, so it asks the engine only
   * for the others (the review of the demo, 2026-10-13)
   */
  previewSchemas: ReadonlyMap<string, Schema | string> = new Map();
  /** Counts the model, database or runtime changes, so a late preview is dropped */
  private previewGeneration = 0;
  /** The preview waiting for the clicks to pause */
  private previewTimer: ReturnType<typeof setTimeout> | undefined;
  /** Why the outline or the table couldn't be loaded, shown in the dialog */
  error: string | undefined;
  /** Counts Add presses: closing the dialog moves it on, so the pending Add is dropped */
  private confirmRequest = 0;

  constructor(editorState: CubeEditorState) {
    makeObservable(this, {
      model: observable.ref,
      isPastingModel: observable,
      pastedModelText: observable,
      outline: observable.ref,
      isLoadingModel: observable,
      databasePath: observable,
      runtimePath: observable,
      schemaName: observable,
      tableNames: observable.ref,
      tableName: computed,
      tableSearch: observable,
      readKind: observable,
      functionSearch: observable,
      functionSignature: observable,
      functionValueTexts: observable.ref,
      functionRuntimePath: observable,
      isResolving: observable,
      previewTableName: observable,
      previewSchemas: observable.ref,
      previewedColumns: computed,
      loadPreview: flow,
      functions: computed,
      pickedFunction: computed,
      functionParameters: computed,
      functionValues: computed,
      functionRuntime: computed,
      functionRuntimes: computed,
      functionProblem: computed,
      setReadKind: action,
      setFunctionSearch: action,
      selectFunction: action,
      setFunctionValueText: action,
      selectFunctionRuntime: action,
      error: observable,
      fixedContext: computed,
      fixedDatabasePath: computed,
      databases: computed,
      runtimes: computed,
      schemas: computed,
      tables: computed,
      schemaTables: computed,
      canConfirm: computed,
      isBusy: computed,
      open: action,
      close: action,
      selectDatabase: action,
      selectRuntime: action,
      selectSchema: action,
      selectTable: action,
      toggleTable: action,
      setTableSearch: action,
      startPastingModel: action,
      setPastedModelText: action,
      selectModel: flow,
      loadPastedModel: flow,
      confirm: flow,
      confirmFunction: flow,
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

  /** The schema's tables, views left out */
  get schemaTables(): readonly CubeOutlineTable[] {
    return (
      this.schemas
        .find((schema) => schema.name === this.schemaName)
        ?.tables.filter((table) => !table.isView) ?? []
    );
  }

  /** The one picked table; none when several are */
  get tableName(): string | undefined {
    return this.tableNames.length === 1 ? this.tableNames[0] : undefined;
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

  /** The model's functions that return a relation, filtered by the search text */
  get functions(): readonly CubeOutlineFunction[] {
    const search = this.functionSearch.trim().toLowerCase();
    return (this.outline?.functions ?? []).filter((fn) =>
      fn.path.toLowerCase().includes(search),
    );
  }

  get pickedFunction(): CubeOutlineFunction | undefined {
    return this.outline?.functions?.find(
      (fn) => fn.signature === this.functionSignature,
    );
  }

  get functionParameters(): readonly FunctionParameter[] {
    const fn = this.pickedFunction;
    return fn ? getCubeFunctionParameters(fn) : [];
  }

  /** The value entered for each parameter */
  get functionValues(): readonly EnteredValue[] {
    return this.functionParameters.map((parameter, index) =>
      readCubeFunctionValue(this.functionValueTexts[index] ?? '', parameter),
    );
  }

  /**
   * The runtimes a function that leaves the runtime to its caller can run
   * on: the cube's, once it has one, else every runtime of the model
   */
  get functionRuntimes(): readonly CubeOutlineRuntime[] {
    const fixedRuntime = this.fixedContext?.runtime;
    return (this.outline?.runtimes ?? []).filter(
      (runtime) => fixedRuntime === undefined || runtime.path === fixedRuntime,
    );
  }

  /**
   * The runtime the picked function runs on: its own, when its body names
   * one; else the one picked
   */
  get functionRuntime(): string | undefined {
    return this.pickedFunction?.runtime ?? this.functionRuntimePath;
  }

  /** Why the picked function can't be added, if it can't */
  get functionProblem(): string | undefined {
    const fn = this.pickedFunction;
    if (!fn) {
      return undefined;
    }
    if (fn.problem !== undefined) {
      return fn.problem;
    }
    const fixedRuntime = this.fixedContext?.runtime;
    return fn.runtime !== undefined &&
      fixedRuntime !== undefined &&
      fn.runtime !== fixedRuntime
      ? CUBE_FUNCTION_MESSAGE.OTHER_RUNTIME(fn.runtime, fixedRuntime)
      : undefined;
  }

  /** The host serves the tab: it always serves models */
  get isAvailable(): boolean {
    return true;
  }

  get isBusy(): boolean {
    return this.isLoadingModel || this.isResolving;
  }

  /** The tab claims no cube: the dialog gives it every cube no other tab claims */
  ownsContext(context: CubeContext): boolean {
    return false;
  }

  get canConfirm(): boolean {
    if (this.readKind === CubeModelReadKind.FUNCTION) {
      return (
        !this.isLoadingModel &&
        !this.isResolving &&
        this.model !== undefined &&
        this.pickedFunction !== undefined &&
        this.functionProblem === undefined &&
        this.functionRuntime !== undefined &&
        this.functionParameters.every(
          (parameter, index) =>
            getFunctionParameterValueError(
              parameter,
              this.functionValues[index],
            ) === undefined,
        )
      );
    }
    // a picked table hidden by the search still counts
    const tables = this.tableNames.map((name) =>
      this.schemaTables.find((candidate) => candidate.name === name),
    );
    return (
      !this.isLoadingModel &&
      !this.isResolving &&
      this.model !== undefined &&
      this.runtimePath !== undefined &&
      tables.length > 0 &&
      tables.every((table) => table !== undefined && isTableSelectable(table))
    );
  }

  /**
   * When the dialog opens on the tab: on the cube's model, else the pasted
   * model while the paste box is shown, else the bundled model picked last,
   * else the first one. A model whose outline failed to load is loaded again.
   */
  open(): void {
    this.error = undefined;
    const model =
      this.fixedContext?.model ??
      (this.isPastingModel
        ? this.model
        : (
            this.models.find((bundled) => bundled.model === this.model) ??
            this.models[0]
          )?.model);
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
    } else {
      this.followFixedRuntime();
    }
  }

  /**
   * Takes the cube's runtime once it has one, e.g. a function's (PLAN
   * §6.5): its table and function steps can't pick another
   */
  protected followFixedRuntime(): void {
    const fixedRuntime = this.fixedContext?.runtime;
    if (fixedRuntime === undefined) {
      return;
    }
    if (this.runtimes.some((runtime) => runtime.path === fixedRuntime)) {
      this.runtimePath = fixedRuntime;
    }
    if (
      this.functionRuntimes.some((runtime) => runtime.path === fixedRuntime)
    ) {
      this.functionRuntimePath = fixedRuntime;
    }
  }

  /** When the dialog closes: a table still being typed is not added */
  close(): void {
    this.confirmRequest++;
    this.isResolving = false;
    this.cancelPreview();
  }

  /** Offers a text box for a Pure model in place of the bundled ones */
  startPastingModel(): void {
    this.isPastingModel = true;
    this.model = undefined;
    this.outline = undefined;
    this.error = undefined;
    this.isLoadingModel = false;
    this.resetFrom('database');
  }

  setPastedModelText(text: string): void {
    this.pastedModelText = text;
  }

  /**
   * Loads the pasted Pure text as the model: the cube will hold the text
   * itself, so it counts towards the size a saved cube can have
   */
  *loadPastedModel(): GeneratorFn<void> {
    if (this.pastedModelText.trim()) {
      this.pastedModel = createTextModel(this.pastedModelText);
      yield flowResult(this.selectModel(this.pastedModel));
    }
  }

  /**
   * Loads a model's outline. Any model but the one the paste box loaded ends
   * pasting, e.g. a bundled model, or the model of a cube opened meanwhile.
   */
  *selectModel(model: ModelContext): GeneratorFn<void> {
    this.isPastingModel = model === this.pastedModel;
    this.model = model;
    this.outline = undefined;
    this.error = undefined;
    this.resetFrom('database');
    this.isLoadingModel = true;
    try {
      const outline = (yield loadCubeModelOutline(
        this.editorState.host,
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

  /** Picks the table alone, in place of any picked, and previews its columns */
  selectTable(name: string | undefined): void {
    this.tableNames = name === undefined ? [] : [name];
    this.error = undefined;
    this.preview(name);
  }

  /** Adds the table to the picked ones, previewing it, or takes it out */
  toggleTable(name: string): void {
    const adding = !this.tableNames.includes(name);
    this.tableNames = adding
      ? [...this.tableNames, name]
      : this.tableNames.filter((each) => each !== name);
    this.error = undefined;
    this.preview(adding ? name : this.tableNames.at(-1));
  }

  private previewKey(table: string): string {
    return `${this.databasePath ?? ''}\u0000${this.schemaName ?? ''}\u0000${table}`;
  }

  /** The previewed table's columns, `undefined` while they load, or why they couldn't be read */
  get previewedColumns(): Schema | string | undefined {
    const name = this.previewTableName;
    return name === undefined
      ? undefined
      : this.previewSchemas.get(this.previewKey(name));
  }

  /**
   * Previews the table once the clicks pause, so picking several in a row
   * asks the engine for the last only; Add, Close and another pick cancel it
   */
  private preview(name: string | undefined): void {
    this.previewTableName = name;
    this.cancelPreview();
    if (name !== undefined) {
      this.previewTimer = setTimeout(() => {
        this.previewTimer = undefined;
        flowResult(this.loadPreview(name)).catch(
          this.editorState.host.applicationStore.alertUnhandledError,
        );
      }, CUBE_TABLE_PREVIEW_DELAY_MS);
    }
  }

  private cancelPreview(): void {
    if (this.previewTimer !== undefined) {
      clearTimeout(this.previewTimer);
      this.previewTimer = undefined;
    }
  }

  /** Reads a table's columns from the engine, once a table and a model's database */
  *loadPreview(name: string): GeneratorFn<void> {
    const key = this.previewKey(name);
    const model = this.model;
    const database = this.databasePath;
    const schemaName = this.schemaName;
    if (
      this.previewSchemas.has(key) ||
      !model ||
      database === undefined ||
      schemaName === undefined
    ) {
      return;
    }
    const generation = this.previewGeneration;
    // an id of its own, as the engine stamps the table's accessor with it
    const id = this.editorState.document.query.generateId(
      RelationalTableSource.TYPE,
    );
    let answer: Schema | string;
    try {
      const typed = (yield this.editorState.host.engine.resolveSchemas(
        model,
        new Map([[id, [database, schemaName, name]]]),
      )) as Awaited<
        ReturnType<typeof this.editorState.host.engine.resolveSchemas>
      >;
      const schema = typed.get(id);
      answer =
        schema instanceof Schema
          ? schema
          : (schema?.message ?? 'The engine gave no schema for this table');
    } catch (error) {
      answer = toMessage(error);
    }
    if (generation === this.previewGeneration) {
      this.previewSchemas = new Map(this.previewSchemas).set(key, answer);
    }
  }

  /** How many sources Add adds */
  get pickedCount(): number {
    return this.readKind === CubeModelReadKind.FUNCTION
      ? 1
      : this.tableNames.length;
  }

  setTableSearch(search: string): void {
    this.tableSearch = search;
  }

  /**
   * What the tab reads: a model's tables or functions; a project's tables
   * and functions each have a tab of their own (user, 2026-10-13)
   */
  get readKinds(): readonly CubeModelReadKind[] {
    return [CubeModelReadKind.TABLE, CubeModelReadKind.FUNCTION];
  }

  /** Reads tables or functions, when the tab reads that kind */
  setReadKind(kind: CubeModelReadKind): void {
    if (this.readKinds.includes(kind)) {
      this.readKind = kind;
      this.error = undefined;
    }
  }

  setFunctionSearch(search: string): void {
    this.functionSearch = search;
  }

  /** Picks a function; its parameters start empty, and its runtime is the only one there is */
  selectFunction(signature: string | undefined): void {
    if (signature === this.functionSignature) {
      return;
    }
    this.functionSignature = signature;
    this.functionValueTexts = [];
    this.error = undefined;
    const [onlyRuntime, ...otherRuntimes] = this.functionRuntimes;
    this.functionRuntimePath =
      onlyRuntime && !otherRuntimes.length ? onlyRuntime.path : undefined;
  }

  setFunctionValueText(index: number, text: string): void {
    const texts = [...this.functionValueTexts];
    texts[index] = text;
    this.functionValueTexts = texts;
  }

  selectFunctionRuntime(path: string | undefined): void {
    this.functionRuntimePath = path;
  }

  /**
   * Types the picked table with the engine, then adds it; the first table
   * also sets the cube's model and runtime, in the same undo step. The cube
   * may have changed while the engine answered: the table is added only if
   * the cube still has the same model and runtime and can take it. Gives
   * whether the table was added.
   */
  *confirm(): GeneratorFn<boolean> {
    if (!this.canConfirm) {
      return false;
    }
    if (this.readKind === CubeModelReadKind.FUNCTION) {
      return (yield flowResult(this.confirmFunction())) as boolean;
    }
    const { editorState } = this;
    const model = this.model as ModelContext;
    const runtime = this.runtimePath as string;
    const database = this.databasePath as string;
    const schemaName = this.schemaName as string;
    const names = [...this.tableNames];
    const contextBefore = editorState.document.context;
    // the engine stamps each table's accessor with its node id, so the ids come first
    const ids = generateCubeNodeIds(
      editorState.document.query,
      RelationalTableSource.TYPE,
      names.length,
    );
    this.cancelPreview();
    const request = ++this.confirmRequest;
    this.isResolving = true;
    this.error = undefined;
    try {
      // a table previewed has its columns already: the engine types the others
      const previewed = new Map<string, Schema>();
      names.forEach((table, index) => {
        const schema = this.previewSchemas.get(this.previewKey(table));
        if (schema instanceof Schema) {
          previewed.set(ids[index] as string, schema);
        }
      });
      const toType = names
        .map((table, index) => [ids[index] as string, table] as const)
        .filter(([id]) => !previewed.has(id));
      const typed = new Map<string, Schema | CubeEngineError>(previewed);
      if (toType.length) {
        const answer = (yield editorState.host.engine.resolveSchemas(
          model,
          new Map(
            toType.map(([id, table]) => [id, [database, schemaName, table]]),
          ),
        )) as Awaited<
          ReturnType<typeof editorState.host.engine.resolveSchemas>
        >;
        answer.forEach((schema, id) => typed.set(id, schema));
      }
      if (request !== this.confirmRequest) {
        return false;
      }
      const { document } = editorState;
      if (document.context !== contextBefore) {
        throw new Error(
          `The cube changed while the table was loading; pick the table again.`,
        );
      }
      // each table typed is added, in the order picked; the first one picked
      // is the one that runs on an empty cube, as a single table would be
      let query = document.query;
      const added: string[] = [];
      const failed: string[] = [];
      // with several tables, each failure names its table
      const named = (table: string, message: string): string =>
        names.length > 1
          ? `${getRelationalDisplayName(table)}: ${message}`
          : message;
      names.forEach((table, index) => {
        const id = ids[index] as string;
        const schema = typed.get(id);
        if (schema === undefined || schema instanceof CubeEngineError) {
          failed.push(
            named(
              table,
              schema?.message ?? 'The engine gave no schema for this table',
            ),
          );
          return;
        }
        const node = RELATIONAL_TABLE_SOURCE_DEFINITION.resolve(
          RELATIONAL_TABLE_SOURCE_DEFINITION.fromCoordinates(id, {
            database,
            schema: schemaName,
            table,
          }),
          { kind: 'resolved', schema },
        );
        if (!query.canAdd(node)) {
          failed.push(
            named(
              table,
              'The cube changed while the table was loading; pick the table again.',
            ),
          );
          return;
        }
        query = query.add(node);
        added.push(table);
      });
      if (added.length) {
        // the first table sets the model and runtime; a cube saved with a model
        // but no runtime takes the picked runtime and keeps the rest
        editorState.applyDocument(
          document.context?.runtime !== undefined
            ? document.withQuery(query)
            : document
                .withContext({
                  ...document.context,
                  model: document.context?.model ?? model,
                  runtime,
                })
                .withQuery(query),
        );
      }
      if (failed.length) {
        // the tables added aren't picked any more, so Add again adds only the others
        this.tableNames = names.filter((table) => !added.includes(table));
        this.error = failed.join('\n');
        return false;
      }
      this.resetFrom('table');
      return true;
    } catch (error) {
      if (request === this.confirmRequest) {
        this.error = toMessage(error);
      }
      return false;
    } finally {
      if (request === this.confirmRequest) {
        this.isResolving = false;
      }
    }
  }

  /**
   * Types the picked function's call with the engine, then adds it with its
   * values; the first source also sets the cube's model and runtime, in the
   * same undo step: the function's own runtime when its body names one
   * (PLAN §6.5). Gives whether the function was added.
   */
  *confirmFunction(): GeneratorFn<boolean> {
    const { editorState } = this;
    const model = this.model as ModelContext;
    const fn = this.pickedFunction as CubeOutlineFunction;
    const runtime = this.functionRuntime as string;
    const contextBefore = editorState.document.context;
    const id = editorState.document.query.generateId(FunctionSource.TYPE);
    const unresolved = FUNCTION_SOURCE_DEFINITION.fromCoordinates(id, {
      function: fn.path,
      signature: fn.signature,
      parameters: this.functionParameters,
      values: this.functionValues,
    });
    const request = ++this.confirmRequest;
    this.isResolving = true;
    this.error = undefined;
    try {
      const typed = (yield recheckCubeFunctionSources(
        editorState.host.engine,
        model,
        [unresolved],
      )) as Awaited<ReturnType<typeof recheckCubeFunctionSources>>;
      if (request !== this.confirmRequest) {
        return false;
      }
      const schema = typed.get(id);
      if (schema === undefined || schema instanceof CubeEngineError) {
        throw (
          schema ??
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            CUBE_FUNCTION_MESSAGE.NO_ANSWER,
          )
        );
      }
      const node = FUNCTION_SOURCE_DEFINITION.resolve(unresolved, {
        kind: 'resolved',
        schema,
      });
      const { document } = editorState;
      if (document.context !== contextBefore || !document.query.canAdd(node)) {
        throw new Error(CUBE_FUNCTION_MESSAGE.CUBE_CHANGED);
      }
      const query = document.query.add(node);
      editorState.applyDocument(
        document.context?.runtime !== undefined
          ? document.withQuery(query)
          : document
              .withContext({
                ...document.context,
                model: document.context?.model ?? model,
                runtime,
              })
              .withQuery(query),
      );
      this.functionSignature = undefined;
      this.functionValueTexts = [];
      return true;
    } catch (error) {
      if (request === this.confirmRequest) {
        this.error = toMessage(error);
      }
      return false;
    } finally {
      if (request === this.confirmRequest) {
        this.isResolving = false;
      }
    }
  }

  protected resetFrom(step: 'database' | 'runtime' | 'table'): void {
    if (step === 'database') {
      this.databasePath = undefined;
      this.functionSignature = undefined;
      this.functionValueTexts = [];
      this.functionRuntimePath = undefined;
      this.functionSearch = '';
    }
    if (step === 'database' || step === 'runtime') {
      this.runtimePath = undefined;
      this.schemaName = undefined;
      // another model or database: its previews go, and late ones are dropped
      this.previewGeneration++;
      this.previewSchemas = new Map();
    }
    this.tableNames = [];
    this.tableSearch = '';
    this.previewTableName = undefined;
    this.cancelPreview();
  }
}
