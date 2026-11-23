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
  TEST__queryCanvasNode,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__installCanvasDomStubs } from '../../../__test-utils__/CubePageTestUtils.js';
import FIXTURE from '../../../graph-manager/__tests__/CubeDefinitionFunctions.json' with { type: 'json' };
import TREES from '../../../graph-manager/__tests__/CubeSqlTrees.json' with { type: 'json' };
import {
  readCubeDefinition,
  type CubeDefinitionFlowReading,
  type CubeDefinitionSqlIsland,
} from '../../../graph-manager/CubeDefinitionReader.js';
import { CubeDefinitionFlow } from '../CubeDefinitionFlow.js';

// The engine's SQL island in a definition's flow, `#SQL{…}#`, drawn: one
// dashed step showing its SQL's first words. The data is made up.

const INGEST = FIXTURE.ingestDefinition;
const SQL = `select o.STATUS,\n  sum(o.AMOUNT) as total\nfrom i('${INGEST}.ORDERS') o\njoin p('shop::Product.customers') c on o.CUSTOMER_ID = c.CUSTOMER_ID\ngroup by o.STATUS`;

/** `#SQL{…}#->limit(5)`, as the engine's grammar writes it; read with the engine's tree of its SQL, or without */
const flowOf = (sql: string, tree?: unknown): CubeDefinitionFlowReading => {
  const reading = readCubeDefinition(
    {
      _type: 'lambda',
      parameters: [],
      body: [
        {
          _type: 'func',
          function: 'limit',
          parameters: [
            { _type: 'classInstance', type: 'SQL', value: { sql } },
            { _type: 'integer', value: 5 },
          ],
        },
      ],
    } as PlainObject,
    {
      getSqlTree: () => tree,
      getIngestDefinition: (path) =>
        path === INGEST
          ? (FIXTURE.ingestDefinitionContent as PlainObject)
          : undefined,
    },
  );
  if (reading.kind !== 'flow') {
    throw new Error(`Refused: ${reading.message}`);
  }
  return reading;
};

const renderFlow = async (
  flow: CubeDefinitionFlowReading,
  props: {
    onShowSql?: (island: CubeDefinitionSqlIsland) => void;
    onSelectStep?: (stepId: string) => void;
    initiallyFolded?: readonly string[];
  } = {},
): Promise<HTMLElement> => {
  TEST__installCanvasDomStubs();
  render(
    <div style={{ width: 1000, height: 400 }}>
      <CubeDefinitionFlow flow={flow} {...props} />
    </div>,
  );
  await TEST__findCanvasNode(flow.outputStepId);
  return TEST__findCanvasNode('unknown101');
};

describe('A definition holding SQL, drawn', () => {
  test('Draws the SQL as one dashed step: its first words, and what it names', async () => {
    const step = await renderFlow(flowOf(SQL));
    expect(step.className).toContain('legend-cube__node--sql');
    expect(step.className).toContain('border-dashed');
    expect(step.textContent).toContain(CUBE_DEFINITION_FLOW_LABEL.SQL);
    // on one line: the box cuts what doesn't fit
    expect(step.textContent).toContain(
      'select o.STATUS, sum(o.AMOUNT) as total from',
    );
    expect(step.textContent).toContain(
      CUBE_DEFINITION_FLOW_LABEL.SQL_NAMES(['ORDERS', 'customers']),
    );
    // no handler: a click shows nothing, and the box doesn't look clickable
    expect(step.className).not.toContain('cursor-pointer');
  });

  test('Says in its tooltip that Cube reads none of it, with its SQL and the paths it names', async () => {
    const tooltip = TEST__getCanvasNodeTooltip(await renderFlow(flowOf(SQL)));
    expect(tooltip.slice(0, 5)).toEqual(SQL.split('\n'));
    expect(tooltip.slice(5)).toEqual([
      CUBE_DEFINITION_FLOW_LABEL.SQL_ONE_STEP,
      CUBE_DEFINITION_FLOW_LABEL.SQL_NAMES_DATA_SETS([`${INGEST}.ORDERS`]),
      CUBE_DEFINITION_FLOW_LABEL.SQL_NAMES_ACCESS_POINTS([
        'shop::Product.customers',
      ]),
    ]);
  });

  test('Cuts a long SQL in its tooltip, and says its columns are not known when it names nothing', async () => {
    const long = Array.from({ length: 20 }, (_, line) => `-- ${line}`).join(
      '\n',
    );
    const step = await renderFlow(flowOf(`${long}\nselect 1 as A`));
    expect(step.textContent).toContain(
      CUBE_DEFINITION_FLOW_LABEL.SQL_COLUMNS_UNKNOWN,
    );
    const tooltip = TEST__getCanvasNodeTooltip(step);
    expect(tooltip.slice(11, 14)).toEqual([
      '-- 11',
      '…',
      CUBE_DEFINITION_FLOW_LABEL.SQL_ONE_STEP,
    ]);
  });

  test('Hands the host its SQL on a click, Enter or Space', async () => {
    const onShowSql = jest.fn<(island: CubeDefinitionSqlIsland) => void>();
    const flow = flowOf(SQL);
    const step = await renderFlow(flow, { onShowSql });
    expect(step.className).toContain('cursor-pointer');
    expect(TEST__getCanvasNodeTooltip(step).at(-1)).toBe(
      CUBE_DEFINITION_FLOW_LABEL.SHOW_SQL,
    );
    fireEvent.click(step);
    expect(onShowSql).toHaveBeenLastCalledWith(flow.sqlIslands[0]);
    const node = step.closest<HTMLElement>('.react-flow__node') as HTMLElement;
    fireEvent.keyDown(node, { key: 'Enter' });
    fireEvent.keyDown(node, { key: ' ' });
    expect(onShowSql).toHaveBeenCalledTimes(3);
    // a step that isn't SQL shows none
    fireEvent.click(await TEST__findCanvasNode('limit101'));
    fireEvent.keyDown(
      (await TEST__findCanvasNode('limit101')).closest<HTMLElement>(
        '.react-flow__node',
      ) as HTMLElement,
      { key: 'Enter' },
    );
    expect(onShowSql).toHaveBeenCalledTimes(3);
  });

  test('Still tells the host the step was picked', async () => {
    const onShowSql = jest.fn<(island: CubeDefinitionSqlIsland) => void>();
    const onSelectStep = jest.fn<(stepId: string) => void>();
    const step = await renderFlow(flowOf(SQL), { onShowSql, onSelectStep });
    fireEvent.click(step);
    expect(onSelectStep).toHaveBeenLastCalledWith('unknown101');
    expect(onShowSql).toHaveBeenCalledTimes(1);
  });
});

// With the engine's tree of its SQL: a container of the steps its clauses are

const JOINED = TREES['join-group-order-limit'];
const getFrames = (): HTMLElement[] =>
  screen.queryAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_CONTAINER);
const getBoxes = (): HTMLElement[] =>
  screen.queryAllByTestId(LEGEND_CUBE_TEST_ID.CANVAS_FOLDED_CONTAINER);

describe("A definition holding SQL, drawn as the steps of its SQL with the engine's tree", () => {
  test('Draws a container of its steps: its data sets as any other, each clause as the SQL says it', async () => {
    const join = await renderFlow(flowOf(JOINED.sql, JOINED.tree));
    const [frame] = getFrames();
    expect(getFrames()).toHaveLength(1);
    expect(frame?.className).toContain('legend-cube__sql-container');
    expect(frame?.textContent).toContain(CUBE_DEFINITION_FLOW_LABEL.SQL);
    expect(frame?.textContent).toContain('select c.REGION, sum(o.AMOUNT)');
    // a clause: dashed, its words then what it says
    expect(join.className).toContain('border-dashed');
    expect(join.textContent).toBe('Inner joinon o.CUSTOMER_ID = c.CUSTOMER_ID');
    expect(
      await Promise.all(
        ['102', '103', '104', '105', '106'].map(
          async (id) =>
            (await TEST__findCanvasNode(`unknown${id}`)).textContent,
        ),
      ),
    ).toEqual([
      "Whereo.STATUS = 'ACTIVE'",
      'Group byc.REGION',
      'SelectREGION, TOTAL_AMOUNT, ORDERS',
      'Order byTOTAL_AMOUNT desc',
      'Limit10 rows',
    ]);
    // a data set: a step as in Pure, its columns known
    const orders = await TEST__findCanvasNode('ingestDataset101');
    expect(orders.className).not.toContain('border-dashed');
    expect(orders.textContent).toContain('ORDERS');
    expect(TEST__getCanvasNodeTooltip(orders)).toContain(
      CUBE_DEFINITION_FLOW_LABEL.SQL_ALIAS('o'),
    );
    // the Pure step after it reads its last step
    expect((await TEST__findCanvasNode('limit101')).className).not.toContain(
      'border-dashed',
    );
  });

  test("Says in a clause's tooltip what it says in full, and that Cube doesn't check it", async () => {
    await renderFlow(flowOf(JOINED.sql, JOINED.tree));
    expect(
      TEST__getCanvasNodeTooltip(await TEST__findCanvasNode('unknown104')),
    ).toEqual([
      'Select',
      'c.REGION, sum(o.AMOUNT) as TOTAL_AMOUNT, count(*) as ORDERS',
      CUBE_DEFINITION_FLOW_LABEL.SQL_STEP_AS_WRITTEN,
    ]);
  });

  test('Hands the host the SQL on a click on a clause, Enter on it, or its button', async () => {
    const onShowSql = jest.fn<(island: CubeDefinitionSqlIsland) => void>();
    const flow = flowOf(JOINED.sql, JOINED.tree);
    const [island] = flow.sqlIslands;
    const join = await renderFlow(flow, { onShowSql });
    expect(TEST__getCanvasNodeTooltip(join).at(-1)).toBe(
      CUBE_DEFINITION_FLOW_LABEL.SHOW_SQL,
    );
    fireEvent.click(join);
    expect(onShowSql).toHaveBeenLastCalledWith(island);
    fireEvent.keyDown(
      join.closest<HTMLElement>('.react-flow__node') as HTMLElement,
      { key: 'Enter' },
    );
    fireEvent.click(await TEST__findCanvasNode('ingestDataset101'));
    expect(onShowSql).toHaveBeenCalledTimes(3);
    fireEvent.click(
      within(getFrames()[0] as HTMLElement).getByRole('button', {
        name: CUBE_DEFINITION_FLOW_LABEL.SHOW_SQL_BUTTON,
      }),
    );
    expect(onShowSql).toHaveBeenCalledTimes(4);
    expect(onShowSql).toHaveBeenLastCalledWith(island);
  });

  test('Folds to one box that says how many steps it holds, and opens again', async () => {
    await renderFlow(flowOf(JOINED.sql, JOINED.tree));
    fireEvent.click(
      within(getFrames()[0] as HTMLElement).getByRole('button', {
        name: CUBE_DEFINITION_FLOW_LABEL.FOLD_SQL,
      }),
    );
    await waitFor(() => expect(getBoxes()).toHaveLength(1));
    const [box] = getBoxes();
    expect(getFrames()).toHaveLength(0);
    expect(TEST__queryCanvasNode('unknown101')).toBeNull();
    expect(box?.textContent).toContain(
      CUBE_DEFINITION_FLOW_LABEL.FOLDED(
        CUBE_DEFINITION_FLOW_LABEL.STEP_COUNT(8),
      ),
    );
    fireEvent.click(
      within(box as HTMLElement).getByRole('button', {
        name: CUBE_DEFINITION_FLOW_LABEL.OPEN_SQL,
      }),
    );
    await waitFor(() => expect(getFrames()).toHaveLength(1));
    expect(await TEST__findCanvasNode('unknown101')).not.toBeNull();
  });

  test('Says why SQL it has the tree of is one box all the same', async () => {
    const refused = TREES['in-subquery'];
    const step = await renderFlow(flowOf(refused.sql, refused.tree));
    expect(getFrames()).toHaveLength(0);
    expect(TEST__getCanvasNodeTooltip(step)).toContain(
      CUBE_DEFINITION_FLOW_LABEL.SQL_NOT_DRAWN('a query inside an expression'),
    );
  });
});
