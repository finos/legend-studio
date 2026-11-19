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
import { fireEvent, render } from '@testing-library/react';
import { CUBE_DEFINITION_FLOW_LABEL } from '../../../__lib__/LegendCubeDefinitionFlowLabels.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodeTooltip,
} from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__installCanvasDomStubs } from '../../../__test-utils__/CubePageTestUtils.js';
import FIXTURE from '../../../graph-manager/__tests__/CubeDefinitionFunctions.json' with { type: 'json' };
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

/** `#SQL{…}#->limit(5)`, as the engine's grammar writes it */
const flowOf = (sql: string): CubeDefinitionFlowReading => {
  const reading = readCubeDefinition({
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
  } as PlainObject);
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
