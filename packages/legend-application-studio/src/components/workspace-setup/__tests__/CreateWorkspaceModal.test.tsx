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

import { beforeEach, expect, jest, test } from '@jest/globals';
import {
  type RenderResult,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react';
import type { PlainObject } from '@finos/legend-shared';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import type { Entity } from '@finos/legend-storage';
import {
  type Patch,
  type Project,
  type Workspace,
  EntityChangeType,
  WorkspaceType,
} from '@finos/legend-server-sdlc';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { Route, Routes } from '@finos/legend-application/browser';
import { WorkspaceSetup } from '../WorkspaceSetup.js';
import { LegendStudioFrameworkProvider } from '../../LegendStudioFrameworkProvider.js';
import { TEST__provideMockedLegendStudioBaseStore } from '../../__test-utils__/LegendStudioFrameworkTestUtils.js';
import {
  generateSetupRoute,
  LEGEND_STUDIO_ROUTE_PATTERN,
} from '../../../__lib__/LegendStudioNavigation.js';
import { LegendStudioTelemetryHelper } from '../../../__lib__/LegendStudioTelemetryHelper.js';
import type { LegendStudioBaseStore } from '../../../stores/LegendStudioBaseStore.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const PROJECT_ID = 'UAT-2689';
const PROJECT: PlainObject<Project> = {
  projectId: PROJECT_ID,
  name: 'TEST_SDLC',
  description: '',
  webUrl: '',
  tags: [],
};
const PATCH: PlainObject<Patch> = {
  projectId: PROJECT_ID,
  patchReleaseVersionId: { majorVersion: 1, minorVersion: 0, patchVersion: 1 },
};
// a user workspace on HEAD, and a group workspace on patch 1.0.1
const UML: PlainObject<Workspace> = {
  projectId: PROJECT_ID,
  workspaceId: 'uml',
  userId: 'testuser',
};
const RATING_FIX: PlainObject<Workspace> = {
  projectId: PROJECT_ID,
  workspaceId: 'rating-fix',
  userId: null,
};

const CLASS = 'meta::pure::metamodel::type::Class';
const PROFILE = 'meta::pure::metamodel::extension::Profile';
const buildEntity = (
  path: string,
  classifierPath: string,
  doc = 'v1',
): Entity => {
  const index = path.lastIndexOf('::');
  return {
    path,
    classifierPath,
    content: {
      _type: classifierPath === CLASS ? 'class' : 'profile',
      name: path.substring(index + 2),
      package: path.substring(0, index),
      doc,
    },
  };
};

// uml created Schedule, modified Person and deleted Empty, while the project
// changed Person too
const UML_BASE = [
  buildEntity('model::Person', CLASS),
  buildEntity('model::Firm', CLASS),
  buildEntity('model::Empty', PROFILE),
];
const UML_NOW = [
  buildEntity('model::Person', CLASS, 'v2'),
  buildEntity('model::Firm', CLASS),
  buildEntity('model::Schedule', CLASS),
];
const PROJECT_LATEST = [
  buildEntity('model::Person', CLASS, 'project'),
  buildEntity('model::Firm', CLASS),
  buildEntity('model::Empty', PROFILE),
];
const UML_COPY_CHANGES = [
  {
    type: EntityChangeType.CREATE,
    entityPath: 'model::Schedule',
    classifierPath: CLASS,
    content: buildEntity('model::Schedule', CLASS).content,
  },
  {
    type: EntityChangeType.MODIFY,
    entityPath: 'model::Person',
    classifierPath: CLASS,
    content: buildEntity('model::Person', CLASS, 'v2').content,
  },
  { type: EntityChangeType.DELETE, entityPath: 'model::Empty' },
];

// rating-fix modified Firm on patch 1.0.1
const RATING_FIX_BASE = [buildEntity('model::Firm', CLASS)];
const RATING_FIX_NOW = [buildEntity('model::Firm', CLASS, 'fixed')];

const asEntities = (entities: Entity[]): PlainObject<Entity>[] =>
  entities as unknown as PlainObject<Entity>[];

const setUpSdlc = (
  baseStore: LegendStudioBaseStore,
  options?: { outdated?: boolean },
) => {
  const client = baseStore.sdlcServerClient;
  createSpy(client, 'getProjects').mockResolvedValue([]);
  createSpy(client, 'getProject').mockResolvedValue(PROJECT);
  createSpy(client, 'getPatches').mockResolvedValue([PATCH]);
  createSpy(client, 'projectConfigurationStatus').mockResolvedValue({
    projectId: PROJECT_ID,
    projectConfigured: true,
    reviewIds: [],
  });
  createSpy(client, 'getWorkspacesInConflictResolutionMode').mockResolvedValue(
    [],
  );
  createSpy(client, 'getWorkspaces').mockImplementation(
    (projectId, patchReleaseVersionId) =>
      Promise.resolve(patchReleaseVersionId === '1.0.1' ? [RATING_FIX] : [UML]),
  );
  const getEntitiesByRevision = createSpy(
    client,
    'getEntitiesByRevision',
  ).mockImplementation((projectId, workspace) =>
    Promise.resolve(
      asEntities(
        workspace?.workspaceId === 'rating-fix' ? RATING_FIX_BASE : UML_BASE,
      ),
    ),
  );
  const getEntities = createSpy(client, 'getEntities').mockImplementation(
    (projectId, workspace) =>
      Promise.resolve(
        asEntities(
          workspace?.workspaceId === 'uml'
            ? UML_NOW
            : workspace?.workspaceId === 'rating-fix'
              ? RATING_FIX_NOW
              : workspace?.source === '1.0.1'
                ? RATING_FIX_BASE
                : // the project's HEAD, or a new workspace on it
                  PROJECT_LATEST,
        ),
      ),
  );
  const isWorkspaceOutdated = createSpy(
    client,
    'isWorkspaceOutdated',
  ).mockResolvedValue(options?.outdated ?? true);
  const createWorkspace = createSpy(
    client,
    'createWorkspace',
  ).mockImplementation(
    (projectId, patchReleaseVersionId, workspaceId, workspaceType) =>
      Promise.resolve({
        projectId,
        workspaceId,
        userId: workspaceType === WorkspaceType.USER ? 'testuser' : null,
      }),
  );
  const performEntityChanges = createSpy(client, 'performEntityChanges');
  const deleteWorkspace = createSpy(
    client,
    'deleteWorkspace',
  ).mockResolvedValue({});
  return {
    getEntitiesByRevision,
    getEntities,
    isWorkspaceOutdated,
    createWorkspace,
    performEntityChanges,
    deleteWorkspace,
  };
};

const renderSetup = (baseStore: LegendStudioBaseStore): RenderResult =>
  render(
    <ApplicationStoreProvider store={baseStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateSetupRoute(PROJECT_ID, undefined)]}
      >
        <LegendStudioFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_STUDIO_ROUTE_PATTERN.SETUP_WORKSPACE}
              element={<WorkspaceSetup />}
            />
          </Routes>
        </LegendStudioFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );

/**
 * Opens the create workspace modal, picks `sourceName` as its source and
 * names the new workspace `workspaceName`
 */
const fillCreateWorkspaceModal = async (
  renderResult: RenderResult,
  sourceName: string,
  workspaceName: string,
): Promise<HTMLElement> => {
  const newWorkspaceButton = await renderResult.findByText(
    'Need to create a new workspace?',
  );
  await waitFor(() =>
    expect((newWorkspaceButton as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(newWorkspaceButton);
  const dialog = await renderResult.findByRole('dialog');
  fireEvent.keyDown(within(dialog).getByRole('combobox'), {
    key: 'ArrowDown',
  });
  fireEvent.click(await renderResult.findByText(sourceName));
  fireEvent.change(within(dialog).getByPlaceholderText('MyWorkspace'), {
    target: { value: workspaceName },
  });
  return dialog;
};

beforeEach(() => {
  window.localStorage.clear();
});

test(
  integrationTest(
    'Workspace Source lists the start points of the project, then its workspaces',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    setUpSdlc(baseStore);
    const renderResult = renderSetup(baseStore);

    fireEvent.click(
      await renderResult.findByText('Need to create a new workspace?'),
    );
    const dialog = await renderResult.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByText('HEAD')).not.toBeNull(),
    );
    fireEvent.keyDown(within(dialog).getByRole('combobox'), {
      key: 'ArrowDown',
    });

    expect(
      await renderResult.findByText('Start from the project'),
    ).not.toBeNull();
    expect(
      renderResult.getByText('the latest version, with no changes yet'),
    ).not.toBeNull();
    expect(
      renderResult.getByText('the latest version of the 1.0.1 patch'),
    ).not.toBeNull();
    expect(
      renderResult.getByText('Copy a workspace in TEST_SDLC'),
    ).not.toBeNull();
    expect(renderResult.getByText('uml')).not.toBeNull();
    expect(renderResult.getByText('rating-fix')).not.toBeNull();
    // the patch itself, and the tag of its workspace
    expect(renderResult.getAllByText('patch/1.0.1')).toHaveLength(2);
  },
);

test(
  integrationTest(
    'Copies what a workspace changed into a new workspace on its line, as one commit',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    sdlc.performEntityChanges.mockResolvedValue(undefined);
    const logSucceeded = createSpy(
      LegendStudioTelemetryHelper,
      'logEvent_SetupActionSucceeded',
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await fillCreateWorkspaceModal(
      renderResult,
      'uml',
      'uml-copy',
    );

    expect(await within(dialog).findByText('3 changes to copy')).not.toBeNull();
    expect(within(dialog).getByText('1 new')).not.toBeNull();
    expect(within(dialog).getByText('1 modified')).not.toBeNull();
    expect(within(dialog).getByText('1 deleted')).not.toBeNull();
    expect(
      within(dialog).getByText(
        `uml is behind TEST_SDLC. model::Person also changed in the project after uml was created; the copy keeps uml's version.`,
      ),
    ).not.toBeNull();
    expect(
      within(dialog).getByText('also changed in TEST_SDLC'),
    ).not.toBeNull();
    expect(
      within(within(dialog).getByRole('list', { name: 'Elements to copy' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Nmodel::ScheduleClass',
      'Mmodel::Personalso changed in TEST_SDLCClass',
      'Dmodel::EmptyProfile',
    ]);
    // the source and its BASE revision are read from the source's own line
    expect(sdlc.getEntitiesByRevision).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ workspaceId: 'uml', source: undefined }),
      'BASE',
    );

    fireEvent.click(within(dialog).getByText('Create'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.createWorkspace).toHaveBeenCalledWith(
      PROJECT_ID,
      undefined,
      'uml-copy',
      WorkspaceType.GROUP,
    );
    expect(sdlc.performEntityChanges).toHaveBeenCalledTimes(1);
    expect(sdlc.performEntityChanges).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ workspaceId: 'uml-copy', source: undefined }),
      {
        message:
          'copied the changes of workspace uml [potentially affected 3 entities]',
        entityChanges: UML_COPY_CHANGES,
      },
    );
    expect(logSucceeded).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'create-workspace',
        copiesWorkspace: true,
        copiedElementCount: 3,
      }),
    );
    // the new workspace is selected on the home page
    expect(await renderResult.findByText('uml-copy')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Keeps the workspace when the copy fails, and Retry copy commits only the copy',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    sdlc.performEntityChanges
      .mockRejectedValueOnce(new Error('could not perform entity changes'))
      .mockResolvedValueOnce(undefined);
    const renderResult = renderSetup(baseStore);

    const dialog = await fillCreateWorkspaceModal(
      renderResult,
      'uml',
      'uml-copy',
    );
    await within(dialog).findByText('3 changes to copy');
    fireEvent.click(within(dialog).getByText('Create'));

    expect(
      await within(dialog).findByText(
        'uml-copy was created, but copying the 3 changes failed.',
      ),
    ).not.toBeNull();
    expect(
      within(dialog).getByText('could not perform entity changes'),
    ).not.toBeNull();
    expect(
      within(dialog).getByText('Created the workspace uml-copy'),
    ).not.toBeNull();
    // the workspace just created is not taken for one that already exists
    expect(
      within(dialog).queryByText('Workspace with same name already exists'),
    ).toBeNull();
    expect(within(dialog).queryByText('Create')).toBeNull();

    fireEvent.click(within(dialog).getByText('Retry copy'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.createWorkspace).toHaveBeenCalledTimes(1);
    expect(sdlc.performEntityChanges).toHaveBeenCalledTimes(2);
    expect(sdlc.performEntityChanges).toHaveBeenLastCalledWith(
      PROJECT_ID,
      expect.objectContaining({ workspaceId: 'uml-copy' }),
      {
        message:
          'copied the changes of workspace uml [potentially affected 3 entities]',
        entityChanges: UML_COPY_CHANGES,
      },
    );
    expect(sdlc.deleteWorkspace).not.toHaveBeenCalled();
  },
);

test(
  integrationTest(
    'Delete workspace removes the workspace whose copy failed, and goes back to the form',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    sdlc.performEntityChanges.mockRejectedValue(
      new Error('could not perform entity changes'),
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await fillCreateWorkspaceModal(
      renderResult,
      'uml',
      'uml-copy',
    );
    await within(dialog).findByText('3 changes to copy');
    fireEvent.click(within(dialog).getByText('Create'));
    await within(dialog).findByText(
      'uml-copy was created, but copying the 3 changes failed.',
    );

    fireEvent.click(within(dialog).getByText('Delete workspace'));

    await waitFor(() => expect(within(dialog).queryByRole('alert')).toBeNull());
    expect(sdlc.deleteWorkspace).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ workspaceId: 'uml-copy' }),
    );
    expect(within(dialog).getByText('3 changes to copy')).not.toBeNull();
    expect(within(dialog).getByText('Create')).not.toBeNull();
    expect(
      within(dialog).queryByText('Workspace with same name already exists'),
    ).toBeNull();
  },
);

test(
  integrationTest(
    'Copies a workspace on a patch onto that patch, without reading the project HEAD',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    sdlc.performEntityChanges.mockResolvedValue(undefined);
    const renderResult = renderSetup(baseStore);

    const dialog = await fillCreateWorkspaceModal(
      renderResult,
      'rating-fix',
      'rating-copy',
    );

    expect(await within(dialog).findByText('1 change to copy')).not.toBeNull();
    expect(
      within(dialog).getByText(
        `rating-fix is behind patch/1.0.1. If an element it changed also changed there since, the copy keeps rating-fix's version.`,
      ),
    ).not.toBeNull();
    expect(sdlc.isWorkspaceOutdated).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ workspaceId: 'rating-fix', source: '1.0.1' }),
    );

    fireEvent.click(within(dialog).getByText('Create'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.createWorkspace).toHaveBeenCalledWith(
      PROJECT_ID,
      '1.0.1',
      'rating-copy',
      WorkspaceType.GROUP,
    );
    // the new workspace is read and committed to through the patch
    expect(sdlc.getEntities).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ workspaceId: 'rating-copy', source: '1.0.1' }),
    );
    expect(sdlc.performEntityChanges).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({ workspaceId: 'rating-copy', source: '1.0.1' }),
      {
        message:
          'copied the changes of workspace rating-fix [potentially affected 1 entity]',
        entityChanges: [
          {
            type: EntityChangeType.MODIFY,
            entityPath: 'model::Firm',
            classifierPath: CLASS,
            content: buildEntity('model::Firm', CLASS, 'fixed').content,
          },
        ],
      },
    );
    // a patch's latest entities can't be read, so no "also changed" marks
    expect(sdlc.getEntities).not.toHaveBeenCalledWith(PROJECT_ID, undefined);
  },
);

test(
  integrationTest(
    'Creates a copy of a workspace without changes with no commit',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore, { outdated: false });
    sdlc.getEntities.mockImplementation(() =>
      Promise.resolve(asEntities(UML_BASE)),
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await fillCreateWorkspaceModal(
      renderResult,
      'uml',
      'uml-copy',
    );

    expect(
      await within(dialog).findByText('No changes to copy'),
    ).not.toBeNull();
    fireEvent.click(within(dialog).getByText('Create'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.createWorkspace).toHaveBeenCalledTimes(1);
    expect(sdlc.performEntityChanges).not.toHaveBeenCalled();
  },
);
