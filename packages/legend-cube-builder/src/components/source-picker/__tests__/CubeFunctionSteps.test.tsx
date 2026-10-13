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
  CubeDocument,
  FunctionSource,
  MESSAGE_PARAMETER_VALUE_INVALID,
  Query,
  resolveCubeType,
} from '@finos/legend-cube';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { flowResult } from 'mobx';
import { CUBE_FUNCTION_MESSAGE } from '../../../__lib__/LegendCubeFunctionLabels.js';
import {
  ARCHIVE_RUNTIME,
  FUNCTION_SCHEMA,
  FUNCTIONS_OUTLINE,
  ORDERS_ABOVE,
} from '../../../__test-utils__/CubeFunctionTestOutline.js';
import { NORTHWIND_RUNTIME } from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { getCubeCanvasNodeLabel } from '../../canvas/CubeCanvasElements.js';
import { CubeFunctionSourceEditor } from '../../editors/CubeFunctionSourceEditor.js';
import { CubeInlineModelTab } from '../CubeInlineModelTab.js';

let consoleError: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error');
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

const createState = (): CubeEditorState => {
  const { host, fake } = TEST__createCubeHost({ outline: FUNCTIONS_OUTLINE });
  fake.typeLambdas.mockImplementation(async (_model, lambdas) =>
    Promise.resolve(
      new Map([...lambdas.keys()].map((key) => [key, FUNCTION_SCHEMA])),
    ),
  );
  return new CubeEditorState(host);
};

describe("A model tab's functions (PLAN §6.5)", () => {
  test('Lists the functions with their parameters, says why one is disabled, and switches back to tables', async () => {
    const state = createState();
    act(() => {
      state.addNode(FunctionSource.TYPE);
    });
    render(<CubeInlineModelTab tab={state.sourcePicker.modelTab} />);
    const list = await screen.findByRole('list', { name: 'Functions' });
    expect(
      within(list)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'allOrders()1 columns',
      'ordersAbove(min: Float, status?: String)1 columns',
      'shipped()runs on StoreRuntime',
      'archived()runs on ArchiveRuntime',
      `ordersOf(ids: Integer)${FUNCTIONS_OUTLINE.functions?.[4]?.problem}`,
    ]);
    expect(within(list).getByText('ordersOf').closest('button')).toHaveProperty(
      'disabled',
      true,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tables' }));
    expect(screen.queryByRole('list', { name: 'Functions' })).toBeNull();
    expect(screen.getByLabelText('Database')).toBeTruthy();
  });

  test("Asks for a runtime and each parameter's value, checking them as they are typed", async () => {
    const state = createState();
    act(() => {
      state.addNode(FunctionSource.TYPE);
    });
    render(<CubeInlineModelTab tab={state.sourcePicker.modelTab} />);
    const list = await screen.findByRole('list', { name: 'Functions' });
    fireEvent.click(within(list).getByText('ordersAbove'));
    const details = screen.getByRole('region', { name: 'Function details' });
    expect(within(details).getByText(ORDERS_ABOVE.path)).toBeTruthy();
    fireEvent.change(within(details).getByLabelText('Runtime'), {
      target: { value: NORTHWIND_RUNTIME },
    });
    fireEvent.change(within(details).getByLabelText('min'), {
      target: { value: 'lots' },
    });
    expect(
      within(details).getByText(
        MESSAGE_PARAMETER_VALUE_INVALID('min', 'lots', 'Float'),
      ),
    ).toBeTruthy();
    expect(state.sourcePicker.canConfirm).toBe(false);
    fireEvent.change(within(details).getByLabelText('min'), {
      target: { value: '100' },
    });
    expect(within(details).getByLabelText('status')).toHaveProperty(
      'placeholder',
      'String, optional',
    );
    expect(
      within(details).getByText('Columns: ORDER_ID (Integer)'),
    ).toBeTruthy();
    expect(state.sourcePicker.canConfirm).toBe(true);
  });

  test("Shows the runtime a function sets itself, and why one on another runtime than the cube's is refused", async () => {
    const state = createState();
    act(() => {
      state.addNode(FunctionSource.TYPE);
    });
    const tab = state.sourcePicker.modelTab;
    render(<CubeInlineModelTab tab={tab} />);
    const list = await screen.findByRole('list', { name: 'Functions' });
    fireEvent.click(within(list).getByText('archived'));
    expect(screen.getByLabelText('Runtime').textContent).toBe(
      CUBE_FUNCTION_MESSAGE.RUNS_ON(ARCHIVE_RUNTIME),
    );
    await act(async () => {
      await flowResult(state.sourcePicker.confirm());
    });
    act(() => {
      state.addNode(FunctionSource.TYPE);
    });
    fireEvent.click(
      within(await screen.findByRole('list', { name: 'Functions' })).getByText(
        'shipped',
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        CUBE_FUNCTION_MESSAGE.OTHER_RUNTIME(NORTHWIND_RUNTIME, ARCHIVE_RUNTIME),
      ),
    );
  });
});

describe("A function source's editor and canvas label", () => {
  const source = new FunctionSource(
    'function101',
    {
      function: ORDERS_ABOVE.path,
      signature: ORDERS_ABOVE.signature,
      parameters: [
        { name: 'min', type: resolveCubeType('Float'), optional: false },
        { name: 'status', type: resolveCubeType('String'), optional: true },
      ],
    },
    [{ kind: 'float', value: '100' }],
    { kind: 'resolved', schema: FUNCTION_SCHEMA },
  );

  test('Labels the node by its name, with its values', () => {
    expect(getCubeCanvasNodeLabel(source)).toEqual({
      title: 'ordersAbove',
      detail: '100, (none)',
    });
    expect(
      getCubeCanvasNodeLabel(
        new FunctionSource('function102', {
          function: 'northwind::allOrders',
          signature: 'northwind::allOrders__Relation_1_',
          parameters: [],
        }).withResolution({ kind: 'resolved', schema: FUNCTION_SCHEMA }),
      ),
    ).toEqual({ title: 'allOrders', detail: undefined });
  });

  test('Shows the function and runtime, edits the values into its draft, and lists its columns', () => {
    const state = createState();
    act(() => {
      state.importDocument(
        new CubeDocument({
          context: {
            model: { _type: 'text', code: '' },
            runtime: NORTHWIND_RUNTIME,
          },
          query: new Query([source], [], source.id),
        }),
        false,
      );
      state.nodeEditor.open('function101');
    });
    const draft = state.nodeEditor.draft;
    if (!draft) {
      throw new Error('No draft');
    }
    render(
      <CubeFunctionSourceEditor
        editorState={state}
        draft={draft}
        inputSchemas={[]}
        readOnly={false}
      />,
    );
    expect(screen.getByText(ORDERS_ABOVE.path)).toBeTruthy();
    expect(screen.getByText(NORTHWIND_RUNTIME)).toBeTruthy();
    expect(screen.getByLabelText('min')).toHaveProperty('value', '100');
    fireEvent.change(screen.getByLabelText('status'), {
      target: { value: 'SHIPPED' },
    });
    expect((draft.build() as FunctionSource).values[1]).toEqual({
      kind: 'string',
      value: 'SHIPPED',
    });
    expect(screen.getByText('ORDER_ID')).toBeTruthy();
  });
});
