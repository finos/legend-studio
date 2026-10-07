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
  CubeDocument,
  Query,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import { fireEvent, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../CubeEditor.js';

const renderPage = async (
  initialDocument?: CubeDocument,
): ReturnType<typeof TEST__renderInCubeApplication> => {
  const { host } = TEST__createCubeHost();
  return TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={initialDocument} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
};

const rowOf = (rows: HTMLElement[], nodeId: string): HTMLElement | undefined =>
  rows.find((row) => within(row).queryByText(nodeId) !== null);

beforeEach(() => {
  localStorage.clear();
});

describe('Cube page', () => {
  test('Opens on an empty, unsaved cube, with the query above and the results below', async () => {
    const { getByTestId } = await renderPage();
    const graph = getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    expect(within(graph).getByText('Unsaved Query')).toBeDefined();
    expect(within(graph).getByText(/No tables yet/u)).toBeDefined();
    expect(getByTestId(LEGEND_CUBE_TEST_ID.GRID_REGION)).toBeDefined();
  });

  test("Lists the query's nodes, with the one Execute runs marked", async () => {
    const { getAllByTestId } = await renderPage(
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
        query: sliceQuery(),
      }),
    );
    const rows = getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
    expect(rows).toHaveLength(4);
    const filterRow = rowOf(rows, 'filter101') as HTMLElement;
    expect(filterRow.getAttribute('aria-current')).toBe('true');
    expect(within(filterRow).getByText('(Selected)')).toBeDefined();
    expect(
      within(rowOf(rows, 'relational101') as HTMLElement).getByText(
        'Table "ORDERS" from schema "NORTHWIND"',
      ),
    ).toBeDefined();
  });

  test('Moves the run to another node with Select', async () => {
    const { getAllByTestId } = await renderPage(
      new CubeDocument({ query: sliceQuery() }),
    );
    const joinRow = rowOf(
      getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW),
      'join101',
    ) as HTMLElement;
    fireEvent.click(within(joinRow).getByText('Select'));
    const rows = getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
    expect(
      within(rowOf(rows, 'join101') as HTMLElement).getByText('(Selected)'),
    ).toBeDefined();
    expect(
      within(rowOf(rows, 'filter101') as HTMLElement).getByText('Select'),
    ).toBeDefined();
  });

  test("Shows a node's errors on its row, query-level rules included", async () => {
    const otherDatabase = new RelationalTableSource(
      'relational102',
      { database: 'other::Database', schema: 'NORTHWIND', table: 'ORDERS' },
      { kind: 'resolved', schema: new Schema(ORDERS_COLUMNS) },
    );
    const { getAllByTestId } = await renderPage(
      new CubeDocument({
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            otherDatabase,
          ],
          [],
          'relational101',
        ),
      }),
    );
    const rows = getAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW);
    expect(
      within(rowOf(rows, 'relational101') as HTMLElement).queryAllByRole(
        'alert',
      ),
    ).toHaveLength(0);
    expect(
      within(rowOf(rows, 'relational102') as HTMLElement).getByRole('alert')
        .textContent,
    ).toContain('Sources from different databases are not supported yet');
  });
});
