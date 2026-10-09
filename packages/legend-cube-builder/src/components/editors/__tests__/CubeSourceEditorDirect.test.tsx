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

import { describe, expect, test } from '@jest/globals';
import {
  CubeDocument,
  PrimitiveType,
  Query,
  RelationalTableSource,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CUBE_DIRECT_CONNECTION_FALLBACK_LABEL } from '../../../__lib__/LegendCubeDirectConnectionLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../../graph-manager/CubeDirectConnection.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import type { CubeHost } from '../../../stores/CubeHost.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';
import { CubeNodeEditorPanel } from '../CubeNodeEditorPanel.js';

const CONNECTION = {
  _type: 'saved',
  setupSqls: ['create schema SECRET_SAUCE'],
};
const ORDERS_SCHEMA = new Schema([
  new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
]);

/** A direct cube of one table, ORDERS */
const directCube = (): CubeDocument =>
  new CubeDocument({
    context: {
      model: createCubeDirectModel(CONNECTION),
      runtime: CUBE_DIRECT_RUNTIME_PATH,
    },
    query: new Query(
      [
        new RelationalTableSource(
          'relational101',
          {
            database: CUBE_DIRECT_DATABASE_PATH,
            schema: '"CUBE_DIRECT"',
            table: '"ORDERS"',
          },
          { kind: 'resolved', schema: ORDERS_SCHEMA },
        ),
      ],
      [],
      'relational101',
    ),
  });

const renderPanel = async (
  prepare?: (created: ReturnType<typeof TEST__createCubeHost>) => CubeHost,
): Promise<ReturnType<typeof TEST__createCubeHost>> => {
  const created = TEST__createCubeHost({
    schemas: new Map([['"CUBE_DIRECT"."ORDERS"', ORDERS_SCHEMA]]),
  });
  const host = prepare?.(created) ?? created.host;
  const editorState = new CubeEditorState(host, directCube());
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex' }}>
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>
      <CubeNodeEditorPanel editorState={editorState} />
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  fireEvent.click(await TEST__findCanvasNode('relational101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return created;
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

describe('Source panel of a direct-connection cube', () => {
  test("Shows the cube's connection by its summary, never its setup SQL or the Database Cube builds", async () => {
    const { connections } = await renderPanel();
    expect(connections.describeConnection).toHaveBeenCalledWith(CONNECTION);
    expect(within(panel()).getByText('Connection')).not.toBeNull();
    expect(
      within(panel()).getByText(
        "H2: an H2 database in the engine's H2 server, 1 setup statement, authentication h2Default",
      ),
    ).not.toBeNull();
    expect(within(panel()).queryByText('Database')).toBeNull();
    expect(panel().textContent).not.toContain(CUBE_DIRECT_DATABASE_PATH);
    expect(panel().textContent).not.toContain('SECRET_SAUCE');
    // names show as stored, without their quotes
    expect(within(panel()).getByText('CUBE_DIRECT')).not.toBeNull();
    expect(within(panel()).getByText('ORDERS')).not.toBeNull();
  });

  test('Names the connection plainly on a host without a connection explorer', async () => {
    await renderPanel(({ host }) => ({
      ...host,
      connectionExplorer: undefined,
    }));
    expect(
      within(panel()).getByText(CUBE_DIRECT_CONNECTION_FALLBACK_LABEL),
    ).not.toBeNull();
  });

  test("Types the table again on Refresh, through the cube's connection, and warns once when that fails", async () => {
    const { fake } = await renderPanel();
    fake.resolveSchemas.mockClear();
    fireEvent.click(within(panel()).getByText('Refresh'));
    await waitFor(() =>
      expect(
        within(panel()).getByText<HTMLButtonElement>('Refresh').disabled,
      ).toBe(false),
    );
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
    expect(fake.resolveSchemas.mock.calls[0]?.[0]).toEqual(
      createCubeDirectModel(CONNECTION),
    );
    expect(within(panel()).queryAllByRole('status')).toHaveLength(0);

    fake.resolveSchemas.mockResolvedValueOnce(
      new Map([
        [
          'relational101',
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            "The database refused a statement: check the connection's setup SQL",
            'relational101',
          ),
        ],
      ]),
    );
    fireEvent.click(within(panel()).getByText('Refresh'));
    await waitFor(() =>
      expect(within(panel()).getAllByRole('status')).toHaveLength(1),
    );
    // the table keeps its columns
    expect(
      within(panel()).getByRole('table', { name: 'Columns' }),
    ).not.toBeNull();
  });
});
