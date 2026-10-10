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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  Core_LegendApplicationPlugin,
  LEGEND_APPLICATION_COLOR_THEME,
} from '@finos/legend-application';
import { CubeDocument, Query, Schema } from '@finos/legend-cube';
import {
  act,
  fireEvent,
  type RenderResult,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../../__test-utils__/CubeTestApplication.js';
import {
  EMPTY_CUBE_RESULT,
  FAKE_NORTHWIND_OUTLINE,
  type FakeCubeEngine,
  type FakeCubeEngineAnswers,
} from '../../../__test-utils__/FakeCubeEngine.js';
import {
  type CubeEngine,
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
  CubeTableFlag,
} from '../../../graph-manager/CubeEngine.js';
import type { CubeHost } from '../../../stores/CubeHost.js';
import { createTextModel } from '../../../stores/LocalModelCatalog.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../../CubeEditor.js';

type ResolvedSchemas = Awaited<ReturnType<CubeEngine['resolveSchemas']>>;

const renderPage = async (
  answers?: FakeCubeEngineAnswers,
  prepare?: (fake: FakeCubeEngine, host: CubeHost) => void,
  initialDocument?: CubeDocument,
): Promise<{ result: RenderResult; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost(answers);
  prepare?.(fake, host);
  const result = await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={initialDocument} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { result, fake };
};

/** Opens the picker from the empty page and returns the dialog */
const openPicker = async (): Promise<HTMLElement> => {
  fireEvent.click(screen.getByText('add a table'));
  return screen.findByRole('dialog');
};

/** The engine's answer for ORDERS, typed under the first node id */
const typeOrders = async (fake: FakeCubeEngine): Promise<ResolvedSchemas> =>
  fake.engine.resolveSchemas(
    FAKE_NORTHWIND_OUTLINE as never,
    new Map([['relational101', [NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS']]]),
  );

/**
 * The dialog's loading bar. It is a bare decorative element with no role or
 * text, so it is found by legend-art's class, as the test strategy allows.
 */
const loadingBar = (dialog: HTMLElement): HTMLElement => {
  const bar = dialog.querySelector<HTMLElement>(
    '.panel-loading-indicator, .panel-loading-indicator--disabled',
  );
  expect(bar).not.toBeNull();
  return bar as HTMLElement;
};

const isBarLoading = (bar: HTMLElement): boolean =>
  bar.classList.contains('panel-loading-indicator');

const selectOptions = (select: HTMLSelectElement): string[] =>
  Array.from(select.options).map(({ value }) => value);

// a function, since `<T>` in a .tsx arrow function reads as a JSX tag
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
}

beforeEach(() => {
  localStorage.clear();
});

describe('Cube source picker', () => {
  test('Shows the model loading, then its database, runtime and tables with their column counts', async () => {
    const held = deferred<CubeModelOutline>();
    await renderPage(undefined, (fake) =>
      fake.loadModel.mockReturnValueOnce(held.promise),
    );
    const dialog = await openPicker();
    expect(within(dialog).getByText('loading model')).toBeDefined();
    // a loading bar under the header covers the dialog while the model loads
    const bar = loadingBar(dialog);
    expect(isBarLoading(bar)).toBe(true);
    expect(
      bar.previousElementSibling?.classList.contains('modal__header'),
    ).toBe(true);
    await waitFor(() =>
      expect(
        bar.parentElement?.classList.contains(
          'panel-loading-indicator__container',
        ),
      ).toBe(true),
    );
    held.resolve(FAKE_NORTHWIND_OUTLINE);
    await waitFor(() =>
      expect(within(dialog).queryByText('loading model')).toBeNull(),
    );
    expect(isBarLoading(bar)).toBe(false);
    expect(
      within(dialog).getByLabelText<HTMLSelectElement>('Database').value,
    ).toBe(NORTHWIND_DATABASE);
    const tables = within(dialog).getByRole('list', { name: 'Tables' });
    expect(within(tables).getByText('ORDERS')).toBeDefined();
    expect(within(tables).getByText('14 columns')).toBeDefined();
    expect(within(tables).getByText('11 columns')).toBeDefined();
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
    await renderPage({ outline });
    const dialog = await openPicker();
    await within(dialog).findByRole('list', { name: 'Tables' });
    const runtime = within(dialog).getByLabelText<HTMLSelectElement>('Runtime');
    expect(selectOptions(runtime)).toEqual(['test::Exact']);
    expect(runtime.value).toBe('test::Exact');
  });

  test("Marks tables with problems, keeps the ones Cube can still read pickable, and doesn't let an unavailable one be picked", async () => {
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            {
              name: 'CUBETEST',
              tables: [
                {
                  name: 'PROBLEM_BINARY',
                  isView: false,
                  columnCount: 2,
                  flags: [CubeTableFlag.UNAVAILABLE],
                  untypedColumns: [],
                },
                {
                  name: 'PROBLEM_CHAR',
                  isView: false,
                  columnCount: 2,
                  flags: [CubeTableFlag.LENGTH_UNKNOWN],
                  untypedColumns: [],
                },
                {
                  name: 'PROBLEM_OTHER',
                  isView: false,
                  columnCount: 2,
                  flags: [CubeTableFlag.TYPE_UNKNOWN],
                  untypedColumns: ['NOTE'],
                },
                {
                  name: 'PROBLEM_VIEW',
                  isView: true,
                  columnCount: 2,
                  flags: [],
                  untypedColumns: [],
                },
              ],
            },
          ],
        },
      ],
    };
    await renderPage({ outline });
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    const button = (name: string): HTMLButtonElement =>
      within(tables).getByText(name).closest('button') as HTMLButtonElement;
    expect(
      within(button('PROBLEM_BINARY')).getByText('unavailable'),
    ).toBeDefined();
    expect(button('PROBLEM_BINARY').disabled).toBe(true);
    expect(
      within(button('PROBLEM_CHAR')).getByText('length unknown'),
    ).toBeDefined();
    expect(button('PROBLEM_CHAR').disabled).toBe(false);
    expect(
      within(button('PROBLEM_OTHER')).getByText('type unknown'),
    ).toBeDefined();
    expect(button('PROBLEM_OTHER').disabled).toBe(false);
    expect(within(tables).queryByText('PROBLEM_VIEW')).toBeNull();
  });

  test('Filters the tables by the search text', async () => {
    await renderPage();
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    const search = within(dialog).getByLabelText('Search tables');
    fireEvent.change(search, { target: { value: 'cust' } });
    expect(within(tables).queryByText('ORDERS')).toBeNull();
    expect(within(tables).getByText('CUSTOMERS')).toBeDefined();
    fireEvent.change(search, { target: { value: '' } });
    expect(within(tables).getByText('ORDERS')).toBeDefined();
    expect(within(tables).getByText('CUSTOMERS')).toBeDefined();
  });

  test('Shows quoted schema and table names without their quotes, and sends them with their quotes', async () => {
    const { fake } = await renderPage({
      outline: {
        ...FAKE_NORTHWIND_OUTLINE,
        databases: [
          {
            path: NORTHWIND_DATABASE,
            schemas: [
              {
                name: '"QUOTED.SCHEMA"',
                tables: [
                  {
                    name: '"ORDER.LINES"',
                    isView: false,
                    columnCount: 14,
                    flags: [],
                    untypedColumns: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      schemas: new Map([
        ['"QUOTED.SCHEMA"."ORDER.LINES"', new Schema(ORDERS_COLUMNS)],
      ]),
    });
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    expect(
      within(dialog).getByLabelText<HTMLSelectElement>('Schema')
        .selectedOptions[0]?.textContent,
    ).toBe('QUOTED.SCHEMA');
    expect(within(tables).queryByText('"ORDER.LINES"')).toBeNull();
    fireEvent.click(within(tables).getByText('ORDER.LINES'));
    fireEvent.click(within(dialog).getByText('Add'));
    const node = await TEST__findCanvasNode('relational101');
    expect(
      within(node).getByText('Table "ORDER.LINES" from schema "QUOTED.SCHEMA"'),
    ).toBeDefined();
    expect([...(fake.resolveSchemas.mock.calls[0]?.[1] ?? [])]).toEqual([
      [
        'relational101',
        [NORTHWIND_DATABASE, '"QUOTED.SCHEMA"', '"ORDER.LINES"'],
      ],
    ]);
  });

  test('Adds the picked table once the engine has typed it, lists it, and runs nothing', async () => {
    const held = deferred<ResolvedSchemas>();
    const { fake } = await renderPage();
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    const add = within(dialog).getByText<HTMLButtonElement>('Add');
    expect(add.disabled).toBe(true);
    fireEvent.click(within(tables).getByText('ORDERS'));
    expect(add.disabled).toBe(false);
    const typed = await typeOrders(fake);
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    fireEvent.click(add);
    expect(await within(dialog).findByText('resolving source')).toBeDefined();
    // a second press can't type the table again
    expect(add.disabled).toBe(true);
    expect(isBarLoading(loadingBar(dialog))).toBe(true);
    held.resolve(typed);
    const node = await TEST__findCanvasNode('relational101');
    expect(
      within(node).getByText('Table "ORDERS" from schema "NORTHWIND"'),
    ).toBeDefined();
    expect(node.getAttribute('aria-current')).toBe('true');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // adding a table runs nothing: only Execute does
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(fake.execute).not.toHaveBeenCalled();
    expect(screen.queryByText('executing query')).toBeNull();
  });

  test('Lands the picked table with the schema the engine typed, as its Source panel shows', async () => {
    await renderPage();
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Add'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(await TEST__findCanvasNode('relational101'));
    const panel = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
    const rows = within(within(panel).getByRole('table', { name: 'Columns' }))
      .getAllByRole('row')
      .slice(1)
      .map((row) =>
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent)
          .join(' '),
      );
    expect(rows).toHaveLength(ORDERS_COLUMNS.length);
    expect(rows.slice(0, 2)).toEqual([
      'ORDER_ID SmallInt',
      'CUSTOMER_ID Varchar(5)?',
    ]);
  });

  test('Cancel closes the picker and adds nothing', async () => {
    const { fake } = await renderPage();
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(TEST__getCanvasNodes()).toHaveLength(0);
    expect(fake.resolveSchemas).not.toHaveBeenCalled();
  });

  test('Escape closes the picker', async () => {
    await renderPage();
    const dialog = await openPicker();
    await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('Cancelling while the table is typed adds nothing, and leaves the reopened dialog as the user left it', async () => {
    const held = deferred<ResolvedSchemas>();
    const { fake } = await renderPage();
    const typed = await typeOrders(fake);
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Add'));
    await within(dialog).findByText('resolving source');
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const reopened = await openPicker();
    const reopenedTables = await within(reopened).findByRole('list', {
      name: 'Tables',
    });
    expect(within(reopened).queryByText('resolving source')).toBeNull();
    fireEvent.click(within(reopenedTables).getByText('CUSTOMERS'));
    expect(within(reopened).getByText<HTMLButtonElement>('Add').disabled).toBe(
      false,
    );
    await act(async () => {
      held.resolve(typed);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(TEST__getCanvasNodes()).toHaveLength(0);
    expect(
      within(reopenedTables)
        .getByText('CUSTOMERS')
        .closest('button')
        ?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(screen.getByRole('dialog')).toBe(reopened);
  });

  test('Once the cube has a table, shows its model, database and runtime read-only', async () => {
    await renderPage();
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    // before the first table, the model is a choice
    expect(
      within(dialog).getByLabelText<HTMLSelectElement>('Model').disabled,
    ).toBe(false);
    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Add'));
    await TEST__findCanvasNode('relational101');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByText('Add table'));
    const again = await screen.findByRole('dialog');
    await within(again).findByRole('list', { name: 'Tables' });
    const select = (label: string): HTMLSelectElement =>
      within(again).getByLabelText<HTMLSelectElement>(label);
    expect(
      ['Model', 'Database', 'Runtime', 'Schema'].map(
        (label) => [label, select(label).disabled] as const,
      ),
    ).toEqual([
      ['Model', true],
      ['Database', true],
      ['Runtime', true],
      ['Schema', false],
    ]);
    expect(select('Database').value).toBe(NORTHWIND_DATABASE);
  });

  test('Opens a cube that has a table on its model by name, and on its own runtime though the database has others', async () => {
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      runtimes: [
        { path: NORTHWIND_RUNTIME, storePaths: [NORTHWIND_DATABASE] },
        { path: 'test::SecondRuntime', storePaths: [NORTHWIND_DATABASE] },
      ],
    };
    await renderPage(
      { outline },
      undefined,
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
        query: new Query(
          [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
          [],
          'relational101',
        ),
      }),
    );
    fireEvent.click(screen.getByText('Add table'));
    const dialog = await screen.findByRole('dialog');
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    const select = (label: string): HTMLSelectElement =>
      within(dialog).getByLabelText<HTMLSelectElement>(label);
    expect(select('Model').selectedOptions[0]?.textContent).toBe(
      'Northwind (Cube fixture)',
    );
    expect(select('Database').value).toBe(NORTHWIND_DATABASE);
    expect(selectOptions(select('Runtime'))).toEqual([NORTHWIND_RUNTIME]);
    expect(select('Runtime').value).toBe(NORTHWIND_RUNTIME);
    expect(
      ['Model', 'Database', 'Runtime'].map(
        (label) => [label, select(label).disabled] as const,
      ),
    ).toEqual([
      ['Model', true],
      ['Database', true],
      ['Runtime', true],
    ]);
    fireEvent.click(within(tables).getByText('CUSTOMERS'));
    expect(within(dialog).getByText<HTMLButtonElement>('Add').disabled).toBe(
      false,
    );
  });

  test("Shows in the dialog why a table couldn't be added", async () => {
    await renderPage({ schemas: new Map() });
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Add'));
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      `The table "NORTHWIND.ORDERS" can't be found`,
    );
    expect(TEST__getCanvasNodes()).toHaveLength(0);
  });

  test.each([
    [LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT, false],
    [LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK, true],
  ])(
    'Draws the dialog and its buttons in the color theme %s (dark: %s)',
    async (theme, dark) => {
      const { host } = TEST__createCubeHost(
        undefined,
        // the core plugin registers the light theme
        TEST__createCubeApplicationStore([new Core_LegendApplicationPlugin()]),
      );
      const { layoutService } = host.applicationStore;
      layoutService.setColorTheme(theme);
      // a theme that isn't registered is ignored, which would test nothing
      expect(layoutService.currentColorTheme.key).toBe(theme);
      await TEST__renderInCubeApplication(
        <CubeEditor host={host} />,
        host.applicationStore,
        LEGEND_CUBE_TEST_ID.EDITOR,
      );
      const dialog = await openPicker();
      await within(dialog).findByRole('list', { name: 'Tables' });
      // the theme shows only in legend-art's classes
      expect(
        dialog.querySelector('.modal')?.classList.contains('modal--dark'),
      ).toBe(dark);
      expect(
        ['Add', 'Cancel'].map((name) => {
          const { classList } = within(dialog).getByRole('button', { name });
          return [
            name,
            classList.contains('btn--dark'),
            classList.contains('btn--light'),
          ];
        }),
      ).toEqual([
        ['Add', dark, !dark],
        ['Cancel', dark, !dark],
      ]);
    },
  );
});

describe('Cube source picker: a pasted Pure model', () => {
  const PASTED = '###Relational\nDatabase my::Northwind ( )';

  /** Chooses 'Paste Pure model…' and types the text */
  const pasteModel = (dialog: HTMLElement, code: string): void => {
    fireEvent.change(within(dialog).getByLabelText('Model'), {
      target: { value: 'paste' },
    });
    fireEvent.change(within(dialog).getByLabelText('Pure model'), {
      target: { value: code },
    });
  };

  test('Loads the outline of a pasted model, adds a table from it, and keeps the text in the cube', async () => {
    const { fake } = await renderPage({
      result: {
        ...EMPTY_CUBE_RESULT,
        columns: ORDERS_COLUMNS.map(({ name }) => name),
      },
    });
    const dialog = await openPicker();
    // the first bundled model loads first
    await within(dialog).findByRole('list', { name: 'Tables' });
    const model = within(dialog).getByLabelText<HTMLSelectElement>('Model');
    expect(selectOptions(model)).toEqual([
      'cube-northwind',
      'cube-sample-sports',
      'cube-sample-trades',
      'paste',
    ]);
    expect(model.selectedOptions[0]?.textContent).toBe(
      'Northwind (Cube fixture)',
    );

    fireEvent.change(model, { target: { value: 'paste' } });
    expect(within(dialog).queryByRole('list', { name: 'Tables' })).toBeNull();
    const load = within(dialog).getByText<HTMLButtonElement>('Load model');
    expect(load.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText('Pure model'), {
      target: { value: PASTED },
    });
    fireEvent.click(load);
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    expect(fake.loadModel).toHaveBeenLastCalledWith(createTextModel(PASTED));
    expect(model.selectedOptions[0]?.textContent).toBe('Paste Pure model…');

    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Add'));
    await TEST__findCanvasNode('relational101');
    expect(fake.resolveSchemas.mock.calls[0]?.[0]).toEqual({
      _type: 'text',
      code: PASTED,
    });

    // later picks come from the pasted model
    fireEvent.click(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION)).getByText(
        'Add table',
      ),
    );
    const again = await screen.findByRole('dialog');
    const fixed = within(again).getByLabelText<HTMLSelectElement>('Model');
    expect(fixed.disabled).toBe(true);
    expect(fixed.selectedOptions[0]?.textContent).toBe("The cube's model");
    expect(within(again).queryByLabelText('Pure model')).toBeNull();
    fireEvent.click(within(again).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // the cube holds the text: Execute sends it as the model
    const toolbar = screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR);
    fireEvent.click(within(toolbar).getByText('Execute'));
    await waitFor(() =>
      expect(within(toolbar).queryByText('executing query')).toBeNull(),
    );
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(fake.execute.mock.calls[0]?.[0]).toEqual(createTextModel(PASTED));
  });

  test("Shows why a pasted model doesn't load, in the dialog, and adds nothing", async () => {
    const { fake } = await renderPage();
    const dialog = await openPicker();
    await within(dialog).findByRole('list', { name: 'Tables' });
    fake.loadModel.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "Unexpected token 'Databse' at line 2\n…",
      ),
    );
    pasteModel(dialog, '###Relational\nDatabse x');
    fireEvent.click(within(dialog).getByText('Load model'));
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      "Unexpected token 'Databse' at line 2",
    );
    expect(within(dialog).getByText<HTMLButtonElement>('Add').disabled).toBe(
      true,
    );
    // the text stays, to be fixed
    expect(
      within(dialog).getByLabelText<HTMLTextAreaElement>('Pure model').value,
    ).toBe('###Relational\nDatabse x');
  });

  test('Goes back to a bundled model when it is chosen again', async () => {
    const { fake } = await renderPage();
    const dialog = await openPicker();
    await within(dialog).findByRole('list', { name: 'Tables' });
    pasteModel(dialog, PASTED);
    fireEvent.change(within(dialog).getByLabelText('Model'), {
      target: { value: 'cube-northwind' },
    });
    expect(within(dialog).queryByLabelText('Pure model')).toBeNull();
    await within(dialog).findByRole('list', { name: 'Tables' });
    expect(fake.loadModel).toHaveBeenLastCalledWith(CUBE_NORTHWIND_MODEL);
  });

  test('Keeps offering the pasted text when the picker is opened again before a table is added', async () => {
    const { fake } = await renderPage();
    const dialog = await openPicker();
    await within(dialog).findByRole('list', { name: 'Tables' });
    pasteModel(dialog, PASTED);
    fireEvent.click(within(dialog).getByText('Load model'));
    await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const loads = fake.loadModel.mock.calls.length;

    const reopened = await openPicker();
    expect(
      within(reopened).getByLabelText<HTMLTextAreaElement>('Pure model').value,
    ).toBe(PASTED);
    await within(reopened).findByRole('list', { name: 'Tables' });
    // the catalog keeps the outline: nothing is parsed again
    expect(fake.loadModel.mock.calls.length).toBe(loads);
  });

  test('Keeps offering the text box when the picker is opened again before Load model is pressed', async () => {
    const { fake } = await renderPage();
    const dialog = await openPicker();
    await within(dialog).findByRole('list', { name: 'Tables' });
    pasteModel(dialog, PASTED);
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const reopened = await openPicker();
    // let anything the reopening started settle
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(
      within(reopened).getByLabelText<HTMLSelectElement>('Model')
        .selectedOptions[0]?.textContent,
    ).toBe('Paste Pure model…');
    expect(
      within(reopened).getByLabelText<HTMLTextAreaElement>('Pure model').value,
    ).toBe(PASTED);
    expect(within(reopened).queryByRole('list', { name: 'Tables' })).toBeNull();
    expect(
      within(reopened).getByText<HTMLButtonElement>('Load model').disabled,
    ).toBe(false);
    // only the bundled model was ever loaded
    expect(fake.loadModel).toHaveBeenCalledTimes(1);
  });

  test("Choosing paste while the bundled model loads drops that load: its tables aren't shown, and Load model loads the text", async () => {
    const held = deferred<CubeModelOutline>();
    const { fake } = await renderPage(undefined, (each) =>
      each.loadModel.mockReturnValueOnce(held.promise),
    );
    const dialog = await openPicker();
    expect(within(dialog).getByText('loading model')).toBeDefined();
    pasteModel(dialog, PASTED);
    const load = within(dialog).getByText<HTMLButtonElement>('Load model');
    expect(within(dialog).queryByText('loading model')).toBeNull();
    expect(load.disabled).toBe(false);

    // the bundled model answers late
    await act(async () => {
      held.resolve(FAKE_NORTHWIND_OUTLINE);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(within(dialog).queryByText('loading model')).toBeNull();
    expect(within(dialog).queryByRole('list', { name: 'Tables' })).toBeNull();
    expect(
      within(dialog).getByLabelText<HTMLSelectElement>('Model')
        .selectedOptions[0]?.textContent,
    ).toBe('Paste Pure model…');
    expect(within(dialog).getByText<HTMLButtonElement>('Add').disabled).toBe(
      true,
    );
    expect(load.disabled).toBe(false);

    fireEvent.click(load);
    await within(dialog).findByRole('list', { name: 'Tables' });
    expect(fake.loadModel).toHaveBeenCalledTimes(2);
    expect(fake.loadModel).toHaveBeenLastCalledWith(createTextModel(PASTED));
  });

  test("Choosing paste clears the error of a bundled model that didn't load", async () => {
    await renderPage(undefined, (fake) =>
      fake.loadModel.mockRejectedValueOnce(
        new CubeEngineError(
          CubeEngineErrorKind.COMPILE,
          'Unexpected token\nat line 3',
        ),
      ),
    );
    const dialog = await openPicker();
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'Unexpected token',
    );
    fireEvent.change(within(dialog).getByLabelText('Model'), {
      target: { value: 'paste' },
    });
    expect(within(dialog).getByLabelText('Pure model')).toBeDefined();
    expect(within(dialog).queryByRole('alert')).toBeNull();
  });

  test("Opens a cube on a model that isn't bundled, e.g. an imported one, from the cube's own text", async () => {
    const pasted = createTextModel(PASTED);
    const { fake } = await renderPage(
      undefined,
      undefined,
      new CubeDocument({
        context: { model: pasted, runtime: NORTHWIND_RUNTIME },
        query: new Query(
          [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
          [],
          'relational101',
        ),
      }),
    );
    fireEvent.click(
      within(screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION)).getByText(
        'Add table',
      ),
    );
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByRole('list', { name: 'Tables' });
    expect(fake.loadModel).toHaveBeenCalledWith(pasted);
    expect(
      within(dialog).getByLabelText<HTMLSelectElement>('Model')
        .selectedOptions[0]?.textContent,
    ).toBe("The cube's model");
  });
});

describe('Cube source picker: unexpected failures', () => {
  // a rejection that isn't an Error can't be shown as the picker's error, so
  // each call site reports it as unhandled, and the picker stays usable

  /** Renders the page with the unhandled-error alert stubbed */
  const renderWithAlert = async (
    prepare?: (fake: FakeCubeEngine) => void,
  ): Promise<{
    fake: FakeCubeEngine;
    alertUnhandledError: jest.Mock<(error: Error) => void>;
  }> => {
    const alertUnhandledError = jest.fn<(error: Error) => void>();
    const { fake } = await renderPage(undefined, (engine, host) => {
      host.applicationStore.alertUnhandledError = alertUnhandledError;
      prepare?.(engine);
    });
    return { fake, alertUnhandledError };
  };

  test('Reports a failure to load the model on opening, and stops loading', async () => {
    const { alertUnhandledError } = await renderWithAlert((fake) =>
      fake.loadModel.mockRejectedValueOnce(null),
    );
    const dialog = await openPicker();
    await waitFor(() => expect(alertUnhandledError).toHaveBeenCalledTimes(1));
    expect(within(dialog).queryByText('loading model')).toBeNull();
    expect(isBarLoading(loadingBar(dialog))).toBe(false);
  });

  test('Reports a failure to load the model picked again, and stops loading', async () => {
    const { fake, alertUnhandledError } = await renderWithAlert((engine) =>
      engine.loadModel
        .mockRejectedValueOnce(
          new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            'The engine is unreachable',
          ),
        )
        .mockRejectedValueOnce(null),
    );
    const dialog = await openPicker();
    expect(
      await within(dialog).findByText('The engine is unreachable'),
    ).toBeDefined();
    expect(alertUnhandledError).not.toHaveBeenCalled();
    // the failed load isn't kept, so choosing the model again, after another
    // choice, loads it again
    const model = within(dialog).getByLabelText('Model');
    fireEvent.change(model, { target: { value: 'paste' } });
    fireEvent.change(model, { target: { value: 'cube-northwind' } });
    await waitFor(() => expect(alertUnhandledError).toHaveBeenCalledTimes(1));
    expect(fake.loadModel).toHaveBeenCalledTimes(2);
    expect(within(dialog).queryByText('loading model')).toBeNull();
    expect(isBarLoading(loadingBar(dialog))).toBe(false);
  });

  test('Reports a failure to load a pasted model, and stops loading', async () => {
    const { fake, alertUnhandledError } = await renderWithAlert();
    const dialog = await openPicker();
    await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.change(within(dialog).getByLabelText('Model'), {
      target: { value: 'paste' },
    });
    fireEvent.change(within(dialog).getByLabelText('Pure model'), {
      target: { value: '###Relational\nDatabase my::Northwind ( )' },
    });
    fake.loadModel.mockRejectedValueOnce(null);
    const load = within(dialog).getByText<HTMLButtonElement>('Load model');
    fireEvent.click(load);
    await waitFor(() => expect(alertUnhandledError).toHaveBeenCalledTimes(1));
    expect(within(dialog).queryByText('loading model')).toBeNull();
    expect(isBarLoading(loadingBar(dialog))).toBe(false);
    expect(load.disabled).toBe(false);
  });

  test('Reports a failure to type the picked table, and can add it again', async () => {
    const { alertUnhandledError } = await renderWithAlert((fake) =>
      fake.resolveSchemas.mockRejectedValueOnce(null),
    );
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('ORDERS'));
    const add = within(dialog).getByText<HTMLButtonElement>('Add');
    fireEvent.click(add);
    await waitFor(() => expect(alertUnhandledError).toHaveBeenCalledTimes(1));
    expect(within(dialog).queryByText('resolving source')).toBeNull();
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    expect(await TEST__findCanvasNode('relational101')).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(alertUnhandledError).toHaveBeenCalledTimes(1);
  });
});
