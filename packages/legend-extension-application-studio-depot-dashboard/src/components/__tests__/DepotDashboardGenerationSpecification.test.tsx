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
  type LegendStudioApplicationStore,
  LegendStudioApplicationConfig,
  LegendStudioPluginManager,
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';
import {
  render,
  screen,
  act,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import { flowResult } from 'mobx';
import { DepotDashboard } from '../DepotDashboard.js';
import {
  DEPOT_DASHBOARD_MAX_CONCURRENT_CALLS,
  DepotDashboardStore,
} from '../../stores/DepotDashboardStore.js';

jest.mock('@finos/legend-application-studio', () => {
  const actual = jest.requireActual('@finos/legend-application-studio');
  return {
    ...(actual as object),
    useLegendStudioApplicationStore: jest.fn(),
    useLegendStudioBaseStore: jest.fn(),
  };
});

const setup = (): {
  applicationStore: ApplicationStore<
    LegendStudioApplicationConfig,
    LegendStudioPluginManager
  >;
  depotServerClient: DepotServerClient;
} => {
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
  (useLegendStudioApplicationStore as jest.Mock).mockReturnValue(
    applicationStore,
  );
  (useLegendStudioBaseStore as jest.Mock).mockReturnValue({
    depotServerClient,
  });
  return { applicationStore, depotServerClient };
};

const summary = (
  artifactId: string,
  versionId: string,
  path: string,
): StoredSummaryEntity => {
  const entity = new StoredSummaryEntity();
  entity.groupId = 'test.group';
  entity.artifactId = artifactId;
  entity.versionId = versionId;
  entity.path = path;
  entity.classifierPath = CORE_PURE_PATH.GENERATION_SPECIFICATION;
  return entity;
};

const range = (count: number): number[] =>
  Array.from({ length: count }, (_, index) => index + 1);

// alpha: 5 generation elements, 4 file generations (pointers)
// beta: no generation elements, 6 file generations (plain paths, older entities)
// gamma: neither list
const CONTENT = new Map<string, PlainObject>([
  [
    'test::alpha::AlphaGenerations',
    {
      _type: 'generationSpecification',
      generationNodes: range(5).map((i) => ({
        id: `n${i}`,
        generationElement: `test::alpha::Model${i}`,
      })),
      fileGenerations: range(4).map((i) => ({
        type: 'FILE_GENERATION',
        path: `test::alpha::File${i}`,
      })),
    },
  ],
  [
    'test::beta::BetaGenerations',
    {
      _type: 'generationSpecification',
      generationNodes: [],
      fileGenerations: range(6).map((i) => `test::beta::File${i}`),
    },
  ],
  ['test::gamma::GammaGenerations', { _type: 'generationSpecification' }],
]);

test('display generation specifications with their generation element and file generation counts', async () => {
  const { applicationStore, depotServerClient } = setup();
  const summaries = [
    summary('alpha', '1.0.0', 'test::alpha::AlphaGenerations'),
    summary('beta', '2.1.0', 'test::beta::BetaGenerations'),
    summary('gamma', '0.3.0', 'test::gamma::GammaGenerations'),
  ];
  const summarySpy = createSpy(
    depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockImplementation(async (classifier) =>
    classifier === CORE_PURE_PATH.GENERATION_SPECIFICATION
      ? summaries.map((s) => StoredSummaryEntity.serialization.toJson(s))
      : [],
  );
  createSpy(depotServerClient, 'getVersionEntity').mockImplementation(
    async (groupId, artifactId, versionId, path) => ({
      path,
      classifierPath: CORE_PURE_PATH.GENERATION_SPECIFICATION,
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
        <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
          <ApplicationFrameworkProvider>
            <DepotDashboard />
          </ApplicationFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </ApplicationStoreProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  // switch the element type
  await act(async () => {
    fireEvent.keyDown(
      document.getElementById('depot-dashboard-element-type') as HTMLElement,
      { key: 'ArrowDown' },
    );
  });
  await act(async () => {
    fireEvent.click(await screen.findByText('Generation Specification'));
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  expect(summarySpy).toHaveBeenCalledWith(
    CORE_PURE_PATH.GENERATION_SPECIFICATION,
    expect.anything(),
  );
  await screen.findByText('Generation Specifications: 3 / 3 fetched');
  await screen.findByText('AlphaGenerations');
  await screen.findByText('PROJECT-alpha');
  // generation element and file generation counts
  await screen.findByText('5');
  await screen.findByText('4');
  await screen.findByText('6');
  expect(await screen.findAllByText('0')).toHaveLength(3);
  // and the paths behind them
  await screen.findByText(
    range(5)
      .map((i) => `test::alpha::Model${i}`)
      .join(', '),
  );
  await screen.findByText(
    range(6)
      .map((i) => `test::beta::File${i}`)
      .join(', '),
  );
});

test('fetch generation specifications a few at a time and each project once', async () => {
  const { applicationStore, depotServerClient } = setup();
  // 40 generation specifications in 4 projects
  const summaries = range(40).map((i) =>
    summary(`project${i % 4}`, '1.0.0', `test::p${i}::Generations`),
  );
  createSpy(
    depotServerClient,
    'getEntitiesSummaryByClassifier',
  ).mockImplementation(async () =>
    summaries.map((s) => StoredSummaryEntity.serialization.toJson(s)),
  );
  let inFlight = 0;
  let maxInFlight = 0;
  createSpy(depotServerClient, 'getVersionEntity').mockImplementation(
    async (groupId, artifactId, versionId, path) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return {
        path,
        classifierPath: CORE_PURE_PATH.GENERATION_SPECIFICATION,
        content: { _type: 'generationSpecification' },
      };
    },
  );
  const projectSpy = createSpy(
    depotServerClient,
    'getProject',
  ).mockImplementation(async (groupId, artifactId) => ({
    projectId: `PROJECT-${artifactId}`,
    groupId,
    artifactId,
  }));

  const state = new DepotDashboardStore(
    applicationStore as unknown as LegendStudioApplicationStore,
    depotServerClient,
  ).generationSpecificationDepotState;
  await flowResult(state.init());
  await waitFor(() => expect(state.fetchedCount).toBe(40));

  expect(maxInFlight).toBeGreaterThan(1);
  expect(maxInFlight).toBeLessThanOrEqual(DEPOT_DASHBOARD_MAX_CONCURRENT_CALLS);
  expect(projectSpy).toHaveBeenCalledTimes(4);
  expect(
    state.entityStates?.every(
      (entityState) =>
        entityState.projectId === `PROJECT-${entityState.summary.artifactId}`,
    ),
  ).toBe(true);
});
