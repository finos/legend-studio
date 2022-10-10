/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { jest, expect } from '@jest/globals';
import {
  type RenderResult,
  render,
  fireEvent,
  waitFor,
  getByText,
} from '@testing-library/react';
import { LEGEND_STUDIO_TEST_ID } from './LegendStudioTestID.js';
import { EditorStore } from '../stores/EditorStore.js';
import { Editor } from './editor/Editor.js';
import { generateEditorRoute } from '../stores/LegendStudioRouter.js';
import type { PlainObject, TEMPORARY__JestMock } from '@finos/legend-shared';
import { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import type { Entity } from '@finos/legend-storage';
import {
  type Project,
  type ProjectConfiguration,
  type ProjectStructureVersion,
  type Revision,
  type SDLCServerClient,
  type Version,
  type Workspace,
  WorkspaceType,
  TEST__SDLCServerClientProvider,
  TEST__getTestSDLCServerClient,
  SDLCServerFeaturesConfiguration,
} from '@finos/legend-server-sdlc';
import {
  type GenerationConfigurationDescription,
  type GenerationMode,
  type GraphManagerState,
  TEST__GraphManagerStateProvider,
  TEST__getTestGraphManagerState,
  ELEMENT_PATH_DELIMITER,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  type ProjectData,
  type ProjectVersionEntities,
  TEST__DepotServerClientProvider,
  TEST__getTestDepotServerClient,
  type ProjectDependencyInfo,
} from '@finos/legend-server-depot';
import { LegendStudioBaseStoreProvider } from './LegendStudioBaseStoreProvider.js';
import {
  TEST__provideMockedWebApplicationNavigator,
  TEST__ApplicationStoreProvider,
  TEST__getTestApplicationStore,
  LegendApplicationComponentFrameworkProvider,
  WebApplicationNavigator,
  Router,
  createMemoryHistory,
} from '@finos/legend-application';
import { TEST__getLegendStudioApplicationConfig } from '../stores/EditorStoreTestUtils.js';
import type { LegendStudioApplicationStore } from '../stores/LegendStudioBaseStore.js';

export const TEST_DATA__DefaultSDLCInfo = {
  project: {
    projectId: 'UAT-2689',
    description: 'sdlcTesting',
    tags: [],
    name: 'TEST_SDLC',
  },
  workspace: {
    projectId: 'UAT-2689',
    userId: 'testuser',
    workspaceId: 'UsedForEntitiesTest',
  },
  currentRevision: {
    authoredAt: 1572981425,
    committedAt: 1572981425,
    committerName: 'testuser',
    authorName: 'testuser',
    message: 'syncing with workspace from ... [potentially affected 1 entity]',
    id: '70549de5bb154b022c0f3e1fb58dfd2d18c8026e',
  },
  projectConfig: {
    projectStructureVersion: { version: 6, extensionVersion: 1 },
    projectId: 'UAT-2689',
    groupId: 'com.test',
    artifactId: 'string',
    projectDependencies: [],
    metamodelDependencies: [],
  },
  latestProjectStructureVersion: {
    version: 6,
    extensionVersion: 3,
  },
  availableSchemaImports: [],
  availableCodeImports: [],
  availableSchemaGenerations: [
    {
      label: 'Avro',
      properties: [],
      key: 'avro',
      generationMode: 'schemaGeneration' as GenerationMode,
    },
    { label: 'Protobuf', properties: [], key: 'protobuf' },
  ] as GenerationConfigurationDescription[],
  availableCodeGenerations: [
    {
      label: 'Java',
      properties: [],
      key: 'java',
      generationMode: 'codeGeneration' as GenerationMode,
    },
  ],
};

export const TEST_DATA__DefaultDepotInfo = {
  dependencyInfo: {
    tree: [],
    conflicts: [],
  },
};

export const TEST__LegendStudioBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <LegendStudioBaseStoreProvider>{children}</LegendStudioBaseStoreProvider>
);

export const TEST__provideMockedEditorStore = (customization?: {
  mock?: EditorStore;
  applicationStore?: LegendStudioApplicationStore;
  sdlcServerClient?: SDLCServerClient;
  depotServerClient?: DepotServerClient;
  graphManagerState?: GraphManagerState;
  pluginManager?: LegendStudioPluginManager;
}): EditorStore => {
  const pluginManager =
    customization?.pluginManager ?? LegendStudioPluginManager.create();
  const value =
    customization?.mock ??
    new EditorStore(
      customization?.applicationStore ??
        TEST__getTestApplicationStore(
          TEST__getLegendStudioApplicationConfig(),
          pluginManager,
        ),
      customization?.sdlcServerClient ?? TEST__getTestSDLCServerClient(),
      customization?.depotServerClient ?? TEST__getTestDepotServerClient(),
      customization?.graphManagerState ??
        TEST__getTestGraphManagerState(customization?.pluginManager),
    );
  const MockedEditorStoreProvider = require('./editor/EditorStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedEditorStoreProvider.useEditorStore = jest.fn();
  MockedEditorStoreProvider.useEditorStore.mockReturnValue(value);
  return value;
};

export const TEST__openAndAssertPathWithElement = async (
  path: string,
  renderResult: RenderResult,
  closePackage = true,
): Promise<void> => {
  const packageExplorer = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  const packages = path.split(ELEMENT_PATH_DELIMITER);
  const rootPackage = packages.shift() as string;
  fireEvent.click(getByText(packageExplorer, rootPackage));
  const elementName = packages.pop() as string;
  for (const _package of packages) {
    await waitFor(() => getByText(packageExplorer, _package));
    fireEvent.click(getByText(packageExplorer, _package));
  }
  await waitFor(() => getByText(packageExplorer, elementName));
  // close package tree
  if (closePackage) {
    fireEvent.click(getByText(packageExplorer, rootPackage));
  }
};

export const TEST__openElementFromExplorerTree = async (
  path: string,
  renderResult: RenderResult,
): Promise<void> => {
  const packageExplorer = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  await TEST__openAndAssertPathWithElement(path, renderResult, false);
  const elementName = path.split(ELEMENT_PATH_DELIMITER).pop() as string;
  fireEvent.click(getByText(packageExplorer, elementName));
};

/**
 * Setup the editor for testing, takes in a mocked editor store and data for initialization.
 * This methods helps mock certain feature initialization of the editor as well as to ensure to return
 * when the editor is ready.
 *
 * NOTE: this only provides basic initialization for the editor so that it starts up properly, for other test
 * cases, such as for the SDLC flow, we might want to customize this method or have a completely different
 * setup method
 */
export const TEST__setUpEditor = async (
  MOCK__editorStore: EditorStore,
  data: {
    project: PlainObject<Project>;
    workspace: PlainObject<Workspace>;
    curentRevision: PlainObject<Revision>;
    entities: PlainObject<Entity>[];
    projectVersions: PlainObject<Version>[];
    projectConfiguration: PlainObject<ProjectConfiguration>;
    latestProjectStructureVersion: PlainObject<ProjectStructureVersion>;
    availableGenerationDescriptions: GenerationConfigurationDescription[];
    projects: PlainObject<ProjectData>[];
    projectData: PlainObject<ProjectData>[];
    projectDependency: PlainObject<ProjectVersionEntities>[];
    projectDependencyInfo: PlainObject<ProjectDependencyInfo>;
  },
): Promise<RenderResult> => {
  const {
    project,
    workspace,
    curentRevision,
    projectVersions,
    projectConfiguration,
    entities,
    latestProjectStructureVersion,
    availableGenerationDescriptions,
    projectData,
    projects,
    projectDependency,
    projectDependencyInfo,
  } = data;

  // SDLC
  jest
    .spyOn(MOCK__editorStore.sdlcServerClient, 'getProject')
    .mockReturnValue(Promise.resolve(project));
  jest
    .spyOn(MOCK__editorStore.sdlcServerClient, 'getWorkspace')
    .mockReturnValue(Promise.resolve(workspace));
  jest
    .spyOn(MOCK__editorStore.sdlcServerClient, 'getVersions')
    .mockReturnValue(Promise.resolve(projectVersions));
  jest
    .spyOn(MOCK__editorStore.sdlcServerClient, 'getRevision')
    .mockReturnValue(Promise.resolve(curentRevision));
  jest
    .spyOn(
      MOCK__editorStore.sdlcServerClient,
      'checkIfWorkspaceIsInConflictResolutionMode',
    )
    .mockReturnValue(Promise.resolve(false));
  jest
    .spyOn(MOCK__editorStore.sdlcServerClient, 'isWorkspaceOutdated')
    .mockReturnValue(Promise.resolve(false));
  jest
    .spyOn(MOCK__editorStore.sdlcServerClient, 'getEntities')
    .mockReturnValue(Promise.resolve(entities));
  jest
    .spyOn(MOCK__editorStore.sdlcServerClient, 'getConfiguration')
    .mockReturnValue(Promise.resolve(projectConfiguration));
  jest
    .spyOn(
      MOCK__editorStore.sdlcServerClient,
      'getLatestProjectStructureVersion',
    )
    .mockReturnValue(Promise.resolve(latestProjectStructureVersion));
  MOCK__editorStore.sdlcServerClient._setFeatures(
    SDLCServerFeaturesConfiguration.serialization.fromJson({
      canCreateProject: true,
      canCreateVersion: true,
    }),
  );

  // depot
  jest
    .spyOn(MOCK__editorStore.depotServerClient, 'getProjects')
    .mockReturnValue(Promise.resolve(projects));
  jest
    .spyOn(MOCK__editorStore.depotServerClient, 'getProjectById')
    .mockReturnValue(Promise.resolve(projectData));
  jest
    .spyOn(MOCK__editorStore.depotServerClient, 'collectDependencyEntities')
    .mockReturnValue(Promise.resolve(projectDependency));
  jest
    .spyOn(MOCK__editorStore.depotServerClient, 'analyzeDependencyTree')
    .mockReturnValue(Promise.resolve(projectDependencyInfo));

  // TODO: we need to think of how we will mock these calls when we modularize
  const graphManagerState = MOCK__editorStore.graphManagerState;
  graphManagerState.graphManager.initialize = jest.fn<TEMPORARY__JestMock>();
  jest
    .spyOn(
      graphManagerState.graphManager,
      'getAvailableGenerationConfigurationDescriptions',
    )
    .mockReturnValue(Promise.resolve(availableGenerationDescriptions));

  // mock change detections (since we do not test them now)
  MOCK__editorStore.changeDetectionState.workspaceLocalLatestRevisionState.buildEntityHashesIndex =
    jest.fn<TEMPORARY__JestMock>();
  MOCK__editorStore.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex =
    jest.fn<TEMPORARY__JestMock>();
  MOCK__editorStore.sdlcState.buildProjectLatestRevisionEntityHashesIndex =
    jest.fn<TEMPORARY__JestMock>();
  MOCK__editorStore.workspaceReviewState.fetchCurrentWorkspaceReview =
    jest.fn<TEMPORARY__JestMock>();
  MOCK__editorStore.workspaceUpdaterState.fetchLatestCommittedReviews =
    jest.fn<TEMPORARY__JestMock>();

  const history = createMemoryHistory({
    initialEntries: [
      generateEditorRoute(
        (workspace as unknown as Workspace).projectId,
        (workspace as unknown as Workspace).workspaceId,
        WorkspaceType.USER,
      ),
    ],
  });
  const navigator = new WebApplicationNavigator(history);
  MOCK__editorStore.applicationStore.navigator = navigator;
  TEST__provideMockedWebApplicationNavigator({ mock: navigator });

  const renderResult = render(
    <Router history={history}>
      <TEST__ApplicationStoreProvider
        config={TEST__getLegendStudioApplicationConfig()}
        pluginManager={LegendStudioPluginManager.create()}
      >
        <TEST__SDLCServerClientProvider>
          <TEST__DepotServerClientProvider>
            <TEST__GraphManagerStateProvider>
              <TEST__LegendStudioBaseStoreProvider>
                <LegendApplicationComponentFrameworkProvider>
                  <Editor />
                </LegendApplicationComponentFrameworkProvider>
              </TEST__LegendStudioBaseStoreProvider>
            </TEST__GraphManagerStateProvider>
          </TEST__DepotServerClientProvider>
        </TEST__SDLCServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </Router>,
  );
  // assert project/workspace have been set
  await waitFor(() =>
    expect(MOCK__editorStore.sdlcState.currentProject).toBeDefined(),
  );
  await waitFor(() =>
    expect(MOCK__editorStore.sdlcState.currentWorkspace).toBeDefined(),
  );
  // assert immutable models have been model
  await waitFor(() =>
    expect(graphManagerState.systemBuildState.hasSucceeded).toBe(true),
  );
  await waitFor(() =>
    expect(graphManagerState.dependenciesBuildState.hasSucceeded).toBe(true),
  );
  // assert main model has been build
  await waitFor(() =>
    expect(graphManagerState.graphBuildState.hasSucceeded).toBe(true),
  );
  // assert explorer trees have been built and rendered
  await waitFor(() =>
    expect(MOCK__editorStore.explorerTreeState.buildState.hasCompleted).toBe(
      true,
    ),
  );
  await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EXPLORER_TREES),
  );
  return renderResult;
};

export const TEST__setUpEditorWithDefaultSDLCData = (
  MOCK__editorStore: EditorStore,
  overrides?: {
    project?: PlainObject<Project>;
    workspace?: PlainObject<Workspace>;
    curentRevision?: PlainObject<Revision>;
    entities?: PlainObject<Entity>[];
    projectVersions?: PlainObject<Version>[];
    projectConfiguration?: PlainObject<ProjectConfiguration>;
    latestProjectStructureVersion?: PlainObject<ProjectStructureVersion>;
    availableGenerationDescriptions?: GenerationConfigurationDescription[];
    projects?: PlainObject<ProjectData>[];
    projectData?: PlainObject<ProjectData>[];
    projectDependency?: PlainObject<ProjectVersionEntities>[];
    projectDependencyInfo?: PlainObject<ProjectDependencyInfo>;
  },
): Promise<RenderResult> =>
  TEST__setUpEditor(MOCK__editorStore, {
    project: TEST_DATA__DefaultSDLCInfo.project,
    workspace: TEST_DATA__DefaultSDLCInfo.workspace,
    curentRevision: TEST_DATA__DefaultSDLCInfo.currentRevision,
    projectVersions: [],
    entities: [],
    projectConfiguration: TEST_DATA__DefaultSDLCInfo.projectConfig,
    latestProjectStructureVersion:
      TEST_DATA__DefaultSDLCInfo.latestProjectStructureVersion,
    availableGenerationDescriptions: [
      ...TEST_DATA__DefaultSDLCInfo.availableSchemaGenerations,
      ...TEST_DATA__DefaultSDLCInfo.availableCodeGenerations,
    ],
    projects: [],
    projectData: [],
    projectDependency: [],
    projectDependencyInfo: TEST_DATA__DefaultDepotInfo.dependencyInfo,
    ...overrides,
  });
