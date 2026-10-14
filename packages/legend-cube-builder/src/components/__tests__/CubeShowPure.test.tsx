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
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  Core_LegendApplicationPlugin,
  LEGEND_APPLICATION_COLOR_THEME,
} from '@finos/legend-application';
import {
  ColumnComparisonFilter,
  Connection,
  CubeDocument,
  FilterOperator,
  Limit,
  printIR,
  Query,
  QueryEmitter,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import {
  fireEvent,
  screen,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { flowResult } from 'mobx';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeApplicationStore,
  TEST__createCubeHost,
} from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../stores/CubeEditorState.js';
import type { CubeHost } from '../../stores/CubeHost.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../CubeEditor.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };
const PURE = `|#>{showcase::northwind::store::NorthwindDatabase.NORTHWIND.ORDERS}#
  ->slice(10, 20)`;

const sliceDocument = (): CubeDocument =>
  new CubeDocument({ context: CONTEXT, query: sliceQuery() });

const renderPage = async (
  document: CubeDocument,
  prepare?: (fake: FakeCubeEngine) => void,
): Promise<{ host: CubeHost; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost({ pure: PURE });
  prepare?.(fake);
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={document} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { host, fake };
};

const showPureButton = (): HTMLButtonElement =>
  within(
    screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION),
  ).getByText<HTMLButtonElement>('Show Pure');
const executeButton = (): HTMLButtonElement =>
  within(
    screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR),
  ).getByText<HTMLButtonElement>('Execute');

/** A render that never answers, until the test answers it */
const holdRender = (fake: FakeCubeEngine): ((text: string) => void) => {
  let answer: (text: string) => void = () => undefined;
  fake.renderPure.mockImplementation(
    async () =>
      new Promise<string>((resolve) => {
        answer = resolve;
      }),
  );
  return (text) => answer(text);
};

// each application store adds its color theme's class to document.body
let bodyClassName = '';

beforeEach(() => {
  localStorage.clear();
  bodyClassName = document.body.className;
});

afterEach(() => {
  jest.restoreAllMocks();
  document.body.className = bodyClassName;
});

describe('Show Pure', () => {
  test('Shows exactly the text the engine renders for what Execute runs, and copies it', async () => {
    const { host, fake } = await renderPage(sliceDocument());
    const copy = jest
      .spyOn(host.applicationStore.clipboardService, 'copyTextToClipboard')
      .mockResolvedValue();
    fireEvent.click(showPureButton());
    const dialog = await screen.findByRole('dialog');
    const pure = await within(dialog).findByLabelText('Pure query');
    expect(pure.textContent).toBe(PURE);
    // the capture node's execution lambda, without Execute's row limit
    expect(fake.renderPure).toHaveBeenCalledTimes(1);
    expect(printIR(fake.renderPure.mock.calls[0]?.[0] as never)).toBe(
      printIR(
        new QueryEmitter(sliceQuery()).emitExecutionLambda({
          runtime: NORTHWIND_RUNTIME,
        }),
      ),
    );
    expect(fake.execute).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByText('Copy to Clipboard'));
    expect(copy).toHaveBeenCalledWith(PURE, expect.anything());
    fireEvent.click(within(dialog).getByText('Close'));
    await waitForElementToBeRemoved(dialog);
  });

  test("Shows 'rendering query' with a loading bar until the text comes", async () => {
    let answer: (text: string) => void = () => undefined;
    await renderPage(sliceDocument(), (fake) => {
      answer = holdRender(fake);
    });
    fireEvent.click(showPureButton());
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('rendering query')).toBeDefined();
    expect(dialog.querySelector('.panel-loading-indicator')).not.toBeNull();
    expect(
      within(dialog).getByText<HTMLButtonElement>('Copy to Clipboard').disabled,
    ).toBe(true);
    answer(PURE);
    expect(
      (await within(dialog).findByLabelText('Pure query')).textContent,
    ).toBe(PURE);
    expect(within(dialog).queryByText('rendering query')).toBeNull();
  });

  test("Shows the engine's error inside the dialog, not on the page", async () => {
    await renderPage(sliceDocument(), (fake) =>
      fake.renderPure.mockRejectedValue(
        new CubeEngineError(
          CubeEngineErrorKind.COMPILE,
          "Can't render this lambda\nat line 2",
        ),
      ),
    );
    fireEvent.click(showPureButton());
    const dialog = await screen.findByRole('dialog');
    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      "Can't render this lambda\nat line 2",
    );
    expect(within(dialog).queryByLabelText('Pure query')).toBeNull();
    expect(
      screen.queryByTestId(LEGEND_CUBE_TEST_ID.EXECUTION_ERROR),
    ).toBeNull();
  });

  test("Can't show a query Execute can't run, and says why in the same words", async () => {
    await renderPage(
      new CubeDocument({
        context: CONTEXT,
        query: sliceQuery(
          new ColumnComparisonFilter('NOPE', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'x',
          }),
        ),
      }),
    );
    expect(executeButton().disabled).toBe(true);
    expect(showPureButton().disabled).toBe(true);
    // the same reasons; Execute's also names its shortcut
    expect(executeButton().title).toBe(`${showPureButton().title}\n(F9)`);
    expect(showPureButton().title).toContain('NOPE');
  });

  test.each([
    [LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT, false],
    [LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK, true],
  ])(
    'Draws the dialog and its buttons in the color theme %s (dark: %s)',
    async (theme, dark) => {
      const { host } = TEST__createCubeHost(
        { pure: PURE },
        // the core plugin registers the light theme
        TEST__createCubeApplicationStore([new Core_LegendApplicationPlugin()]),
      );
      const { layoutService } = host.applicationStore;
      layoutService.setColorTheme(theme);
      // a theme that isn't registered is ignored, which would test nothing
      expect(layoutService.currentColorTheme.key).toBe(theme);
      await TEST__renderInCubeApplication(
        <CubeEditor host={host} initialDocument={sliceDocument()} />,
        host.applicationStore,
        LEGEND_CUBE_TEST_ID.EDITOR,
      );
      fireEvent.click(showPureButton());
      const dialog = await screen.findByRole('dialog');
      await within(dialog).findByLabelText('Pure query');
      // the theme shows only in legend-art's classes
      expect(
        dialog.querySelector('.modal')?.classList.contains('modal--dark'),
      ).toBe(dark);
      expect(
        ['Copy to Clipboard', 'Close'].map((name) => {
          const { classList } = within(dialog).getByRole('button', { name });
          return [
            name,
            classList.contains('btn--dark'),
            classList.contains('btn--light'),
          ];
        }),
      ).toEqual([
        ['Copy to Clipboard', dark, !dark],
        ['Close', dark, !dark],
      ]);
    },
  );
});

describe('Show Pure state', () => {
  test('Drops a render that finishes after the dialog closed', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = holdRender(fake);
    const state = new CubeEditorState(host, sliceDocument());
    const render = flowResult(state.showPure.open());
    expect(state.showPure.isRendering).toBe(true);
    state.showPure.close();
    answer(PURE);
    await render;
    expect(state.showPure.isOpen).toBe(false);
    expect(state.showPure.text).toBeUndefined();
    expect(state.showPure.isRendering).toBe(false);
  });

  test('A render from before the dialog was reopened neither ends the new render nor shows its error', async () => {
    const { host, fake } = TEST__createCubeHost();
    let failFirst: (error: unknown) => void = () => undefined;
    let answerSecond: (text: string) => void = () => undefined;
    fake.renderPure
      .mockImplementationOnce(
        async () =>
          new Promise<string>((_resolve, reject) => {
            failFirst = reject;
          }),
      )
      .mockImplementationOnce(
        async () =>
          new Promise<string>((resolve) => {
            answerSecond = resolve;
          }),
      );
    const state = new CubeEditorState(host, sliceDocument());
    const first = flowResult(state.showPure.open());
    state.showPure.close();
    const second = flowResult(state.showPure.open());
    expect(fake.renderPure).toHaveBeenCalledTimes(2);
    failFirst(new CubeEngineError(CubeEngineErrorKind.COMPILE, 'old failure'));
    await first;
    // the reopened dialog is still rendering, and has no error
    expect(state.showPure.isOpen).toBe(true);
    expect(state.showPure.isRendering).toBe(true);
    expect(state.showPure.error).toBeUndefined();
    answerSecond(PURE);
    await second;
    expect(state.showPure.text).toBe(PURE);
    expect(state.showPure.error).toBeUndefined();
    expect(state.showPure.isRendering).toBe(false);
  });

  test("Leaves out the row limit Execute adds to see if there are more rows, whatever it is, and keeps the user's own steps", async () => {
    const { host, fake } = TEST__createCubeHost();
    const state = new CubeEditorState(host, sliceDocument());
    expect(state.setRowLimit(50)).toBe(true);
    await flowResult(state.showPure.open());
    await flowResult(state.execution.execute());
    expect(fake.renderPure).toHaveBeenCalledTimes(1);
    expect(fake.execute).toHaveBeenCalledTimes(1);
    const shown = printIR(fake.renderPure.mock.calls[0]?.[0] as never);
    expect(shown).toBe(
      printIR(
        new QueryEmitter(sliceQuery()).emitExecutionLambda({
          runtime: NORTHWIND_RUNTIME,
        }),
      ),
    );
    // Execute's lambda, its second argument, fetches one more than the limit
    const run = printIR(fake.execute.mock.calls[0]?.[1] as never);
    expect(run).toContain('limit(51)');
    expect(shown).not.toContain('limit');
  });

  test('Shows a Take first <x> rows the user added, as its own limit', async () => {
    const { host, fake } = TEST__createCubeHost();
    const state = new CubeEditorState(
      host,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            new Limit('limit101', 7),
          ],
          [new Connection('relational101', 'limit101', 'tds')],
          'limit101',
        ),
      }),
    );
    await flowResult(state.showPure.open());
    const shown = printIR(fake.renderPure.mock.calls[0]?.[0] as never);
    expect(shown).toContain('limit(7)');
    expect(shown).not.toContain('limit(1001)');
  });

  test('Words an unexpected failure by its message', async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.renderPure.mockRejectedValue(new Error('Boom'));
    const state = new CubeEditorState(host, sliceDocument());
    await flowResult(state.showPure.open());
    expect(state.showPure.error?.detail).toBe('Boom');
  });

  test('Opens nothing when Execute could not run', async () => {
    const { host, fake } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await flowResult(state.showPure.open());
    expect(state.showPure.isOpen).toBe(false);
    expect(state.showPure.isRendering).toBe(false);
    expect(fake.renderPure).not.toHaveBeenCalled();
  });

  test.each<[string, () => Query, string]>([
    [
      'a filter on a column the cube lacks',
      () =>
        sliceQuery(
          new ColumnComparisonFilter('NOPE', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'x',
          }),
        ),
      '"NOPE" is not present in the input schema',
    ],
    [
      'tables from two databases',
      () =>
        new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            new RelationalTableSource(
              'relational102',
              {
                database: 'other::Database',
                schema: 'NORTHWIND',
                table: 'ORDERS',
              },
              { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
            ),
          ],
          [],
          'relational102',
        ),
      'Sources from different databases are not supported yet',
    ],
  ])(
    'Opens nothing when Execute could not run a cube that has a model and a runtime: %s',
    async (_case, query, reason) => {
      const { host, fake } = TEST__createCubeHost();
      const state = new CubeEditorState(
        host,
        new CubeDocument({ context: CONTEXT, query: query() }),
      );
      expect(state.execution.canExecute).toBe(false);
      // refused for this reason alone
      expect(state.execution.disabledReasons).toEqual([
        expect.stringContaining(reason),
      ]);
      await flowResult(state.showPure.open());
      expect(state.showPure.isOpen).toBe(false);
      expect(state.showPure.isRendering).toBe(false);
      expect(state.showPure.error).toBeUndefined();
      expect(fake.renderPure).not.toHaveBeenCalled();
    },
  );
});
