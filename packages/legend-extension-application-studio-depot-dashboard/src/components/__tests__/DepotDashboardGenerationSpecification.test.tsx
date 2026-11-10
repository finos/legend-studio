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
  DepotScope,
  DepotServerClient,
  MASTER_SNAPSHOT_ALIAS,
  StoredSummaryEntity,
} from '@finos/legend-server-depot';
import {
  AuthorizableProjectAction,
  SDLCServerClient,
  Workspace,
  WorkspaceType,
} from '@finos/legend-server-sdlc';
import { DEPOT_DASHBOARD_FLATTEN_WORKSPACE_ID } from '../../stores/DepotGenerationSpecificationFlattenState.js';
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
  sdlcServerClient: SDLCServerClient;
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
  return { applicationStore, depotServerClient, sdlcServerClient };
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

// alpha: 4 stages (the first runs 2 elements in parallel) holding 5 generation
//   elements, 6 file generations (pointers)
// beta: no stages, 7 file generations (plain paths, as older entities have them)
// gamma: neither list
const CONTENT = new Map<string, PlainObject>([
  [
    'test::alpha::AlphaGenerations',
    {
      _type: 'generationSpecification',
      generationNodes: [
        {
          id: 'n1',
          generationElements: ['test::alpha::Model1', 'test::alpha::Model2'],
        },
        ...[3, 4, 5].map((i) => ({
          id: `n${i}`,
          generationElement: `test::alpha::Model${i}`,
        })),
      ],
      fileGenerations: range(6).map((i) => ({
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
      fileGenerations: range(7).map((i) => `test::beta::File${i}`),
    },
  ],
  ['test::gamma::GammaGenerations', { _type: 'generationSpecification' }],
]);

const spyGenerationSpecifications = (depotServerClient: DepotServerClient) => {
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
  return summarySpy;
};

const renderDashboard = async (
  applicationStore: ReturnType<typeof setup>['applicationStore'],
  address?: string,
): Promise<void> => {
  await act(async () => {
    render(
      <ApplicationStoreProvider store={applicationStore}>
        <TEST__BrowserEnvironmentProvider initialEntries={[address ?? '/']}>
          <ApplicationFrameworkProvider>
            {address ? (
              <Routes>
                <Route
                  path="/extensions/depot/:elementType"
                  element={<DepotDashboard />}
                />
              </Routes>
            ) : (
              <DepotDashboard />
            )}
          </ApplicationFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </ApplicationStoreProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const switchElementType = async (elementType: string): Promise<void> => {
  await act(async () => {
    fireEvent.keyDown(
      document.getElementById('depot-dashboard-element-type') as HTMLElement,
      { key: 'ArrowDown' },
    );
  });
  await act(async () => {
    fireEvent.click(await screen.findByText(elementType));
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
};

const switchToGenerationSpecifications = (): Promise<void> =>
  switchElementType('Generation Specification');

test('display generation specifications with their stages, generation elements and file generations', async () => {
  const { applicationStore, depotServerClient } = setup();
  const summarySpy = spyGenerationSpecifications(depotServerClient);
  await renderDashboard(applicationStore);
  await switchToGenerationSpecifications();

  expect(summarySpy).toHaveBeenCalledWith(
    CORE_PURE_PATH.GENERATION_SPECIFICATION,
    expect.anything(),
  );
  await screen.findByText('Generation Specifications: 3 / 3 fetched');
  await screen.findByText('AlphaGenerations');
  await screen.findByText('PROJECT-alpha');
  // stage, generation element and file generation counts
  await screen.findByText('4');
  await screen.findByText('5');
  await screen.findByText('6');
  await screen.findByText('7');
  expect(await screen.findAllByText('0')).toHaveLength(5);
  // and the paths behind them
  await screen.findByText(
    range(5)
      .map((i) => `test::alpha::Model${i}`)
      .join(', '),
  );
  await screen.findByText(
    range(7)
      .map((i) => `test::beta::File${i}`)
      .join(', '),
  );
});

test('open the element type named in the address', async () => {
  const { applicationStore, depotServerClient } = setup();
  const summarySpy = spyGenerationSpecifications(depotServerClient);
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );

  await screen.findByText('Generation Specifications: 3 / 3 fetched');
  await screen.findByText('AlphaGenerations');
  // data products are not fetched until they are shown
  expect(summarySpy).not.toHaveBeenCalledWith(
    CORE_PURE_PATH.DATA_PRODUCT,
    expect.anything(),
  );
});

test('open the scope named in the address and keep the address in step with it', async () => {
  const { applicationStore, depotServerClient } = setup();
  const summarySpy = spyGenerationSpecifications(depotServerClient);
  const copySpy = createSpy(
    applicationStore.clipboardService,
    'copyTextToClipboard',
  ).mockImplementation(async () => undefined);
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications?scope=snapshots',
  );

  // the summaries are all releases, so no master snapshot is left
  await screen.findByText('Generation Specifications: 0 / 0 fetched');
  expect(summarySpy).toHaveBeenCalledWith(
    CORE_PURE_PATH.GENERATION_SPECIFICATION,
    { summary: true, scope: DepotScope.SNAPSHOT },
  );
  expect(
    screen
      .getByRole('button', { name: 'Snapshots' })
      .classList.contains('scope-toggle-btn--active'),
  ).toBe(true);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Copy link/ }));
  });
  expect(copySpy).toHaveBeenLastCalledWith(
    expect.stringMatching(
      /\/extensions\/depot\/generation-specifications\?scope=snapshots$/,
    ),
  );

  const locationSpy = createSpy(
    applicationStore.navigationService.navigator,
    'updateCurrentLocation',
  ).mockImplementation(() => undefined);
  // back to releases: the address drops the scope
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Releases' }));
  });
  await screen.findByText('Generation Specifications: 3 / 3 fetched');
  expect(summarySpy).toHaveBeenLastCalledWith(
    CORE_PURE_PATH.GENERATION_SPECIFICATION,
    { summary: true, scope: DepotScope.RELEASES },
  );
  expect(locationSpy).toHaveBeenLastCalledWith(
    '/extensions/depot/generation-specifications',
  );
  // data products opened with the address's scope too
  await switchElementType('Data Product');
  expect(locationSpy).toHaveBeenLastCalledWith(
    '/extensions/depot/data-products?scope=snapshots',
  );
});

test('keep what each element type and scope fetched until refreshed', async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  const summarySpy = spyGenerationSpecifications(depotServerClient);
  const entitySpy = jest.mocked(depotServerClient.getVersionEntity);
  const roleSpy = createSpy(
    sdlcServerClient,
    'getAccessRole',
  ).mockResolvedValue({ accessRole: 'DEVELOPER' });
  createSpy(sdlcServerClient, 'getAutorizedActions').mockResolvedValue([]);
  const summaryCalls = (classifierPath: string): number =>
    summarySpy.mock.calls.filter(
      ([classifier]) => classifier === classifierPath,
    ).length;
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );
  await screen.findByText('Generation Specifications: 3 / 3 fetched');
  await waitFor(() => expect(roleSpy).toHaveBeenCalledTimes(3));

  // to snapshots and back
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Snapshots' }));
  });
  await screen.findByText('Generation Specifications: 0 / 0 fetched');
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Releases' }));
  });
  await screen.findByText('Generation Specifications: 3 / 3 fetched');
  // to data products and back
  await switchElementType('Data Product');
  await screen.findByText('Data Products: 0 / 0 fetched');
  await switchElementType('Generation Specification');
  await screen.findByText('Generation Specifications: 3 / 3 fetched');

  // releases and snapshots once each, the rows once
  expect(summaryCalls(CORE_PURE_PATH.GENERATION_SPECIFICATION)).toBe(2);
  expect(summaryCalls(CORE_PURE_PATH.DATA_PRODUCT)).toBe(1);
  expect(entitySpy).toHaveBeenCalledTimes(3);
  expect(roleSpy).toHaveBeenCalledTimes(3);

  // Refresh fetches the releases again, access included
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  });
  await waitFor(() =>
    expect(summaryCalls(CORE_PURE_PATH.GENERATION_SPECIFICATION)).toBe(3),
  );
  await screen.findByText('Generation Specifications: 3 / 3 fetched');
  await waitFor(() => expect(entitySpy).toHaveBeenCalledTimes(6));
  await waitFor(() => expect(roleSpy).toHaveBeenCalledTimes(6));
  expect(summaryCalls(CORE_PURE_PATH.DATA_PRODUCT)).toBe(1);
});

test('show and hide workspace snapshots without fetching again', async () => {
  const { applicationStore, depotServerClient } = setup();
  const summarySpy = spyGenerationSpecifications(
    depotServerClient,
  ).mockImplementation(async (classifier) =>
    classifier === CORE_PURE_PATH.GENERATION_SPECIFICATION
      ? [
          summary(
            'alpha',
            MASTER_SNAPSHOT_ALIAS,
            'test::alpha::AlphaGenerations',
          ),
          summary('alpha', 'feature-SNAPSHOT', 'test::alpha::AlphaGenerations'),
        ].map((s) => StoredSummaryEntity.serialization.toJson(s))
      : [],
  );
  const entitySpy = jest.mocked(depotServerClient.getVersionEntity);
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications?scope=snapshots',
  );
  await screen.findByText('Generation Specifications: 1 / 1 fetched');

  const checkbox = screen.getByRole('checkbox', {
    name: 'Include workspace snapshots',
  });
  await act(async () => {
    fireEvent.click(checkbox);
  });
  await screen.findByText('Generation Specifications: 2 / 2 fetched');
  await act(async () => {
    fireEvent.click(checkbox);
  });
  await screen.findByText('Generation Specifications: 1 / 1 fetched');

  expect(summarySpy).toHaveBeenCalledTimes(1);
  // the master snapshot once, the workspace snapshot once
  expect(entitySpy).toHaveBeenCalledTimes(2);
});

test("show the user's access to each project", async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  // alpha: a developer; beta: sees the project without being a member;
  // gamma: SDLC refuses
  const roleSpy = createSpy(
    sdlcServerClient,
    'getAccessRole',
  ).mockImplementation(async (projectId) => {
    if (projectId === 'PROJECT-gamma') {
      throw new Error('Forbidden');
    }
    return projectId === 'PROJECT-alpha'
      ? { accessRole: 'DEVELOPER' }
      : (undefined as unknown as PlainObject);
  });
  const actionsSpy = createSpy(
    sdlcServerClient,
    'getAutorizedActions',
  ).mockImplementation(async (projectId) => {
    if (projectId === 'PROJECT-gamma') {
      throw new Error('Forbidden');
    }
    return projectId === 'PROJECT-alpha'
      ? [
          AuthorizableProjectAction.CREATE_WORKSPACE,
          AuthorizableProjectAction.SUBMIT_REVIEW,
        ]
      : [];
  });
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );

  await screen.findByText('Developer');
  await screen.findByText('Create workspace, Submit review');
  await screen.findByText('Not a member');
  await screen.findByText('None');
  await screen.findByText('No access');
  expect(roleSpy).toHaveBeenCalledTimes(3);
  expect(actionsSpy).toHaveBeenCalledTimes(3);
});

test('open an element from its name, copy its path and copy a link to the view', async () => {
  const { applicationStore, depotServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  const copySpy = createSpy(
    applicationStore.clipboardService,
    'copyTextToClipboard',
  ).mockImplementation(async () => undefined);
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );

  const link = await screen.findByRole('link', { name: 'AlphaGenerations' });
  expect(link.getAttribute('href')).toContain(
    '/view/PROJECT-alpha/version/1.0.0/entity/test::alpha::AlphaGenerations',
  );
  expect(link.getAttribute('target')).toBe('_blank');

  await act(async () => {
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Copy test::alpha::AlphaGenerations',
      }),
    );
  });
  expect(copySpy).toHaveBeenLastCalledWith('test::alpha::AlphaGenerations');

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Copy link/ }));
  });
  expect(copySpy).toHaveBeenLastCalledWith(
    expect.stringMatching(/\/extensions\/depot\/generation-specifications$/),
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

const ALPHA_PATH = 'test::alpha::AlphaGenerations';

// A mock SDLC for flattening: alpha and beta can create workspaces and submit
// reviews, gamma can do neither. The workspace's configuration changes as it
// is updated, as on a real server.
const spyFlattenSdlc = (
  sdlcServerClient: SDLCServerClient,
  options?: {
    masterContent?: PlainObject;
    configuration?: PlainObject;
    failEntityChanges?: boolean;
  },
) => {
  createSpy(sdlcServerClient, 'getAccessRole').mockResolvedValue({
    accessRole: 'DEVELOPER',
  });
  createSpy(sdlcServerClient, 'getAutorizedActions').mockImplementation(
    async (projectId) =>
      projectId === 'PROJECT-gamma'
        ? [AuthorizableProjectAction.SUBMIT_REVIEW]
        : [
            AuthorizableProjectAction.CREATE_WORKSPACE,
            AuthorizableProjectAction.SUBMIT_REVIEW,
          ],
  );
  const getEntitySpy = createSpy(
    sdlcServerClient,
    'getEntity',
  ).mockImplementation(async (projectId, workspace, path) => ({
    path,
    classifierPath: CORE_PURE_PATH.GENERATION_SPECIFICATION,
    content: options?.masterContent ?? CONTENT.get(path),
  }));
  // the usual name is taken
  createSpy(sdlcServerClient, 'getGroupWorkspaces').mockResolvedValue([
    {
      projectId: 'PROJECT-alpha',
      workspaceId: DEPOT_DASHBOARD_FLATTEN_WORKSPACE_ID,
    },
  ]);
  const createWorkspaceSpy = createSpy(
    sdlcServerClient,
    'createWorkspace',
  ).mockImplementation(async (projectId, patch, workspaceId) => ({
    projectId,
    workspaceId,
  }));
  let configuration: PlainObject = options?.configuration ?? {
    projectId: 'PROJECT-alpha',
    groupId: 'test.group',
    artifactId: 'alpha',
    projectType: 'MANAGED',
    projectStructureVersion: { version: 11, extensionVersion: 1 },
    platformConfigurations: [{ name: 'legend-engine', version: '4.1.0' }],
    projectDependencies: [],
  };
  createSpy(sdlcServerClient, 'getConfiguration').mockImplementation(
    async () => configuration,
  );
  createSpy(
    sdlcServerClient,
    'getLatestProjectStructureVersion',
  ).mockResolvedValue({ version: 12, extensionVersion: 2 });
  const updateConfigurationSpy = createSpy(
    sdlcServerClient,
    'updateConfiguration',
  ).mockImplementation(async (projectId, workspace, command) => {
    configuration = {
      ...configuration,
      projectStructureVersion: command.projectStructureVersion,
      ...(command.platformConfigurations
        ? { platformConfigurations: undefined }
        : {}),
    };
    return {};
  });
  const entityChangesSpy = createSpy(
    sdlcServerClient,
    'performEntityChanges',
  ).mockImplementation(async () => {
    if (options?.failEntityChanges) {
      throw new Error('Entity changes refused');
    }
    return undefined;
  });
  let resolveReview: (() => void) | undefined;
  const createReviewSpy = createSpy(
    sdlcServerClient,
    'createReview',
  ).mockImplementation(
    (projectId, patch, command) =>
      new Promise((resolve) => {
        resolveReview = () =>
          resolve({
            id: '42',
            projectId,
            workspaceId: command.workspaceId,
            workspaceType: command.workspaceType,
            title: command.title,
            description: command.description,
            webURL: 'https://gitlab.example.com/alpha/-/merge_requests/42',
            state: 'open',
            author: { name: 'Test User', userId: 'test' },
            createdAt: '2026-11-10T00:00:00.000Z',
          });
      }),
  );
  return {
    getEntitySpy,
    createWorkspaceSpy,
    updateConfigurationSpy,
    entityChangesSpy,
    createReviewSpy,
    resolveReview: () => resolveReview?.(),
  };
};

const openFlatten = async (path: string): Promise<void> => {
  const button = await screen.findByTitle(
    `Flatten the stages of ${path} in a review`,
  );
  await act(async () => {
    fireEvent.click(button);
  });
};

const stepStatuses = (): (string | null)[] =>
  screen
    .getAllByTestId('depot-flatten-step')
    .map((step) => step.getAttribute('data-status'));

test('show Flatten to whoever can create a workspace, enabled with more than one stage', async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  spyFlattenSdlc(sdlcServerClient);
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );

  // alpha: 4 stages
  const alpha = await screen.findByTitle(
    `Flatten the stages of ${ALPHA_PATH} in a review`,
  );
  expect(alpha.hasAttribute('disabled')).toBe(false);
  // beta: no stages
  const [beta] = screen.getAllByTitle('One stage or none: nothing to flatten');
  expect(beta?.hasAttribute('disabled')).toBe(true);
  // gamma: cannot create a workspace
  expect(screen.getAllByRole('button', { name: 'Flatten' })).toHaveLength(2);
});

test('flatten a generation specification in a new workspace and open a review', async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  const spies = spyFlattenSdlc(sdlcServerClient);
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );
  await openFlatten(ALPHA_PATH);

  await screen.findByText(
    'Master matches 1.0.0. 4 stages, 5 generation elements.',
  );
  expect(spies.getEntitySpy).toHaveBeenCalledWith(
    'PROJECT-alpha',
    undefined,
    ALPHA_PATH,
  );
  expect(spies.createWorkspaceSpy).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  });
  await waitFor(() => expect(spies.createReviewSpy).toHaveBeenCalled());
  // the modal stays open until the review is created
  expect(
    screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled'),
  ).toBe(true);
  await act(async () => {
    spies.resolveReview();
  });

  const studioLink = await screen.findByRole('link', {
    name: /Open the review in Studio/,
  });
  expect(studioLink.getAttribute('href')).toContain('/review/PROJECT-alpha/42');
  expect(
    screen
      .getByRole('link', { name: /Open the merge request in GitLab/ })
      .getAttribute('href'),
  ).toBe('https://gitlab.example.com/alpha/-/merge_requests/42');
  expect(stepStatuses()).toEqual(Array(6).fill('DONE'));

  // a group workspace with a new name, since the usual one is taken
  const [projectId, patch, workspaceId, workspaceType] = spies
    .createWorkspaceSpy.mock.calls[0] as unknown[];
  expect([projectId, patch, workspaceType]).toEqual([
    'PROJECT-alpha',
    undefined,
    WorkspaceType.GROUP,
  ]);
  expect(workspaceId).toMatch(
    new RegExp(`^${DEPOT_DASHBOARD_FLATTEN_WORKSPACE_ID}-.+`),
  );
  // later calls go to that group workspace
  const workspace = spies.updateConfigurationSpy.mock.calls[0]?.[1];
  expect(workspace).toBeInstanceOf(Workspace);
  expect(workspace?.workspaceType).toBe(WorkspaceType.GROUP);

  // one commit for the structure, one for the overrides, one for the flatten
  const [structureCommand, overridesCommand] =
    spies.updateConfigurationSpy.mock.calls.map((call) => call[2]);
  expect(structureCommand?.projectStructureVersion).toEqual({
    version: 12,
    extensionVersion: 2,
  });
  expect(structureCommand).not.toHaveProperty('platformConfigurations');
  expect(overridesCommand?.projectStructureVersion).toEqual({
    version: 12,
    extensionVersion: 2,
  });
  // as Studio's "use latest versions": an update without a list, which SDLC
  // reads as no overrides
  expect(overridesCommand?.platformConfigurations).toEqual({});
  const entityChange = (
    spies.entityChangesSpy.mock.calls[0]?.[2] as {
      entityChanges: {
        type: string;
        entityPath: string;
        content: PlainObject;
      }[];
    }
  ).entityChanges[0];
  expect(entityChange?.type).toBe('MODIFY');
  expect(entityChange?.entityPath).toBe(ALPHA_PATH);
  expect(entityChange?.content.generationNodes).toEqual([
    {
      id: 'n1',
      generationElements: range(5).map((i) => `test::alpha::Model${i}`),
    },
  ]);

  // the review says what to check, and what else changed
  const reviewCommand = spies.createReviewSpy.mock.calls[0]?.[2];
  expect(reviewCommand?.workspaceType).toBe(WorkspaceType.GROUP);
  expect(reviewCommand?.description).toContain('[!WARNING]');
  expect(reviewCommand?.description).toContain(
    'Project structure updated from 11.1 to 12.2',
  );
  expect(reviewCommand?.description).toContain('legend-engine 4.1.0');
});

test('skip the configuration steps when there is nothing to change', async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  const spies = spyFlattenSdlc(sdlcServerClient, {
    configuration: {
      projectId: 'PROJECT-alpha',
      groupId: 'test.group',
      artifactId: 'alpha',
      projectType: 'MANAGED',
      projectStructureVersion: { version: 12, extensionVersion: 2 },
      projectDependencies: [],
    },
  });
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );
  await openFlatten(ALPHA_PATH);
  await screen.findByText(
    'Master matches 1.0.0. 4 stages, 5 generation elements.',
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  });
  await waitFor(() => expect(spies.createReviewSpy).toHaveBeenCalled());
  await act(async () => {
    spies.resolveReview();
  });
  await screen.findByRole('link', { name: /Open the review in Studio/ });

  expect(spies.updateConfigurationSpy).not.toHaveBeenCalled();
  expect(stepStatuses()).toEqual([
    'DONE',
    'DONE',
    'SKIPPED',
    'SKIPPED',
    'DONE',
    'DONE',
  ]);
  await screen.findByText('Already on the latest, 12.2');
  await screen.findByText('None to remove');
});

test('stop before creating anything when master has nothing to flatten', async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  const spies = spyFlattenSdlc(sdlcServerClient, {
    masterContent: {
      _type: 'generationSpecification',
      generationNodes: [
        {
          id: 'all',
          generationElements: range(5).map((i) => `test::alpha::Model${i}`),
        },
      ],
    },
  });
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );
  await openFlatten(ALPHA_PATH);

  await screen.findByText(
    "Master differs from 1.0.0; the flatten uses master's copy. Master has one stage: nothing to flatten.",
  );
  expect(
    screen.getByRole('button', { name: 'Start' }).hasAttribute('disabled'),
  ).toBe(true);
  expect(spies.createWorkspaceSpy).not.toHaveBeenCalled();
});

test('stop at a failed step and point to the workspace', async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  const spies = spyFlattenSdlc(sdlcServerClient, { failEntityChanges: true });
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );
  await openFlatten(ALPHA_PATH);
  await screen.findByText(
    'Master matches 1.0.0. 4 stages, 5 generation elements.',
  );
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  });

  await screen.findByText('Entity changes refused');
  expect(stepStatuses()).toEqual([
    'DONE',
    'DONE',
    'DONE',
    'DONE',
    'FAILED',
    'PENDING',
  ]);
  expect(spies.createReviewSpy).not.toHaveBeenCalled();
  const workspaceLink = screen.getByRole('link', {
    name: /Open the workspace in Studio/,
  });
  expect(workspaceLink.getAttribute('href')).toContain(
    `/edit/PROJECT-alpha/groupWorkspace/${DEPOT_DASHBOARD_FLATTEN_WORKSPACE_ID}-`,
  );
  expect(
    screen.getByRole('button', { name: 'Close' }).hasAttribute('disabled'),
  ).toBe(false);
});

const stagesSort = (): string | null | undefined =>
  Array.from(document.querySelectorAll('.ag-header-cell'))
    .find(
      (cell) =>
        cell.querySelector('.ag-header-cell-text')?.textContent?.trim() ===
        'Stages',
    )
    ?.getAttribute('aria-sort');

test('keep the sort when the flatten modal opens', async () => {
  const { applicationStore, depotServerClient, sdlcServerClient } = setup();
  spyGenerationSpecifications(depotServerClient);
  spyFlattenSdlc(sdlcServerClient);
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications',
  );
  await screen.findByTitle(`Flatten the stages of ${ALPHA_PATH} in a review`);

  // Stages, descending
  const stagesLabel = Array.from(document.querySelectorAll('.ag-header-cell'))
    .find(
      (cell) =>
        cell.querySelector('.ag-header-cell-text')?.textContent?.trim() ===
        'Stages',
    )
    ?.querySelector('.ag-header-cell-label') as HTMLElement;
  await act(async () => {
    fireEvent.click(stagesLabel);
  });
  await act(async () => {
    fireEvent.click(stagesLabel);
  });
  await waitFor(() => expect(stagesSort()).toBe('descending'));

  await openFlatten(ALPHA_PATH);
  await screen.findByText(
    'Master matches 1.0.0. 4 stages, 5 generation elements.',
  );
  expect(stagesSort()).toBe('descending');
});

test('open a snapshot at the head of its project', async () => {
  const { applicationStore, depotServerClient } = setup();
  spyGenerationSpecifications(depotServerClient).mockImplementation(
    async (classifier) =>
      classifier === CORE_PURE_PATH.GENERATION_SPECIFICATION
        ? [
            StoredSummaryEntity.serialization.toJson(
              summary('alpha', MASTER_SNAPSHOT_ALIAS, ALPHA_PATH),
            ),
          ]
        : [],
  );
  await renderDashboard(
    applicationStore,
    '/extensions/depot/generation-specifications?scope=snapshots',
  );

  // the element's name: the project's head, not a snapshot version
  const link = await screen.findByRole('link', { name: 'AlphaGenerations' });
  expect(link.getAttribute('href')).toMatch(
    new RegExp(`/view/PROJECT-alpha/entity/${ALPHA_PATH}$`),
  );
  // and the project id
  const visitSpy = createSpy(
    applicationStore.navigationService.navigator,
    'visitAddress',
  ).mockImplementation(() => undefined);
  await act(async () => {
    fireEvent.click(screen.getByText('PROJECT-alpha'));
  });
  expect(visitSpy).toHaveBeenCalledWith(
    expect.stringMatching(
      new RegExp(`/view/PROJECT-alpha/entity/${ALPHA_PATH}$`),
    ),
  );
});
