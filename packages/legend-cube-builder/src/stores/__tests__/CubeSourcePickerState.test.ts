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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  CubeDocument,
  type ModelContext,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  FAKE_NORTHWIND_OUTLINE,
  FAKE_NORTHWIND_SCHEMAS,
  type FakeCubeEngineAnswers,
} from '../../__test-utils__/FakeCubeEngine.js';
import {
  type CubeEngine,
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
  type CubeOutlineTable,
  CubeTableFlag,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { createTextModel } from '../LocalModelCatalog.js';

type ResolvedSchemas = Awaited<ReturnType<CubeEngine['resolveSchemas']>>;

const OTHER_DATABASE = 'test::OtherDatabase';
const NORTHWIND_SCHEMAS = FAKE_NORTHWIND_OUTLINE.databases[0]?.schemas ?? [];

const outlineTable = (
  name: string,
  flags: CubeTableFlag[] = [],
  isView = false,
): CubeOutlineTable => ({ name, isView, columnCount: 2, flags });

/**
 * Two databases, each with two schemas that hold a table of the same name;
 * the first database has one runtime, the second two
 */
const TWO_DATABASES: CubeModelOutline = {
  databases: ['test::DbA', 'test::DbB'].map((path) => ({
    path,
    schemas: [
      { name: 'S1', tables: [outlineTable('ORDERS')] },
      { name: 'S2', tables: [outlineTable('ORDERS')] },
    ],
  })),
  runtimes: [
    { path: 'test::RA', storePaths: ['test::DbA'] },
    { path: 'test::RB1', storePaths: ['test::DbB'] },
    { path: 'test::RB2', storePaths: ['test::DbB'] },
  ],
};

const setUp = (
  answers?: FakeCubeEngineAnswers,
  document?: CubeDocument,
): ReturnType<typeof TEST__createCubeHost> & { state: CubeEditorState } => {
  const created = TEST__createCubeHost(answers);
  return { ...created, state: new CubeEditorState(created.host, document) };
};

const waitForOutline = async (state: CubeEditorState): Promise<void> => {
  for (
    let tries = 0;
    tries < 10 && state.sourcePicker.isLoadingModel;
    tries++
  ) {
    await Promise.resolve();
  }
};

/** Opens the picker and waits for the model's outline */
const openPicker = async (state: CubeEditorState): Promise<void> => {
  state.sourcePicker.open();
  await waitForOutline(state);
};

const pick = async (
  state: CubeEditorState,
  schema: string,
  table: string,
): Promise<void> => {
  const picker = state.sourcePicker;
  picker.selectSchema(schema);
  picker.selectTable(table);
  await flowResult(picker.confirm());
};

/** A deferred promise, to hold an engine call open */
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

/**
 * The cube's node ids: a failed match on the nodes themselves can't be
 * reported across Jest's workers, since their schemas hold BigInts
 */
const nodeIds = (state: CubeEditorState): string[] =>
  state.document.query.nodes.map(({ id }) => id);

/** Lets anything scheduled after the last step run, e.g. a run started from a timer */
const nextMacrotask = async (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  localStorage.clear();
});

describe('Cube source picker: choosing a table', () => {
  test('Opens on the only model and picks the only database and runtime', async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    const picker = state.sourcePicker;
    expect(fake.loadModel).toHaveBeenCalledWith(CUBE_NORTHWIND_MODEL);
    expect(picker.model).toBe(CUBE_NORTHWIND_MODEL);
    expect(picker.databasePath).toBe(NORTHWIND_DATABASE);
    expect(picker.runtimePath).toBe(NORTHWIND_RUNTIME);
    expect(picker.schemaName).toBe('NORTHWIND');
    expect(picker.tables.map((table) => table.name)).toEqual([
      'ORDERS',
      'CUSTOMERS',
    ]);
  });

  test('Offers only the runtimes keyed by exactly the database', async () => {
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      runtimes: [
        { path: 'test::Exact', storePaths: [NORTHWIND_DATABASE] },
        { path: 'test::OtherStore', storePaths: ['test::OtherDatabase'] },
        // a runtime reaching the database only through an include
        { path: 'test::Including', storePaths: ['test::IncludingDatabase'] },
      ],
    };
    const { state } = setUp({ outline });
    await openPicker(state);
    expect(state.sourcePicker.runtimes.map((runtime) => runtime.path)).toEqual([
      'test::Exact',
    ]);
    expect(state.sourcePicker.runtimePath).toBe('test::Exact');
  });

  test('Asks for the runtime when the database has several, and the schema when there are several', async () => {
    const outline: CubeModelOutline = {
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            { name: 'A', tables: [] },
            { name: 'B', tables: [] },
          ],
        },
      ],
      runtimes: [
        { path: 'test::One', storePaths: [NORTHWIND_DATABASE] },
        { path: 'test::Two', storePaths: [NORTHWIND_DATABASE] },
      ],
    };
    const { state } = setUp({ outline });
    await openPicker(state);
    expect(state.sourcePicker.runtimePath).toBeUndefined();
    expect(state.sourcePicker.schemaName).toBeUndefined();
  });

  test('Keeps Add disabled until a runtime is chosen, when the database has several', async () => {
    const { state } = setUp({ outline: TWO_DATABASES });
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectDatabase('test::DbB');
    picker.selectSchema('S1');
    picker.selectTable('ORDERS');
    expect(picker.runtimePath).toBeUndefined();
    expect(picker.canConfirm).toBe(false);
    picker.selectRuntime('test::RB1');
    expect(picker.canConfirm).toBe(true);
  });

  test('Changing the database or the schema drops the choices after it', async () => {
    const { state } = setUp({ outline: TWO_DATABASES });
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectDatabase('test::DbA');
    expect(picker.runtimePath).toBe('test::RA');
    picker.selectSchema('S1');
    picker.selectTable('ORDERS');
    expect(picker.canConfirm).toBe(true);
    // DbB has an S1.ORDERS too, but not DbA's runtime
    picker.selectDatabase('test::DbB');
    expect(picker.runtimePath).toBeUndefined();
    expect(picker.schemaName).toBeUndefined();
    expect(picker.tableName).toBeUndefined();
    expect(picker.canConfirm).toBe(false);

    picker.selectRuntime('test::RB1');
    picker.selectSchema('S1');
    picker.setTableSearch('ord');
    picker.selectTable('ORDERS');
    expect(picker.canConfirm).toBe(true);
    // S2 has a table of the same name, which the user hasn't picked
    picker.selectSchema('S2');
    expect(picker.tableName).toBeUndefined();
    expect(picker.tableSearch).toBe('');
    expect(picker.canConfirm).toBe(false);
  });

  test('Changing the model drops every choice after it, while the new model loads', async () => {
    const { state, fake } = setUp({ outline: TWO_DATABASES });
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectDatabase('test::DbB');
    picker.selectRuntime('test::RB2');
    picker.selectSchema('S1');
    picker.selectTable('ORDERS');
    expect(picker.canConfirm).toBe(true);
    const held = deferred<CubeModelOutline>();
    fake.loadModel.mockReturnValueOnce(held.promise);
    const loading = flowResult(
      picker.selectModel(createTextModel('###Pure\nClass my::Other {}')),
    );
    expect(picker.isLoadingModel).toBe(true);
    expect([
      picker.databasePath,
      picker.runtimePath,
      picker.schemaName,
      picker.tableName,
    ]).toEqual([undefined, undefined, undefined, undefined]);
    expect(picker.canConfirm).toBe(false);
    held.resolve(TWO_DATABASES);
    await loading;
    // two databases: nothing is picked for the user
    expect(picker.databasePath).toBeUndefined();
    expect(picker.canConfirm).toBe(false);
  });

  test('Hides views, filters tables by the name they show, and blocks only a table Cube cannot read', async () => {
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            {
              name: 'CUBETEST',
              tables: [
                outlineTable('PROBLEM_BINARY', [CubeTableFlag.UNAVAILABLE]),
                outlineTable('PROBLEM_CHAR', [CubeTableFlag.LENGTH_UNKNOWN]),
                outlineTable('PROBLEM_OTHER', [CubeTableFlag.TYPE_UNKNOWN]),
                outlineTable('PROBLEM_VIEW', [], true),
                outlineTable('"ORDER.LINES"'),
              ],
            },
          ],
        },
      ],
    };
    const { state } = setUp({ outline });
    await openPicker(state);
    const picker = state.sourcePicker;
    expect(picker.tables.map(({ name }) => name)).toEqual([
      'PROBLEM_BINARY',
      'PROBLEM_CHAR',
      'PROBLEM_OTHER',
      '"ORDER.LINES"',
    ]);
    picker.selectTable('PROBLEM_BINARY');
    expect(picker.canConfirm).toBe(false);
    // a length or a type Cube doesn't know is flagged, not blocked
    picker.selectTable('PROBLEM_CHAR');
    expect(picker.canConfirm).toBe(true);
    picker.selectTable('PROBLEM_OTHER');
    expect(picker.canConfirm).toBe(true);
    // a quoted name is searched as it shows, without its quotes
    picker.setTableSearch('order.l');
    expect(picker.tables.map(({ name }) => name)).toEqual(['"ORDER.LINES"']);
    picker.setTableSearch('"order');
    expect(picker.tables.map(({ name }) => name)).toEqual([]);
  });

  test("Adds a table with the engine's schema: the first sets the model and runtime and is the one Execute runs", async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    await pick(state, 'NORTHWIND', 'ORDERS');
    const { document } = state;
    expect(document.context).toEqual({
      model: CUBE_NORTHWIND_MODEL,
      runtime: NORTHWIND_RUNTIME,
    });
    expect(document.query.selected).toBe('relational101');
    const node = document.query.getNode('relational101');
    expect(node).toBeInstanceOf(RelationalTableSource);
    const { resolution } = node as RelationalTableSource;
    expect(resolution.kind).toBe('resolved');
    // the very schema the engine gave (compared by identity: a failed
    // toEqual on a schema can't be reported across Jest's workers)
    expect(
      resolution.kind === 'resolved' &&
        resolution.schema === FAKE_NORTHWIND_SCHEMAS.get('NORTHWIND.ORDERS'),
    ).toBe(true);
    expect(
      resolution.kind === 'resolved'
        ? resolution.schema.columns.map(({ name }) => name)
        : [],
    ).toEqual(ORDERS_COLUMNS.map(({ name }) => name));
    // the engine typed the table under its node id
    expect([...(fake.resolveSchemas.mock.calls[0]?.[1] ?? [])]).toEqual([
      ['relational101', [NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS']],
    ]);
    expect(state.sourcePicker.isOpen).toBe(false);
    // one undo step for the table and the context together
    expect(state.history).toHaveLength(1);
    // adding a table runs nothing: only Execute does
    await nextMacrotask();
    expect(fake.execute).not.toHaveBeenCalled();
    expect(state.execution.result).toBeUndefined();

    await openPicker(state);
    await pick(state, 'NORTHWIND', 'CUSTOMERS');
    expect(state.document.query.nodes.map((each) => each.id)).toEqual([
      'relational101',
      'relational102',
    ]);
    expect(state.document.query.selected).toBe('relational101');
    expect(state.document.context).toBe(document.context);
    await nextMacrotask();
    expect(fake.execute).not.toHaveBeenCalled();
    expect(state.execution.result).toBeUndefined();
  });

  test('Sends quoted schema and table names as the outline gives them, and the node keeps them', async () => {
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            { name: '"MY SCHEMA"', tables: [outlineTable('"ORDER.LINES"')] },
          ],
        },
      ],
    };
    const { state, fake } = setUp({
      outline,
      schemas: new Map([
        ['"MY SCHEMA"."ORDER.LINES"', new Schema(ORDERS_COLUMNS)],
      ]),
    });
    await openPicker(state);
    await pick(state, '"MY SCHEMA"', '"ORDER.LINES"');
    expect(state.sourcePicker.error).toBeUndefined();
    expect([...(fake.resolveSchemas.mock.calls[0]?.[1] ?? [])]).toEqual([
      ['relational101', [NORTHWIND_DATABASE, '"MY SCHEMA"', '"ORDER.LINES"']],
    ]);
    const node = state.document.query.getNode(
      'relational101',
    ) as RelationalTableSource;
    expect([node.schema, node.table]).toEqual(['"MY SCHEMA"', '"ORDER.LINES"']);
    expect(node.describe()).toBe('Table "ORDER.LINES" from schema "MY SCHEMA"');
  });
});

describe('Cube source picker: a cube that already has a model', () => {
  test("Loads the cube's own model, even one it doesn't bundle, and keeps its database and runtime", async () => {
    const pasted = createTextModel('###Pure\nClass my::Pasted {}');
    const { state, fake } = setUp(
      undefined,
      new CubeDocument({
        context: { model: pasted, runtime: NORTHWIND_RUNTIME },
      }),
    );
    await openPicker(state);
    expect(fake.loadModel).toHaveBeenCalledWith(pasted);
    expect(state.sourcePicker.model).toBe(pasted);
    expect(state.sourcePicker.runtimePath).toBe(NORTHWIND_RUNTIME);
  });

  test("Offers only the cube's runtime, so a cube opened again takes a second table though its database has others", async () => {
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      runtimes: [
        { path: NORTHWIND_RUNTIME, storePaths: [NORTHWIND_DATABASE] },
        { path: 'test::SecondRuntime', storePaths: [NORTHWIND_DATABASE] },
      ],
    };
    const { state, host } = setUp({ outline });
    await openPicker(state);
    expect(state.sourcePicker.runtimePath).toBeUndefined();
    state.sourcePicker.selectRuntime(NORTHWIND_RUNTIME);
    await pick(state, 'NORTHWIND', 'ORDERS');
    // the cube opened again, e.g. imported: no earlier choice is left
    const again = new CubeEditorState(host, state.document);
    await openPicker(again);
    const picker = again.sourcePicker;
    expect(picker.runtimes.map(({ path }) => path)).toEqual([
      NORTHWIND_RUNTIME,
    ]);
    expect(picker.runtimePath).toBe(NORTHWIND_RUNTIME);
    picker.selectTable('CUSTOMERS');
    expect(picker.canConfirm).toBe(true);
    await flowResult(picker.confirm());
    expect(nodeIds(again)).toEqual(['relational101', 'relational102']);
  });

  test("Offers only the database of the cube's tables, though its runtime reaches others", async () => {
    const outline: CubeModelOutline = {
      databases: [
        { path: NORTHWIND_DATABASE, schemas: NORTHWIND_SCHEMAS },
        { path: OTHER_DATABASE, schemas: NORTHWIND_SCHEMAS },
      ],
      runtimes: [
        {
          path: NORTHWIND_RUNTIME,
          storePaths: [NORTHWIND_DATABASE, OTHER_DATABASE],
        },
      ],
    };
    const { state, host } = setUp({ outline });
    await openPicker(state);
    expect(state.sourcePicker.databases.map(({ path }) => path)).toEqual([
      NORTHWIND_DATABASE,
      OTHER_DATABASE,
    ]);
    state.sourcePicker.selectDatabase(NORTHWIND_DATABASE);
    await pick(state, 'NORTHWIND', 'ORDERS');
    const again = new CubeEditorState(host, state.document);
    await openPicker(again);
    const picker = again.sourcePicker;
    expect(picker.databases.map(({ path }) => path)).toEqual([
      NORTHWIND_DATABASE,
    ]);
    expect(picker.databasePath).toBe(NORTHWIND_DATABASE);
    picker.selectTable('CUSTOMERS');
    expect(picker.canConfirm).toBe(true);
  });

  test("Offers only the databases the cube's runtime reaches, before the cube has a table", async () => {
    const outline: CubeModelOutline = {
      databases: [
        { path: NORTHWIND_DATABASE, schemas: NORTHWIND_SCHEMAS },
        { path: OTHER_DATABASE, schemas: NORTHWIND_SCHEMAS },
      ],
      runtimes: [
        { path: NORTHWIND_RUNTIME, storePaths: [NORTHWIND_DATABASE] },
        { path: 'test::OtherRuntime', storePaths: [OTHER_DATABASE] },
      ],
    };
    const { state } = setUp(
      { outline },
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
      }),
    );
    await openPicker(state);
    const picker = state.sourcePicker;
    expect(picker.databases.map(({ path }) => path)).toEqual([
      NORTHWIND_DATABASE,
    ]);
    expect(picker.databasePath).toBe(NORTHWIND_DATABASE);
    expect(picker.runtimePath).toBe(NORTHWIND_RUNTIME);
  });

  test('A cube saved with a model but no runtime takes the runtime picked with its first table, and keeps the rest of its context', async () => {
    const { state } = setUp(
      undefined,
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, rest: { note: 'kept' } },
      }),
    );
    await openPicker(state);
    expect(state.sourcePicker.runtimePath).toBe(NORTHWIND_RUNTIME);
    await pick(state, 'NORTHWIND', 'ORDERS');
    const { context } = state.document;
    expect(context?.runtime).toBe(NORTHWIND_RUNTIME);
    expect(context?.model).toBe(CUBE_NORTHWIND_MODEL);
    expect(context?.rest).toEqual({ note: 'kept' });
    expect(nodeIds(state)).toEqual(['relational101']);
    expect(state.history.length).toBe(1);
    expect(state.execution.disabledReasons).toEqual([]);
  });

  test("Shows why a model of a kind it can't run has no tables", async () => {
    const pointer = { _type: 'pointer', sdlcInfo: {} } as ModelContext;
    const { state, fake } = setUp(
      undefined,
      new CubeDocument({ context: { model: pointer } }),
    );
    fake.loadModel.mockRejectedValue(
      new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        `This cube's model kind "pointer" isn't supported yet.`,
      ),
    );
    await openPicker(state);
    expect(state.sourcePicker.error).toBe(
      `This cube's model kind "pointer" isn't supported yet.`,
    );
    expect(state.sourcePicker.databases).toEqual([]);
  });
});

describe('Cube source picker: while a table is typed', () => {
  test('Keeps Add disabled, so pressing it again asks the engine nothing', async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectTable('ORDERS');
    const held = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const first = flowResult(picker.confirm());
    expect(picker.canConfirm).toBe(false);
    const second = flowResult(picker.confirm());
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
    held.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await Promise.all([first, second]);
    expect(nodeIds(state)).toEqual(['relational101']);
    expect(picker.error).toBeUndefined();
  });

  test('Closing the dialog drops the table: its late answer adds nothing', async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectTable('ORDERS');
    const held = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const confirming = flowResult(picker.confirm());
    picker.close();
    expect(picker.isResolving).toBe(false);
    held.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await confirming;
    expect(nodeIds(state)).toEqual([]);
    expect(state.document.context).toBeUndefined();
    expect(state.history.length).toBe(0);
    expect(picker.error).toBeUndefined();
    expect(picker.isOpen).toBe(false);
  });

  test('A late answer leaves the reopened dialog as the user left it', async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectTable('ORDERS');
    const held = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const confirming = flowResult(picker.confirm());
    picker.close();
    await openPicker(state);
    expect(picker.isResolving).toBe(false);
    picker.selectTable('CUSTOMERS');
    expect(picker.canConfirm).toBe(true);
    held.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await confirming;
    expect(picker.isOpen).toBe(true);
    expect(picker.tableName).toBe('CUSTOMERS');
    expect(nodeIds(state)).toEqual([]);
    expect(picker.error).toBeUndefined();
  });

  test('A late failure shows no error in the reopened dialog', async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectTable('ORDERS');
    const held = deferred<ResolvedSchemas>();
    // handled here too, so a rejection no call took can't end the run
    held.promise.catch(() => undefined);
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const confirming = flowResult(picker.confirm());
    expect(picker.isResolving).toBe(true);
    picker.close();
    await openPicker(state);
    held.reject(new Error('The engine could not be reached'));
    await confirming;
    expect(picker.isOpen).toBe(true);
    expect(picker.error).toBeUndefined();
  });

  test('A late answer does not end the Add that followed it', async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectTable('ORDERS');
    const late = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(late.promise);
    const cancelled = flowResult(picker.confirm());
    picker.close();
    await openPicker(state);
    picker.selectTable('CUSTOMERS');
    const current = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(current.promise);
    const confirming = flowResult(picker.confirm());
    late.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await cancelled;
    expect(picker.isResolving).toBe(true);
    expect(picker.canConfirm).toBe(false);
    current.resolve(
      new Map([['relational101', new Schema(CUSTOMERS_COLUMNS)]]),
    );
    await confirming;
    expect(
      state.document.query.nodes.map(
        (node) => (node as RelationalTableSource).table,
      ),
    ).toEqual(['CUSTOMERS']);
    expect(picker.isResolving).toBe(false);
    expect(picker.isOpen).toBe(false);
  });

  test("Picks the cube's database again on reopening, when another was chosen while its first table was typed", async () => {
    const outline: CubeModelOutline = {
      databases: [
        { path: NORTHWIND_DATABASE, schemas: NORTHWIND_SCHEMAS },
        { path: OTHER_DATABASE, schemas: [{ name: 'OTHER', tables: [] }] },
      ],
      runtimes: [
        { path: NORTHWIND_RUNTIME, storePaths: [NORTHWIND_DATABASE] },
        { path: 'test::OtherRuntime', storePaths: [OTHER_DATABASE] },
      ],
    };
    const { state, fake } = setUp({ outline });
    await openPicker(state);
    const picker = state.sourcePicker;
    picker.selectDatabase(NORTHWIND_DATABASE);
    picker.selectTable('ORDERS');
    const held = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const confirming = flowResult(picker.confirm());
    // the Database step stays open while the table is typed
    picker.selectDatabase(OTHER_DATABASE);
    held.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await confirming;
    expect(nodeIds(state)).toEqual(['relational101']);
    expect(picker.databasePath).toBe(OTHER_DATABASE);
    await openPicker(state);
    expect(picker.databasePath).toBe(NORTHWIND_DATABASE);
    expect(picker.runtimePath).toBe(NORTHWIND_RUNTIME);
    expect(picker.schemaName).toBe('NORTHWIND');
    expect(picker.tables.map(({ name }) => name)).toEqual([
      'ORDERS',
      'CUSTOMERS',
    ]);
  });
});

describe('Cube source picker: failures', () => {
  test('Shows a model that fails to load, and loads it again the next time', async () => {
    const { state, fake } = setUp();
    fake.loadModel.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        'Unexpected token\nat line 3',
      ),
    );
    await openPicker(state);
    expect(state.sourcePicker.error).toBe('Unexpected token');
    state.sourcePicker.close();
    await openPicker(state);
    expect(fake.loadModel).toHaveBeenCalledTimes(2);
    expect(state.sourcePicker.error).toBeUndefined();
    expect(state.sourcePicker.databasePath).toBe(NORTHWIND_DATABASE);
  });

  test('Reopening the picker while the model loads parses it once', async () => {
    const { state, fake } = setUp();
    const held = deferred<CubeModelOutline>();
    fake.loadModel.mockReturnValueOnce(held.promise);
    state.sourcePicker.open();
    expect(state.sourcePicker.isLoadingModel).toBe(true);
    state.sourcePicker.close();
    state.sourcePicker.open();
    held.resolve(FAKE_NORTHWIND_OUTLINE);
    await waitForOutline(state);
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
    expect(state.sourcePicker.databasePath).toBe(NORTHWIND_DATABASE);
  });

  test("Shows the engine's error for a table it can't type, and adds nothing", async () => {
    const { state } = setUp({ schemas: new Map() });
    await openPicker(state);
    await pick(state, 'NORTHWIND', 'ORDERS');
    expect(state.sourcePicker.error).toBe(
      `The table "NORTHWIND.ORDERS" can't be found`,
    );
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.document.query.nodes).toEqual([]);
    expect(state.history).toEqual([]);
  });

  test('Adds nothing when the cube changed while the table was typed', async () => {
    const { state, fake } = setUp();
    await openPicker(state);
    const held = deferred<ResolvedSchemas>();
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const picker = state.sourcePicker;
    picker.selectSchema('NORTHWIND');
    picker.selectTable('ORDERS');
    const confirming = flowResult(picker.confirm());
    expect(picker.isResolving).toBe(true);
    // e.g. an import, while the engine answered
    state.applyDocument(
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
      }),
    );
    held.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await confirming;
    expect(picker.isResolving).toBe(false);
    expect(picker.error).toContain('The cube changed');
    expect(state.document.query.nodes).toEqual([]);
  });
});

describe('Cube source picker: a pasted model', () => {
  test("Stops offering the pasted text once the cube's own model is loaded, e.g. an imported cube's", async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const picker = state.sourcePicker;
    picker.open();
    await flowResult(picker.selectModel(CUBE_NORTHWIND_MODEL));
    picker.startPastingModel();
    picker.setPastedModelText('###Relational\nDatabase my::Pasted ( )');
    await flowResult(picker.loadPastedModel());
    expect(picker.isPastingModel).toBe(true);
    picker.close();

    // a cube on a copy of Northwind, as an import decodes it
    const copy = createTextModel(CUBE_NORTHWIND_MODEL.code as string);
    state.importDocument(
      new CubeDocument({
        context: { model: copy, runtime: NORTHWIND_RUNTIME },
      }),
      false,
    );
    picker.open();
    await flowResult(picker.selectModel(copy));
    expect(picker.isPastingModel).toBe(false);
    picker.close();

    // back on a cube with no model, the bundled model is offered again
    state.undo();
    picker.open();
    expect(picker.isPastingModel).toBe(false);
    expect(picker.model).toBe(CUBE_NORTHWIND_MODEL);
  });
});
