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
  ColumnComparisonFilter,
  CubeDocument,
  FilterOperator,
  printIR,
  QueryEmitter,
} from '@finos/legend-cube';
import {
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { flowResult } from 'mobx';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
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
  ->limit(1001)`;

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

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
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
    // the capture node's execution lambda, with the row limit
    expect(fake.renderPure).toHaveBeenCalledTimes(1);
    expect(printIR(fake.renderPure.mock.calls[0]?.[0] as never)).toBe(
      printIR(
        new QueryEmitter(sliceQuery()).emitExecutionLambda({
          rowLimit: 1000,
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
    expect(showPureButton().title).toBe(executeButton().title);
    expect(showPureButton().title).toContain('NOPE');
  });
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
    await waitFor(() => expect(fake.renderPure).not.toHaveBeenCalled());
  });
});
