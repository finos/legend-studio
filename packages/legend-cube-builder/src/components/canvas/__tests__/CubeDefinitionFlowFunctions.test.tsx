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

import { describe, expect, jest, test } from '@jest/globals';
import type { PlainObject } from '@finos/legend-shared';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { CUBE_DEFINITION_FLOW_LABEL } from '../../../__lib__/LegendCubeDefinitionFlowLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodeTooltip,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__installCanvasDomStubs } from '../../../__test-utils__/CubePageTestUtils.js';
import FIXTURE from '../../../graph-manager/__tests__/CubeDefinitionFunctions.json' with { type: 'json' };
import {
  loadCubeDefinitionFunctions,
  type CubeDefinitionFunctionElement,
} from '../../../graph-manager/CubeDefinitionFunctions.js';
import {
  readCubeDefinition,
  type CubeDefinitionFlowReading,
  type CubeDefinitionFunctionContainer,
} from '../../../graph-manager/CubeDefinitionReader.js';
import { CubeDefinitionFlow } from '../CubeDefinitionFlow.js';

// User-defined functions in a definition's flow (PLAN §11.33), drawn: each
// call Cube opens a container of its body's steps, folded or open, each it
// can't one dashed step. The made-up definitions the reader's tests read.

const ELEMENTS = FIXTURE.functions as CubeDefinitionFunctionElement[];
const ACCESS_POINTS = FIXTURE.accessPoints as Record<string, PlainObject>;

const flowOf = async (
  accessPoint: string,
): Promise<CubeDefinitionFlowReading> => {
  const lambda = ACCESS_POINTS[accessPoint] as PlainObject;
  const reading = readCubeDefinition(lambda, {
    functions: await loadCubeDefinitionFunctions(lambda, async (names) =>
      ELEMENTS.filter((element) =>
        names.some((name) => element.path.startsWith(`${name}_`)),
      ),
    ),
    getIngestDefinition: (path) =>
      path === FIXTURE.ingestDefinition
        ? (FIXTURE.ingestDefinitionContent as PlainObject)
        : undefined,
  });
  if (reading.kind !== 'flow') {
    throw new Error(`Refused: ${reading.message}`);
  }
  return reading;
};

const renderFlow = async (
  flow: CubeDefinitionFlowReading,
  props: {
    onShowFunction?: (call: CubeDefinitionFunctionContainer) => void;
    initiallyFolded?: string[];
  } = {},
): Promise<void> => {
  TEST__installCanvasDomStubs();
  render(
    <div style={{ width: 1000, height: 400 }}>
      <CubeDefinitionFlow flow={flow} {...props} />
    </div>,
  );
  await TEST__findCanvasNode(flow.outputStepId);
};

const getFrames = (): HTMLElement[] =>
  screen.queryAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER);
const getBoxes = (): HTMLElement[] =>
  screen.queryAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_FOLDED_CONTAINER);

describe('A definition calling user-defined functions, drawn', () => {
  test('Draws each opened call as a frame, its call with its values on top', async () => {
    await renderFlow(await flowOf('emea_orders_since'));
    const [frame] = getFrames();
    expect(getFrames()).toHaveLength(1);
    expect(frame?.getAttribute('aria-label')).toBe(
      'Function: shop::orders::ordersSince',
    );
    expect(frame?.textContent).toContain("ordersSince(%2026-01-01, 'EMEA')");
  });

  test('Draws a call in a function inside the frame of that function', async () => {
    await renderFlow(await flowOf('large_active_orders'));
    expect(
      getFrames().map((frame) => frame.getAttribute('aria-label')),
    ).toEqual([
      'Function: shop::orders::largeActiveOrders',
      'Function: shop::orders::activeOrders',
    ]);
  });

  test("Names a function's project when it comes from a dependency", async () => {
    await renderFlow(await flowOf('open_orders'));
    expect(
      within(getFrames()[0] as HTMLElement).getByTitle(
        CUBE_DEFINITION_FLOW_LABEL.CALL_FROM(
          'org.example.shop:shop-common:2.1.0',
        ),
      ).textContent,
    ).toBe('shop-common');
  });

  test('Folds a call to one box, and opens it again', async () => {
    await renderFlow(await flowOf('active_orders_by_region'));
    fireEvent.click(
      screen.getByRole('button', {
        name: CUBE_DEFINITION_FLOW_LABEL.FOLD_CALL,
      }),
    );
    await waitFor(() => expect(getBoxes()).toHaveLength(1));
    expect(getFrames()).toHaveLength(0);
    expect(getBoxes()[0]?.textContent).toContain('activeOrders()');
    expect(getBoxes()[0]?.textContent).toContain('2 steps, folded');
    fireEvent.click(
      screen.getByRole('button', {
        name: CUBE_DEFINITION_FLOW_LABEL.OPEN_CALL,
      }),
    );
    await waitFor(() => expect(getFrames()).toHaveLength(1));
    expect(getBoxes()).toHaveLength(0);
  });

  test('Starts a call holding more than 5 steps folded', async () => {
    const flow = await flowOf('top_customers');
    await renderFlow(flow);
    expect(getBoxes()).toHaveLength(1);
    expect(getBoxes()[0]?.textContent).toContain('6 steps, folded');
  });

  test('Opens every call when the host folds none', async () => {
    await renderFlow(await flowOf('top_customers'), { initiallyFolded: [] });
    expect(getFrames()).toHaveLength(1);
    expect(getBoxes()).toHaveLength(0);
  });

  test("Draws a call Cube can't open as one step, saying why", async () => {
    const flow = await flowOf('checked_orders');
    await renderFlow(flow);
    const step = await TEST__findCanvasNode('function101');
    expect(step.textContent).toContain('checkedOrders(0.0)');
    expect(step.textContent).toContain(
      CUBE_DEFINITION_FLOW_LABEL.CALL_COLUMNS_DECLARED(6),
    );
    expect(TEST__getCanvasNodeTooltip(step)).toContain(
      CUBE_DEFINITION_FLOW_LABEL.CALL_CLOSED_STATEMENTS,
    );
  });

  test('Marks a step whose expression calls a user-defined function', async () => {
    await renderFlow(await flowOf('recent_orders'));
    const step = await TEST__findCanvasNode('expressionFilter101');
    expect(
      within(step).getByLabelText('Calls shop::orders::defaultCutoff'),
    ).toBeDefined();
    expect(TEST__getCanvasNodeTooltip(step)).toContain(
      CUBE_DEFINITION_FLOW_LABEL.CALLS_FUNCTION(
        'shop::orders::defaultCutoff',
        'defaultCutoff(): StrictDate[1]',
      ),
    );
  });

  test("Tells the host which function's Pure to show", async () => {
    const onShowFunction =
      jest.fn<(call: CubeDefinitionFunctionContainer) => void>();
    await renderFlow(await flowOf('active_orders_by_region'), {
      onShowFunction,
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: CUBE_DEFINITION_FLOW_LABEL.SHOW_FUNCTION(
          'shop::orders::activeOrders',
        ),
      }),
    );
    expect(onShowFunction).toHaveBeenCalledTimes(1);
    expect(onShowFunction.mock.calls[0]?.[0].path).toBe(
      'shop::orders::activeOrders__Relation_1_',
    );
  });

  test('Offers no Pure button when the host shows none', async () => {
    await renderFlow(await flowOf('active_orders_by_region'));
    expect(
      screen.queryByRole('button', {
        name: CUBE_DEFINITION_FLOW_LABEL.SHOW_FUNCTION(
          'shop::orders::activeOrders',
        ),
      }),
    ).toBeNull();
  });
});
