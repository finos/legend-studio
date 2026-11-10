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

import { jest, expect, test } from '@jest/globals';
import { CORE_PURE_PATH } from '@finos/legend-graph';
import {
  DepotServerClient,
  StoredSummaryEntity,
} from '@finos/legend-server-depot';
import {
  AuthorizableProjectAction,
  SDLCServerClient,
} from '@finos/legend-server-sdlc';
import { Route, Routes } from '@finos/legend-application/browser';
import { createSpy } from '@finos/legend-shared/test';
import type { PlainObject } from '@finos/legend-shared';
import {
  ApplicationFrameworkProvider,
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  TEST__BrowserEnvironmentProvider,
  TEST__getApplicationVersionData,
} from '@finos/legend-application/test';
import {
  LegendStudioApplicationConfig,
  LegendStudioPluginManager,
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';
import { render, screen, act, waitFor } from '@testing-library/react';
import { DepotDashboard } from '../DepotDashboard.js';
import { DEPOT_DATA_SPACE_CLASSIFIER_PATH } from '../../stores/DepotDataSpace.js';

jest.mock('@finos/legend-application-studio', () => {
  const actual = jest.requireActual('@finos/legend-application-studio');
  return {
    ...(actual as object),
    useLegendStudioApplicationStore: jest.fn(),
    useLegendStudioBaseStore: jest.fn(),
  };
});

const setup = () => {
  const applicationStore = new ApplicationStore(
    new LegendStudioApplicationConfig({
      configData: {
        appName: 'studio',
        env: 'test',
        sdlc: { url: 'https://testSdlcUrl' },
        depot: { url: 'https://testDepotUrl' },
        engine: { url: 'https://testEngineUrl' },
      },
      versionData: TEST__getApplicationVersionData(),
      baseAddress: '/studio/',
    }),
    LegendStudioPluginManager.create(),
  );
  const depotServerClient = new DepotServerClient({
    serverUrl: 'http://test-depot-server',
  });
  const sdlcServerClient = new SDLCServerClient({
    env: 'test',
    serverUrl: 'http://test-sdlc-server',
  });
  (useLegendStudioApplicationStore as jest.Mock).mockReturnValue(
    applicationStore,
  );
  (useLegendStudioBaseStore as jest.Mock).mockReturnValue({
    depotServerClient,
    sdlcServerClient,
  });
  createSpy(sdlcServerClient, 'getAccessRole').mockResolvedValue({
    accessRole: 'DEVELOPER',
  });
  createSpy(sdlcServerClient, 'getAutorizedActions').mockResolvedValue([
    AuthorizableProjectAction.CREATE_WORKSPACE,
  ]);
  return { applicationStore, depotServerClient };
};

const summary = (artifactId: string, path: string): StoredSummaryEntity => {
  const entity = new StoredSummaryEntity();
  entity.groupId = 'test.group';
  entity.artifactId = artifactId;
  entity.versionId = '1.0.0';
  entity.path = path;
  entity.classifierPath = DEPOT_DATA_SPACE_CLASSIFIER_PATH;
  return entity;
};

// trades: 2 execution contexts, a template query and a service, 3 diagrams
//   (one featured, as older data spaces have them), email support
// empty: none of the lists
const CONTENT = new Map<string, PlainObject>([
  [
    'test::trades::TradesDataSpace',
    {
      _type: 'dataSpace',
      title: 'Trades and desks',
      defaultExecutionContext: 'prod',
      executionContexts: [{ name: 'prod' }, { name: 'uat' }],
      executables: [
        {
          _type: 'dataSpaceTemplateExecutable',
          id: 'byDesk',
          title: 'Trades by desk',
          query: { _type: 'lambda', body: [], parameters: [] },
        },
        {
          _type: 'dataSpacePackageableElementExecutable',
          title: 'Trade service',
          executable: { path: 'test::trades::TradeService' },
        },
      ],
      diagrams: [
        { title: 'Trades', diagram: { path: 'test::trades::TradeDiagram' } },
        { title: 'Desks', diagram: { path: 'test::trades::DeskDiagram' } },
      ],
      featuredDiagrams: [{ type: 'DIAGRAM', path: 'test::trades::OldDiagram' }],
      supportInfo: { _type: 'email', address: 'trades@example.com' },
    },
  ],
  ['test::empty::EmptyDataSpace', { _type: 'dataSpace' }],
]);

/** The text of a row's cell, by the element's name and the column's header */
const cellText = (name: string, header: string): string | undefined => {
  const colId = Array.from(document.querySelectorAll('.ag-header-cell'))
    .find(
      (cell) =>
        cell.querySelector('.ag-header-cell-text')?.textContent?.trim() ===
        header,
    )
    ?.getAttribute('col-id');
  const rowIndex = screen
    .getByRole('link', { name })
    .closest('.ag-row')
    ?.getAttribute('row-index');
  return document
    .querySelector(
      `.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${colId}"]`,
    )
    ?.textContent?.trim();
};

test('display data spaces with their execution contexts, executables and diagrams', async () => {
  const { applicationStore, depotServerClient } = setup();
  const summarySpy = createSpy(
    depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockImplementation(async (classifier) =>
    classifier === DEPOT_DATA_SPACE_CLASSIFIER_PATH
      ? [
          summary('trades', 'test::trades::TradesDataSpace'),
          summary('empty', 'test::empty::EmptyDataSpace'),
        ].map((s) => StoredSummaryEntity.serialization.toJson(s))
      : [],
  );
  createSpy(depotServerClient, 'getVersionEntity').mockImplementation(
    async (groupId, artifactId, versionId, path) => ({
      path,
      classifierPath: DEPOT_DATA_SPACE_CLASSIFIER_PATH,
      content: CONTENT.get(path),
    }),
  );
  createSpy(depotServerClient, 'getProject').mockImplementation(
    async (groupId, artifactId) => ({
      projectId: `PROJECT-${artifactId}`,
      groupId,
      artifactId,
    }),
  );
  await act(async () => {
    render(
      <ApplicationStoreProvider store={applicationStore}>
        <TEST__BrowserEnvironmentProvider
          initialEntries={['/extensions/depot/data-spaces']}
        >
          <ApplicationFrameworkProvider>
            <Routes>
              <Route
                path="/extensions/depot/:elementType"
                element={<DepotDashboard />}
              />
            </Routes>
          </ApplicationFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </ApplicationStoreProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  await screen.findByText('Data Spaces: 2 / 2 fetched');
  expect(summarySpy).not.toHaveBeenCalledWith(
    CORE_PURE_PATH.DATA_PRODUCT,
    expect.anything(),
  );
  await screen.findByRole('link', { name: 'TradesDataSpace' });
  await screen.findByText('PROJECT-trades');
  await waitFor(() =>
    expect(cellText('TradesDataSpace', 'Your Access')).toBe('Developer'),
  );

  const trades = (header: string): string | undefined =>
    cellText('TradesDataSpace', header);
  // execution contexts, executables, diagrams (featured ones included)
  expect(trades('Execution Contexts')).toBe('2');
  expect(trades('Executables')).toBe('2');
  expect(trades('Diagrams')).toBe('3');
  expect(trades('Title')).toBe('Trades and desks');
  expect(trades('Default Execution Context')).toBe('prod');
  expect(trades('Support Info')).toBe('Email');
  // the names behind the counts
  expect(trades('Execution Context Names')).toBe('prod, uat');
  expect(trades('Executable Titles')).toBe('Trades by desk, Trade service');
  expect(trades('Diagram Paths')).toBe(
    'test::trades::TradeDiagram, test::trades::DeskDiagram, test::trades::OldDiagram',
  );

  // the empty data space counts nothing
  const empty = (header: string): string | undefined =>
    cellText('EmptyDataSpace', header);
  expect(empty('Execution Contexts')).toBe('0');
  expect(empty('Executables')).toBe('0');
  expect(empty('Diagrams')).toBe('0');
  expect(empty('Support Info')).toBe('None');
});
