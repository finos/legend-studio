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
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../../__test-utils__/CubeTestApplication.js';
import {
  FAKE_NORTHWIND_OUTLINE,
  type FakeCubeEngine,
  type FakeCubeEngineAnswers,
} from '../../../__test-utils__/FakeCubeEngine.js';
import {
  type CubeEngine,
  type CubeModelOutline,
  CubeTableFlag,
} from '../../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../../CubeEditor.js';

type ResolvedSchemas = Awaited<ReturnType<CubeEngine['resolveSchemas']>>;

const renderPage = async (
  answers?: FakeCubeEngineAnswers,
  prepare?: (fake: FakeCubeEngine) => void,
  initialDocument?: CubeDocument,
): Promise<{ result: RenderResult; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost(answers);
  prepare?.(fake);
  const result = await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={initialDocument} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { result, fake };
};

/** Opens the picker from the empty page and returns the dialog */
const openPicker = async (): Promise<HTMLElement> => {
  fireEvent.click(screen.getByText('Add a table'));
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
                },
                {
                  name: 'PROBLEM_CHAR',
                  isView: false,
                  columnCount: 2,
                  flags: [CubeTableFlag.LENGTH_UNKNOWN],
                },
                {
                  name: 'PROBLEM_OTHER',
                  isView: false,
                  columnCount: 2,
                  flags: [CubeTableFlag.TYPE_UNKNOWN],
                },
                {
                  name: 'PROBLEM_VIEW',
                  isView: true,
                  columnCount: 2,
                  flags: [],
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
    const row = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
    expect(
      within(row).getByText('Table "ORDER.LINES" from schema "QUOTED.SCHEMA"'),
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
    const row = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
    expect(
      within(row).getByText('Table "ORDERS" from schema "NORTHWIND"'),
    ).toBeDefined();
    expect(within(row).getByText('(Selected)')).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    // adding a table runs nothing: only Execute does
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(fake.execute).not.toHaveBeenCalled();
    expect(screen.queryByText('executing query')).toBeNull();
  });

  test('Cancel closes the picker and adds nothing', async () => {
    const { fake } = await renderPage();
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    fireEvent.click(within(tables).getByText('ORDERS'));
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW)).toBeNull();
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
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW)).toBeNull();
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
    await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
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
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW)).toBeNull();
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
