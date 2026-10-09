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
import { CubeDocument } from '@finos/legend-cube';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  CUBE_DIRECT_HELP_TEXT,
  CUBE_DIRECT_MESSAGE,
} from '../../../__lib__/LegendCubeDirectConnectionLabels.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  CubeConnectionDatasourceKind,
  CubeDirectDatabaseType,
} from '../../../graph-manager/CubeConnectionExplorer.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../../graph-manager/CubeDirectConnection.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeDirectConnectionTabState } from '../../../stores/source-picker/CubeDirectConnectionTabState.js';
import { CubeDirectConnectionTab } from '../CubeDirectConnectionTab.js';

let consoleError: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error');
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

const renderTab = (
  document?: CubeDocument,
): ReturnType<typeof TEST__createCubeHost> & {
  tab: CubeDirectConnectionTabState;
} => {
  const created = TEST__createCubeHost();
  const tab = new CubeDirectConnectionTabState(
    new CubeEditorState(created.host, document),
  );
  render(<CubeDirectConnectionTab tab={tab} />);
  return { ...created, tab };
};

describe('Database connection tab', () => {
  test('Offers H2 and DuckDB only, with a file for DuckDB', () => {
    renderTab();
    const database = screen.getByLabelText('Database');
    expect(
      within(database)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['H2', 'DuckDB']);
    expect(screen.queryByLabelText('File')).toBeNull();
    fireEvent.change(database, {
      target: { value: CubeDirectDatabaseType.DUCKDB },
    });
    expect(screen.getByLabelText('File')).toHaveProperty(
      'title',
      CUBE_DIRECT_HELP_TEXT.DUCKDB_PATH,
    );
    // no field for a secret
    expect(screen.queryByLabelText(/password|token/iu)).toBeNull();
  });

  test('Says what H2 needs, and tests nothing without it', () => {
    renderTab();
    fireEvent.change(screen.getByLabelText('Setup SQL'), {
      target: { value: '' },
    });
    expect(
      screen.getByText(CUBE_DIRECT_MESSAGE.H2_NEEDS_SETUP_SQL),
    ).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'Test connection' }),
    ).toHaveProperty('disabled', true);
  });

  test('Lists the tables once tested, with their counts, hidden columns and names as stored, and forgets them on an edit', async () => {
    const { tab } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    const tables = await screen.findByRole('list', { name: 'Tables' });
    expect(
      within(tables)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['ORDERS3 columns, 1 column hidden', 'ORDER.LINES2 columns']);
    fireEvent.click(within(tables).getByText('ORDER.LINES'));
    expect(tab.tableName).toBe('"ORDER.LINES"');
    expect(tab.canConfirm).toBe(true);
    fireEvent.change(screen.getByLabelText('Setup SQL'), {
      target: { value: 'create schema OTHER;' },
    });
    expect(screen.queryByRole('list', { name: 'Tables' })).toBeNull();
    expect(tab.canConfirm).toBe(false);
  });

  test('Shows a failed test by its first line, with the details on demand', async () => {
    const { connections } = renderTab();
    connections.listSchemas.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "The engine couldn't reach the database\njava.net.ConnectException: Connection refused",
      ),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    const alert = await screen.findByRole('alert');
    expect(alert.firstChild?.textContent).toBe(
      "The engine couldn't reach the database",
    );
    expect(within(alert).getByText('Details')).not.toBeNull();
    expect(alert.querySelector('pre')?.textContent).toContain(
      'Connection refused',
    );
  });

  test('Shows a saved connection by its summary, never its setup SQL, and lists its schemas', async () => {
    const { connections } = renderTab(
      new CubeDocument().withContext({
        model: createCubeDirectModel({
          _type: 'saved',
          setupSqls: ['create schema SECRET_SAUCE'],
        }),
        runtime: CUBE_DIRECT_RUNTIME_PATH,
      }),
    );
    connections.describeConnection.mockReturnValue({
      supported: true,
      summary: {
        databaseType: CubeDirectDatabaseType.H2,
        datasourceKind: CubeConnectionDatasourceKind.LOCAL_H2,
        setupSqlCount: 1,
        authenticationKind: 'h2Default',
      },
    });
    expect(screen.queryByLabelText('Setup SQL')).toBeNull();
    expect(screen.queryByText(/SECRET_SAUCE/u)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'List schemas' }));
    await screen.findByRole('list', { name: 'Tables' });
    expect(connections.listSchemas).toHaveBeenCalledTimes(1);
  });

  test("Lists what's wrong with a saved connection Cube can't use", async () => {
    const { connections } = TEST__createCubeHost();
    connections.describeConnection.mockReturnValue({
      supported: false,
      problems: [
        `The connection sets "quoteIdentifiers", which Cube doesn't support`,
      ],
    });
    const { host } = TEST__createCubeHost();
    const tab = new CubeDirectConnectionTabState(
      new CubeEditorState(
        { ...host, connectionExplorer: connections.explorer },
        new CubeDocument().withContext({
          model: createCubeDirectModel({ _type: 'saved' }),
          runtime: CUBE_DIRECT_RUNTIME_PATH,
        }),
      ),
    );
    render(<CubeDirectConnectionTab tab={tab} />);
    await waitFor(() =>
      expect(
        screen.getByText(
          `The connection sets "quoteIdentifiers", which Cube doesn't support`,
        ),
      ).not.toBeNull(),
    );
    expect(screen.getByRole('button', { name: 'List schemas' })).toHaveProperty(
      'disabled',
      true,
    );
  });
});
