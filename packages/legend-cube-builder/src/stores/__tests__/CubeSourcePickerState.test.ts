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
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  FAKE_NORTHWIND_OUTLINE,
  type FakeCubeEngineAnswers,
} from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
  CubeTableFlag,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { createTextModel } from '../LocalModelCatalog.js';

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
} => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

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

  test('Hides views, filters tables by their name, and never lets a table Cube cannot read be picked', async () => {
    const table = (
      name: string,
      flags: CubeTableFlag[] = [],
      isView = false,
    ): CubeModelOutline['databases'][number]['schemas'][number]['tables'][number] => ({
      name,
      isView,
      columnCount: 2,
      flags,
    });
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            {
              name: 'CUBETEST',
              tables: [
                table('PROBLEM_BINARY', [CubeTableFlag.UNAVAILABLE]),
                table('PROBLEM_CHAR', [CubeTableFlag.LENGTH_UNKNOWN]),
                table('PROBLEM_OTHER', [CubeTableFlag.TYPE_UNKNOWN]),
                table('PROBLEM_VIEW', [], true),
                table('"ORDER.LINES"'),
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
    picker.selectTable('PROBLEM_CHAR');
    expect(picker.canConfirm).toBe(true);
    // a quoted name is searched as it shows
    picker.setTableSearch('order.l');
    expect(picker.tables.map(({ name }) => name)).toEqual(['"ORDER.LINES"']);
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
    expect((node as RelationalTableSource).resolution.kind).toBe('resolved');
    // the engine typed the table under its node id
    expect([...(fake.resolveSchemas.mock.calls[0]?.[1] ?? [])]).toEqual([
      ['relational101', [NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS']],
    ]);
    expect(state.sourcePicker.isOpen).toBe(false);
    // one undo step for the table and the context together
    expect(state.history).toHaveLength(1);

    await openPicker(state);
    await pick(state, 'NORTHWIND', 'CUSTOMERS');
    expect(state.document.query.nodes.map((each) => each.id)).toEqual([
      'relational101',
      'relational102',
    ]);
    expect(state.document.query.selected).toBe('relational101');
    expect(state.document.context).toBe(document.context);
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
    const held =
      deferred<Awaited<ReturnType<typeof fake.engine.resolveSchemas>>>();
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
