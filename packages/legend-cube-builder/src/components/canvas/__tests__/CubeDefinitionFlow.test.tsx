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
import { RUNNING_NODE_LABEL } from '../../../__lib__/LegendCubeHelpText.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
  TEST__getCanvasNodeTooltip,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__installCanvasDomStubs } from '../../../__test-utils__/CubePageTestUtils.js';
import DEFINITIONS from '../../../graph-manager/__tests__/CubeAccessPointDefinitions.json' with { type: 'json' };
import {
  readCubeDefinition,
  type CubeDefinitionFlowReading,
} from '../../../graph-manager/CubeDefinitionReader.js';
import { CubeDefinitionFlow } from '../CubeDefinitionFlow.js';

// A data product's access point definition, drawn read-only as a host embeds
// it (`@finos/legend-cube-builder/definition-flow`): the made-up definitions
// the reader's tests read

const withIngestDefinition = {
  getIngestDefinition: (path: string): PlainObject | undefined =>
    path === DEFINITIONS.ingestDefinition
      ? (DEFINITIONS.ingestDefinitionContent as PlainObject)
      : undefined,
};

const flowOf = (
  lambda: unknown,
  options = withIngestDefinition,
): CubeDefinitionFlowReading => {
  const reading = readCubeDefinition(lambda, options);
  if (reading.kind !== 'flow') {
    throw new Error(`Refused: ${reading.message}`);
  }
  return reading;
};

/** The flow in a container of its own size, as a host's panel holds it */
const renderFlow = async (
  flow: CubeDefinitionFlowReading,
  props: {
    selectedStepId?: string;
    onSelectStep?: (stepId: string) => void;
  } = {},
): Promise<HTMLElement> => {
  TEST__installCanvasDomStubs();
  render(
    <div style={{ width: 800, height: 300 }}>
      <CubeDefinitionFlow flow={flow} {...props} />
    </div>,
  );
  await TEST__findCanvasNode(flow.outputStepId);
  return screen.getByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW);
};

/** A step's name and its muted detail, as drawn */
const textOf = (node: HTMLElement): string => node.textContent ?? '';

/** The parameters' boxes, as drawn */
const getParameterBoxes = (): HTMLElement[] =>
  screen.queryAllByTestId(LEGEND_CUBE_TEST_ID.DEFINITION_FLOW_PARAMETER);

/** Where React Flow put a node, its top left corner */
const positionOf = (box: HTMLElement): { x: number; y: number } => {
  const match = /translate\((?<x>-?[\d.]+)px,\s*(?<y>-?[\d.]+)px\)/u.exec(
    box.closest<HTMLElement>('.react-flow__node')?.style.transform ?? '',
  );
  return { x: Number(match?.groups?.x), y: Number(match?.groups?.y) };
};

/** A parameter as the engine's grammar declares one */
const parameterOf = (
  name: string,
  type: string,
  multiplicity: { lowerBound: number; upperBound?: number },
): unknown => ({
  _type: 'var',
  name,
  genericType: {
    rawType: { _type: 'packageableType', fullPath: type },
    typeArguments: [],
    multiplicityArguments: [],
    typeVariableValues: [],
  },
  multiplicity,
});

describe("An access point's definition drawn read-only", () => {
  test("Draws each step as Cube lays it out, the output marked and the join's inputs labelled", async () => {
    const flow = flowOf(DEFINITIONS.accessPoints.POSITIONS_BY_LEGAL_ENTITY);
    const container = await renderFlow(flow);
    // Cube's theme colors are scoped to its root, as the editor's
    expect(container.classList.contains('legend-cube')).toBe(true);
    expect(TEST__getCanvasNodes()).toHaveLength(5);
    const [positions, , entities, join, group] = flow.steps;
    expect(textOf(await TEST__findCanvasNode(positions?.id ?? ''))).toBe(
      'EOD_POSITIONSTradePositionsIngest',
    );
    expect(textOf(await TEST__findCanvasNode(entities?.id ?? ''))).toBe(
      'LEGAL_ENTITIESTradePositionsIngest',
    );
    const output = await TEST__findCanvasNode(group?.id ?? '');
    const caption = within(output).getByTestId(
      LEGEND_CUBE_TEST_ID.RUNNING_NODE_BADGE,
    );
    expect(caption.textContent).toBe(RUNNING_NODE_LABEL);
    // nothing runs in a flow: the caption doesn't speak of Run Query
    expect(caption.getAttribute('title')).toBe(
      CUBE_DEFINITION_FLOW_LABEL.OUTPUT_TITLE,
    );
    expect(
      within(await TEST__findCanvasNode(join?.id ?? '')).queryByTestId(
        LEGEND_CUBE_TEST_ID.RUNNING_NODE_BADGE,
      ),
    ).toBeNull();
    await waitFor(() =>
      expect(
        within(container)
          .getAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_EDGE_LABEL)
          .map((label) => label.textContent),
      ).toEqual(expect.arrayContaining(['Left', 'Right'])),
    );
    expect(TEST__getCanvasNodeTooltip(output)).toEqual([
      group
        ? (flow.query.getNode(group.id)?.describe() ?? '')
        : 'no group step',
    ]);
  });

  test("Names a data set whose columns aren't known, neutral, and says so in its tooltip", async () => {
    const flow = flowOf(DEFINITIONS.accessPoints.POSITIONS_BY_BOOK, {
      getIngestDefinition: () => undefined,
    });
    await renderFlow(flow);
    const source = await TEST__findCanvasNode(flow.steps[0]?.id ?? '');
    expect(textOf(source)).toBe('EOD_POSITIONSTradePositionsIngest');
    expect(TEST__getCanvasNodeTooltip(source)).toEqual([
      'Data set "EOD_POSITIONS" from ingest definition "TradePositionsIngest"',
      CUBE_DEFINITION_FLOW_LABEL.UNKNOWN_COLUMNS,
    ]);
    // every step looks as any other: none invalid, none waiting for an input
    TEST__getCanvasNodes().forEach((node) => {
      expect(node.className).not.toMatch(/--invalid|--incomplete|dashed/u);
      expect(node.className).toContain('border-[var(--color-border-default)]');
    });
  });

  test('Tells the host which step was clicked, or picked with Enter or Space, and outlines the one it picked', async () => {
    const flow = flowOf(DEFINITIONS.accessPoints.POSITIONS_BY_DESK);
    const onSelectStep = jest.fn<(stepId: string) => void>();
    const [source, filter] = flow.steps;
    await renderFlow(flow, {
      onSelectStep,
      selectedStepId: filter?.id ?? '',
    });
    const picked = await TEST__findCanvasNode(filter?.id ?? '');
    expect(picked.getAttribute('aria-current')).toBe('true');
    expect(picked.className).toContain('legend-cube__node--selected');
    expect(
      (await TEST__findCanvasNode(source?.id ?? '')).getAttribute(
        'aria-current',
      ),
    ).toBe('false');

    fireEvent.click(await TEST__findCanvasNode(source?.id ?? ''));
    expect(onSelectStep).toHaveBeenLastCalledWith(source?.id);
    const output = (
      await TEST__findCanvasNode(flow.outputStepId)
    ).closest<HTMLElement>('.react-flow__node') as HTMLElement;
    fireEvent.keyDown(output, { key: 'Enter' });
    expect(onSelectStep).toHaveBeenLastCalledWith(flow.outputStepId);
    fireEvent.keyDown(output, { key: ' ' });
    expect(onSelectStep).toHaveBeenCalledTimes(3);
    // another key picks nothing
    fireEvent.keyDown(output, { key: 'Delete' });
    expect(onSelectStep).toHaveBeenCalledTimes(3);
  });

  test('Has nothing that edits: no step editor, menu, palette, minimap or connection', async () => {
    const flow = flowOf(DEFINITIONS.accessPoints.POSITIONS_BY_LEGAL_ENTITY);
    const container = await renderFlow(flow);
    const node = await TEST__findCanvasNode(flow.outputStepId);
    fireEvent.click(node);
    fireEvent.contextMenu(node);
    fireEvent.contextMenu(container);
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR)).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.PALETTE)).toBeNull();
    expect(container.querySelector('.react-flow__minimap')).toBeNull();
    expect(container.querySelectorAll('.react-flow__handle').length).toBe(
      // each step's output, and each of its inputs
      flow.steps.reduce((count, step) => count + 1 + step.inputs.length, 0),
    );
    expect(container.querySelector('.react-flow__handle.connectable')).toBe(
      null,
    );
    // a click on a step picks nothing for a host that didn't ask
    expect(node.className).not.toContain('cursor-pointer');
  });

  test('Puts its zoom controls on the right, with a fit to the left', async () => {
    const container = await renderFlow(
      flowOf(DEFINITIONS.accessPoints.POSITIONS_BY_BOOK),
    );
    const controls = container.querySelector(
      '.react-flow__controls',
    ) as HTMLElement;
    expect(controls.classList.contains('right')).toBe(true);
    expect(controls.classList.contains('left')).toBe(false);
    expect(
      within(controls).getByRole('button', { name: 'fit view' }),
    ).toBeTruthy();
    expect(
      within(controls).getByRole('button', { name: 'zoom in' }),
    ).toBeTruthy();
  });

  test("Draws the definition's parameters as boxes above its steps, each wired into the steps that read it", async () => {
    const flow = flowOf(DEFINITIONS.accessPoints.CLIENT_POSITIONS);
    const onSelectStep = jest.fn<(stepId: string) => void>();
    const container = await renderFlow(flow, { onSelectStep });
    expect(TEST__getCanvasNodes()).toHaveLength(3);
    const [source, filter] = flow.steps;
    // a filter on parameters is a filter by expression, its condition shown
    const filterNode = await TEST__findCanvasNode(filter?.id ?? '');
    const condition =
      'Filter by p | ($p.BUSINESS_DATE == $businessDate) && ($p.CLIENT_ACCOUNT_ID == $clientAccountId)';
    expect(textOf(filterNode)).toBe(condition);
    expect(TEST__getCanvasNodeTooltip(filterNode)).toEqual([
      condition,
      CUBE_DEFINITION_FLOW_LABEL.READS_PARAMETERS([
        'businessDate',
        'clientAccountId',
      ]),
    ]);

    const boxes = await waitFor(() => {
      const found = getParameterBoxes();
      expect(found).toHaveLength(2);
      return found;
    });
    const [businessDate, clientAccountId] = boxes as [HTMLElement, HTMLElement];
    expect(boxes.map(textOf)).toEqual([
      '$businessDateStrictDate',
      '$clientAccountIdString',
    ]);
    expect(TEST__getCanvasNodeTooltip(businessDate)).toEqual([
      'businessDate: StrictDate[1]',
      'Date',
      CUBE_DEFINITION_FLOW_LABEL.PARAMETER_READ_BY,
      condition,
    ]);
    expect(TEST__getCanvasNodeTooltip(clientAccountId).slice(0, 2)).toEqual([
      'clientAccountId: String[1]',
      'Text',
    ]);
    // a row above the steps, side by side over the step that reads them
    const sourceAt = positionOf(await TEST__findCanvasNode(source?.id ?? ''));
    const filterAt = positionOf(filterNode);
    const [dateAt, accountAt] = boxes.map(positionOf) as [
      { x: number; y: number },
      { x: number; y: number },
    ];
    expect(dateAt.y).toBeLessThan(sourceAt.y);
    expect(accountAt.y).toBe(dateAt.y);
    expect(dateAt.x).toBeLessThan(accountAt.x);
    expect(dateAt.x).toBeLessThan(filterAt.x + 100);
    expect(accountAt.x).toBeGreaterThan(filterAt.x);
    // each wired into the filter
    await waitFor(() =>
      ['businessDate', 'clientAccountId'].forEach((name) =>
        expect(
          container.querySelector(
            `[data-testid="rf__edge-parameter:${name}->${filter?.id}"]`,
          ),
        ).not.toBeNull(),
      ),
    );

    // a parameter is no step: a click or Enter on it picks nothing
    fireEvent.click(businessDate);
    fireEvent.keyDown(
      businessDate.closest<HTMLElement>('.react-flow__node') as HTMLElement,
      { key: 'Enter' },
    );
    expect(onSelectStep).not.toHaveBeenCalled();
    fireEvent.click(filterNode);
    expect(onSelectStep).toHaveBeenLastCalledWith(filter?.id);
  });

  test('Puts a parameter no step reads at the start of the row, unwired, and says how many values each takes', async () => {
    const flow = flowOf({
      _type: 'lambda',
      parameters: [
        parameterOf('books', 'String', { lowerBound: 0 }),
        parameterOf('asOf', 'StrictDate', { lowerBound: 0, upperBound: 1 }),
      ],
      body: [
        {
          _type: 'func',
          function: 'filter',
          parameters: [
            (
              DEFINITIONS.accessPoints.POSITIONS_BY_DESK as {
                body: { parameters: unknown[] }[];
              }
            ).body[0]?.parameters[0],
            {
              _type: 'lambda',
              parameters: [{ _type: 'var', name: 'p' }],
              body: [
                {
                  _type: 'func',
                  function: 'in',
                  parameters: [
                    {
                      _type: 'property',
                      property: 'BOOK_ID',
                      parameters: [{ _type: 'var', name: 'p' }],
                    },
                    { _type: 'var', name: 'books' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const container = await renderFlow(flow);
    const boxes = await waitFor(() => {
      const found = getParameterBoxes();
      expect(found).toHaveLength(2);
      return found;
    });
    const [books, asOf] = boxes as [HTMLElement, HTMLElement];
    expect(boxes.map(textOf)).toEqual([
      '$booksString[*]',
      '$asOfStrictDate[0..1]',
    ]);
    expect(TEST__getCanvasNodeTooltip(books).slice(0, 2)).toEqual([
      'books: String[*]',
      `Text, ${CUBE_DEFINITION_FLOW_LABEL.PARAMETER_LIST}`,
    ]);
    expect(TEST__getCanvasNodeTooltip(asOf)).toEqual([
      'asOf: StrictDate[0..1]',
      `Date, ${CUBE_DEFINITION_FLOW_LABEL.PARAMETER_OPTIONAL}`,
      CUBE_DEFINITION_FLOW_LABEL.PARAMETER_UNREAD,
    ]);
    expect(positionOf(asOf).x).toBeLessThan(positionOf(books).x);
    await waitFor(() =>
      expect(
        container.querySelector(
          `[data-testid="rf__edge-parameter:books->${flow.outputStepId}"]`,
        ),
      ).not.toBeNull(),
    );
    expect(
      container.querySelector('[data-testid^="rf__edge-parameter:asOf"]'),
    ).toBeNull();
  });
});
