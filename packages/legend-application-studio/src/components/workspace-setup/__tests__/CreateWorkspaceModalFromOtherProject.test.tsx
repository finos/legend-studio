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
  type Project,
  type ProjectConfiguration,
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

// the new workspace goes into Editor uplift, and copies currency-codes, a
// workspace of Trade reference data
const TARGET_ID = 'PROD-1';
const SOURCE_ID = 'PROD-2';
const buildProject = (
  projectId: string,
  name: string,
): PlainObject<Project> => ({
  projectId,
  name,
  description: '',
  webUrl: '',
  tags: [],
});
const TARGET = buildProject(TARGET_ID, 'Editor uplift');
const SOURCE = buildProject(SOURCE_ID, 'Trade reference data');
const OTHER = buildProject('PROD-3', 'Trade lifecycle');
const UML: PlainObject<Workspace> = {
  projectId: TARGET_ID,
  workspaceId: 'uml',
  userId: 'testuser',
};
const CURRENCY_CODES: PlainObject<Workspace> = {
  projectId: SOURCE_ID,
  workspaceId: 'currency-codes',
  userId: null,
};
// a workspace in conflict resolution, which can't be copied
const STUCK: PlainObject<Workspace> = {
  projectId: SOURCE_ID,
  workspaceId: 'stuck',
  userId: 'testuser',
};

const CLASS = 'meta::pure::metamodel::type::Class';
const buildClass = (path: string, doc = 'v1'): Entity => {
  const index = path.lastIndexOf('::');
  return {
    path,
    classifierPath: CLASS,
    content: {
      _type: 'class',
      name: path.substring(index + 2),
      package: path.substring(0, index),
      doc,
    },
  };
};
// currency-codes has Currency, which Editor uplift has otherwise, Country,
// which it lacks, and Same, which it has as is; Editor uplift also has Model
const SOURCE_ENTITIES = [
  buildClass('refdata::Currency', 'source'),
  buildClass('refdata::Country'),
  buildClass('refdata::Same'),
];
const TARGET_ENTITIES = [
  buildClass('refdata::Currency'),
  buildClass('refdata::Same'),
  buildClass('uplift::Model'),
];
const COPY_ENTITY_CHANGES = [
  {
    type: EntityChangeType.MODIFY,
    entityPath: 'refdata::Currency',
    classifierPath: CLASS,
    content: buildClass('refdata::Currency', 'source').content,
  },
  {
    type: EntityChangeType.CREATE,
    entityPath: 'refdata::Country',
    classifierPath: CLASS,
    content: buildClass('refdata::Country').content,
  },
];

const buildConfiguration = (
  projectId: string,
  groupId: string,
  artifactId: string,
  projectDependencies: { projectId: string; versionId: string }[],
): PlainObject<ProjectConfiguration> => ({
  projectId,
  groupId,
  artifactId,
  projectStructureVersion: { version: 13, extensionVersion: 1 },
  projectDependencies,
});
// Trade reference data depends on fx-rates, which Editor uplift doesn't, and
// on shared, which Editor uplift depends on at another version
const SOURCE_CONFIGURATION = buildConfiguration(
  SOURCE_ID,
  'org.finos.legend.refdata',
  'trade-refdata',
  [
    { projectId: 'org.finos.legend:fx-rates', versionId: '1.4.0' },
    { projectId: 'org.finos.legend:shared', versionId: '2.0.0' },
  ],
);
const TARGET_CONFIGURATION = buildConfiguration(
  TARGET_ID,
  'org.finos.legend.uplift',
  'editor-uplift',
  [{ projectId: 'org.finos.legend:shared', versionId: '1.0.0' }],
);
const CONFIGURATION_UPDATE = {
  artifactId: 'editor-uplift',
  groupId: 'org.finos.legend.uplift',
  message:
    'added the project dependencies of workspace currency-codes of project Trade reference data',
  projectDependenciesToAdd: [
    { projectId: 'org.finos.legend:fx-rates', versionId: '1.4.0' },
  ],
  projectDependenciesToRemove: [],
};

const asEntities = (entities: Entity[]): PlainObject<Entity>[] =>
  entities as unknown as PlainObject<Entity>[];

const setUpSdlc = (baseStore: LegendStudioBaseStore) => {
  const client = baseStore.sdlcServerClient;
  const getProjects = createSpy(client, 'getProjects').mockResolvedValue([
    TARGET,
    SOURCE,
    OTHER,
  ]);
  createSpy(client, 'getProject').mockImplementation((projectId) =>
    Promise.resolve(projectId === SOURCE_ID ? SOURCE : TARGET),
  );
  createSpy(client, 'getPatches').mockResolvedValue([]);
  createSpy(client, 'projectConfigurationStatus').mockResolvedValue({
    projectId: TARGET_ID,
    projectConfigured: true,
    reviewIds: [],
  });
  createSpy(client, 'getWorkspacesInConflictResolutionMode').mockImplementation(
    (projectId) => Promise.resolve(projectId === SOURCE_ID ? [STUCK] : []),
  );
  const getWorkspaces = createSpy(client, 'getWorkspaces').mockImplementation(
    (projectId) =>
      Promise.resolve(
        projectId === SOURCE_ID ? [CURRENCY_CODES, STUCK] : [UML],
      ),
  );
  const getEntities = createSpy(client, 'getEntities').mockImplementation(
    (projectId) =>
      Promise.resolve(
        asEntities(projectId === SOURCE_ID ? SOURCE_ENTITIES : TARGET_ENTITIES),
      ),
  );
  const getEntitiesByRevision = createSpy(client, 'getEntitiesByRevision');
  const getConfiguration = createSpy(
    client,
    'getConfiguration',
  ).mockImplementation((projectId) =>
    Promise.resolve(
      projectId === SOURCE_ID ? SOURCE_CONFIGURATION : TARGET_CONFIGURATION,
    ),
  );
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
  const performEntityChanges = createSpy(
    client,
    'performEntityChanges',
  ).mockResolvedValue(undefined);
  const updateConfiguration = createSpy(
    client,
    'updateConfiguration',
  ).mockResolvedValue({});
  const deleteWorkspace = createSpy(
    client,
    'deleteWorkspace',
  ).mockResolvedValue({});
  return {
    getProjects,
    getWorkspaces,
    getEntities,
    getEntitiesByRevision,
    getConfiguration,
    createWorkspace,
    performEntityChanges,
    updateConfiguration,
    deleteWorkspace,
  };
};

const renderSetup = (baseStore: LegendStudioBaseStore): RenderResult =>
  render(
    <ApplicationStoreProvider store={baseStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateSetupRoute(TARGET_ID, undefined)]}
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
 * Opens the create workspace modal, names the new workspace, and picks
 * currency-codes of Trade reference data as the workspace to copy
 */
const pickWorkspaceOfOtherProject = async (
  renderResult: RenderResult,
): Promise<HTMLElement> => {
  const newWorkspaceButton = await renderResult.findByText(
    'Need to create a new workspace?',
  );
  await waitFor(() =>
    expect((newWorkspaceButton as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(newWorkspaceButton);
  const dialog = await renderResult.findByRole('dialog');
  fireEvent.change(within(dialog).getByPlaceholderText('MyWorkspace'), {
    target: { value: 'refdata-currencies' },
  });

  fireEvent.keyDown(
    within(dialog).getByRole('combobox', { name: 'Workspace Source' }),
    { key: 'ArrowDown' },
  );
  fireEvent.click(
    await renderResult.findByText('A workspace in another project…'),
  );

  const projectInput = await within(dialog).findByRole('combobox', {
    name: 'Project to copy from',
  });
  fireEvent.change(projectInput, { target: { value: 'Trade' } });
  fireEvent.click(await renderResult.findByText('Trade reference data'));

  // NOTE: the field is named once enabled, when the workspaces are listed
  fireEvent.keyDown(
    await within(dialog).findByRole('combobox', { name: 'Workspace to copy' }),
    { key: 'ArrowDown' },
  );
  fireEvent.click(await renderResult.findByText('currency-codes'));
  await within(dialog).findByText('2 elements to copy');
  return dialog;
};

beforeEach(() => {
  window.localStorage.clear();
});

test(
  integrationTest(
    'Searches for another project, leaving out this one, and lists its workspaces',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    const renderResult = renderSetup(baseStore);

    fireEvent.click(
      await renderResult.findByText('Need to create a new workspace?'),
    );
    const dialog = await renderResult.findByRole('dialog');
    fireEvent.keyDown(
      within(dialog).getByRole('combobox', { name: 'Workspace Source' }),
      { key: 'ArrowDown' },
    );
    fireEvent.click(
      await renderResult.findByText('A workspace in another project…'),
    );

    // nothing to copy yet
    expect(within(dialog).getByText('Create')).toHaveProperty('disabled', true);
    expect(within(dialog).getByText('Choose a project first')).not.toBeNull();

    fireEvent.change(
      within(dialog).getByRole('combobox', { name: 'Project to copy from' }),
      { target: { value: 'Trade' } },
    );

    await waitFor(() =>
      expect(sdlc.getProjects).toHaveBeenCalledWith(
        undefined,
        '"Trade"',
        undefined,
        ['sandbox'],
        30,
      ),
    );
    expect(
      await renderResult.findByText('Trade reference data'),
    ).not.toBeNull();
    expect(renderResult.getByText('Trade lifecycle')).not.toBeNull();
    // the project the new workspace goes into is not a source
    expect(renderResult.queryByText('PROD-1')).toBeNull();

    fireEvent.click(renderResult.getByText('Trade reference data'));
    // NOTE: the field is named once enabled, when the workspaces are listed
    fireEvent.keyDown(
      await within(dialog).findByRole('combobox', {
        name: 'Workspace to copy',
      }),
      { key: 'ArrowDown' },
    );

    expect(await renderResult.findByText('currency-codes')).not.toBeNull();
    // in conflict resolution
    expect(renderResult.queryByText('stuck')).toBeNull();
    expect(sdlc.getWorkspaces).toHaveBeenCalledWith(SOURCE_ID);
  },
);

test(
  integrationTest(
    "Copies all of the other project's workspace onto this project's HEAD, then adds the dependencies it lacks",
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    const logSucceeded = createSpy(
      LegendStudioTelemetryHelper,
      'logEvent_SetupActionSucceeded',
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await pickWorkspaceOfOtherProject(renderResult);

    expect(within(dialog).getByText('1 new')).not.toBeNull();
    expect(within(dialog).getByText('1 replaced')).not.toBeNull();
    expect(
      within(dialog).getByText(
        `They are added on top of Editor uplift's HEAD as one commit. refdata::Currency already exists in Editor uplift and is replaced. Nothing in Editor uplift is deleted. 1 other element of currency-codes is already in Editor uplift as it is.`,
      ),
    ).not.toBeNull();
    fireEvent.click(within(dialog).getByText('Show the 2 elements'));
    expect(
      within(within(dialog).getByRole('list', { name: 'Elements to copy' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Nrefdata::CountryClass', 'Mrefdata::CurrencyClass']);
    // the source is read whole, not what it changed since it was created
    expect(sdlc.getEntities).toHaveBeenCalledWith(
      SOURCE_ID,
      expect.objectContaining({ workspaceId: 'currency-codes' }),
    );
    expect(sdlc.getEntitiesByRevision).not.toHaveBeenCalled();

    // the dependencies
    expect(
      within(dialog).getByText(
        `Trade reference data depends on 1 project that Editor uplift doesn't. Dependencies are project configuration, not elements, so they are not copied, and the copied elements may not compile without them.`,
      ),
    ).not.toBeNull();
    expect(
      within(within(dialog).getByRole('list', { name: 'Missing dependencies' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['org.finos.legend:fx-rates 1.4.0']);
    expect(
      within(dialog).getByText(
        'Trade reference data and Editor uplift depend on 1 project at different versions. Editor uplift keeps its version, which the copied elements may not compile with.',
      ),
    ).not.toBeNull();
    expect(
      within(
        within(dialog).getByRole('list', {
          name: 'Dependencies at other versions',
        }),
      )
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'org.finos.legend:shared 2.0.0 in Trade reference data, 1.0.0 in Editor uplift',
    ]);
    expect(
      within(dialog)
        .getByRole('checkbox', {
          name: "Also add it to the new workspace's project dependencies",
        })
        .getAttribute('aria-checked'),
    ).toBe('true');

    fireEvent.click(within(dialog).getByText('Create'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    // the new workspace goes on this project's HEAD
    expect(sdlc.createWorkspace).toHaveBeenCalledWith(
      TARGET_ID,
      undefined,
      'refdata-currencies',
      WorkspaceType.GROUP,
    );
    expect(sdlc.performEntityChanges).toHaveBeenCalledTimes(1);
    expect(sdlc.performEntityChanges).toHaveBeenCalledWith(
      TARGET_ID,
      expect.objectContaining({
        projectId: TARGET_ID,
        workspaceId: 'refdata-currencies',
      }),
      {
        message:
          'copied the elements of workspace currency-codes of project Trade reference data [potentially affected 2 entities]',
        entityChanges: COPY_ENTITY_CHANGES,
      },
    );
    // nothing is deleted, though Editor uplift has an element the source lacks
    expect(
      sdlc.performEntityChanges.mock.calls[0]?.[2].entityChanges.map(
        (change) => change.type,
      ),
    ).not.toContain(EntityChangeType.DELETE);
    expect(sdlc.updateConfiguration).toHaveBeenCalledTimes(1);
    expect(sdlc.updateConfiguration.mock.calls[0]?.[0]).toBe(TARGET_ID);
    expect(sdlc.updateConfiguration.mock.calls[0]?.[1]).toMatchObject({
      workspaceId: 'refdata-currencies',
    });
    expect(sdlc.updateConfiguration.mock.calls[0]?.[2]).toStrictEqual(
      CONFIGURATION_UPDATE,
    );
    expect(logSucceeded).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'create-workspace',
        projectId: TARGET_ID,
        hasPatchReleaseVersion: false,
        copiesWorkspace: true,
        copiesFromOtherProject: true,
        copiedElementCount: 2,
        addedDependencyCount: 1,
      }),
    );
    // the new workspace is selected on the home page
    expect(await renderResult.findByText('refdata-currencies')).not.toBeNull();
  },
);

test(
  integrationTest(
    "Leaves the project's configuration alone when the dependencies aren't added",
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    const logSucceeded = createSpy(
      LegendStudioTelemetryHelper,
      'logEvent_SetupActionSucceeded',
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await pickWorkspaceOfOtherProject(renderResult);
    const checkbox = within(dialog).getByRole('checkbox', {
      name: "Also add it to the new workspace's project dependencies",
    });
    fireEvent.click(checkbox);
    expect(checkbox.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(within(dialog).getByText('Create'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.performEntityChanges).toHaveBeenCalledTimes(1);
    expect(sdlc.updateConfiguration).not.toHaveBeenCalled();
    expect(logSucceeded).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        copiesFromOtherProject: true,
        addedDependencyCount: 0,
      }),
    );
  },
);

test(
  integrationTest(
    'Keeps the copied elements when adding the dependencies fails, and Retry dependencies only adds them',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    sdlc.updateConfiguration.mockRejectedValueOnce(
      new Error('could not update the project configuration'),
    );
    const logFailure = createSpy(
      LegendStudioTelemetryHelper,
      'logEvent_SetupActionFailure',
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await pickWorkspaceOfOtherProject(renderResult);
    fireEvent.click(within(dialog).getByText('Create'));

    expect(
      await within(dialog).findByText(
        'refdata-currencies was created with the copied elements, but adding the 1 dependency failed.',
      ),
    ).not.toBeNull();
    expect(
      within(dialog).getByText('could not update the project configuration'),
    ).not.toBeNull();
    expect(
      within(within(dialog).getByRole('list', { name: 'Progress' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Created the workspace refdata-currencies',
      'Copied 2 elements from currency-codes of Trade reference data, as one commit',
      'Add 1 dependency to the project configuration, as a second commit',
    ]);
    expect(logFailure).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        copiesFromOtherProject: true,
        addedDependencyCount: 1,
        errorMessage: 'could not update the project configuration',
      }),
    );
    expect(within(dialog).queryByText('Retry copy')).toBeNull();

    fireEvent.click(within(dialog).getByText('Retry dependencies'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.createWorkspace).toHaveBeenCalledTimes(1);
    expect(sdlc.performEntityChanges).toHaveBeenCalledTimes(1);
    expect(sdlc.updateConfiguration).toHaveBeenCalledTimes(2);
    expect(sdlc.updateConfiguration.mock.calls[1]?.[2]).toStrictEqual(
      CONFIGURATION_UPDATE,
    );
    expect(sdlc.deleteWorkspace).not.toHaveBeenCalled();
  },
);

test(
  integrationTest(
    'Offers Retry copy when copying the elements of the other project fails',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    sdlc.performEntityChanges.mockRejectedValueOnce(
      new Error('could not perform entity changes'),
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await pickWorkspaceOfOtherProject(renderResult);
    fireEvent.click(within(dialog).getByText('Create'));

    expect(
      await within(dialog).findByText(
        'refdata-currencies was created, but copying the 2 elements failed.',
      ),
    ).not.toBeNull();
    expect(
      within(dialog).getByText(
        'The workspace exists and starts from the latest version of Editor uplift. Try the copy again, or delete the workspace.',
      ),
    ).not.toBeNull();
    expect(sdlc.updateConfiguration).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByText('Retry copy'));

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.performEntityChanges).toHaveBeenCalledTimes(2);
    expect(sdlc.updateConfiguration).toHaveBeenCalledTimes(1);
  },
);

test(
  integrationTest(
    'Shows the steps, and no failure, while the copy is still running',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    const sdlc = setUpSdlc(baseStore);
    let commitElements: (() => void) | undefined;
    sdlc.performEntityChanges.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          commitElements = () => resolve(undefined);
        }),
    );
    const renderResult = renderSetup(baseStore);

    const dialog = await pickWorkspaceOfOtherProject(renderResult);
    fireEvent.click(within(dialog).getByText('Create'));

    await waitFor(() => expect(commitElements).toBeDefined());
    expect(
      within(within(dialog).getByRole('list', { name: 'Progress' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Created the workspace refdata-currencies',
      'Copy 2 elements from currency-codes of Trade reference data, as one commit',
      'Add 1 dependency to the project configuration, as a second commit',
    ]);
    expect(within(dialog).queryByRole('alert')).toBeNull();

    commitElements?.();

    await waitFor(() => expect(renderResult.queryByRole('dialog')).toBeNull());
    expect(sdlc.updateConfiguration).toHaveBeenCalledTimes(1);
  },
);
