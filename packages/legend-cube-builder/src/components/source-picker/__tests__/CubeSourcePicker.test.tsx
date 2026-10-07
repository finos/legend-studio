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
  fireEvent,
  type RenderResult,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { NORTHWIND_DATABASE } from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
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
import { CubeEditor } from '../../CubeEditor.js';

const renderPage = async (
  answers?: FakeCubeEngineAnswers,
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<{ result: RenderResult; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost(answers);
  prepare?.(fake);
  const result = await TEST__renderInCubeApplication(
    <CubeEditor host={host} />,
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
    held.resolve(FAKE_NORTHWIND_OUTLINE);
    await waitFor(() =>
      expect(within(dialog).queryByText('loading model')).toBeNull(),
    );
    expect(
      within(dialog).getByLabelText<HTMLSelectElement>('Database').value,
    ).toBe(NORTHWIND_DATABASE);
    const tables = within(dialog).getByRole('list', { name: 'Tables' });
    expect(within(tables).getByText('ORDERS')).toBeDefined();
    expect(within(tables).getByText('14 columns')).toBeDefined();
    expect(within(tables).getByText('11 columns')).toBeDefined();
  });

  test("Marks tables with problems, and doesn't let an unavailable one be picked", async () => {
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
    expect(within(tables).queryByText('PROBLEM_VIEW')).toBeNull();
  });

  test('Adds the picked table once the engine has typed it, and lists it', async () => {
    const held = deferred<Awaited<ReturnType<CubeEngine['resolveSchemas']>>>();
    const { fake } = await renderPage();
    const dialog = await openPicker();
    const tables = await within(dialog).findByRole('list', { name: 'Tables' });
    const add = within(dialog).getByText<HTMLButtonElement>('Add');
    expect(add.disabled).toBe(true);
    fireEvent.click(within(tables).getByText('ORDERS'));
    expect(add.disabled).toBe(false);
    const typed = await fake.engine.resolveSchemas(
      FAKE_NORTHWIND_OUTLINE as never,
      new Map([['relational101', [NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS']]]),
    );
    fake.resolveSchemas.mockReturnValueOnce(held.promise);
    fireEvent.click(add);
    expect(await within(dialog).findByText('resolving source')).toBeDefined();
    held.resolve(typed);
    const row = await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
    expect(
      within(row).getByText('Table "ORDERS" from schema "NORTHWIND"'),
    ).toBeDefined();
    expect(within(row).getByText('(Selected)')).toBeDefined();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
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
});
