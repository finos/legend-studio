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

import { expect } from '@jest/globals';
import {
  type RenderResult,
  render,
  fireEvent,
  waitFor,
  getByText,
} from '@testing-library/react';
import { LEGEND_STUDIO_TEST_ID } from '../../../__lib__/LegendStudioTesting.js';
import { EditorStore } from '../../../stores/editor/EditorStore.js';
import { Editor } from '../Editor.js';
import {
  generateEditorRoute,
  generateViewProjectRoute,
  LEGEND_STUDIO_ROUTE_PATTERN,
} from '../../../__lib__/LegendStudioNavigation.js';
import { type PlainObject } from '@finos/legend-shared';
import { createMock, createSpy } from '@finos/legend-shared/test';
import { LegendStudioPluginManager } from '../../../application/LegendStudioPluginManager.js';
import type { Entity } from '@finos/legend-storage';
import {
  type Project,
  type ProjectConfiguration,
  type ProjectStructureVersion,
  type Revision,
  type Version,
  type Workspace,
  WorkspaceType,
  SDLCServerFeaturesConfiguration,
  SDLCServerClient,
} from '@finos/legend-server-sdlc';
import {
  type GenerationConfigurationDescription,
  type GenerationMode,
  type GraphManagerState,
  ELEMENT_PATH_DELIMITER,
} from '@finos/legend-graph';
import {
  DepotServerClient,
  type StoreProjectData,
  type ProjectVersionEntities,
  type RawProjectDependencyReport,
} from '@finos/legend-server-depot';
import { LegendStudioFrameworkProvider } from '../../LegendStudioFrameworkProvider.js';
import {
  ApplicationStoreProvider,
  ApplicationStore,
} from '@finos/legend-application';
import {
  createMemoryHistory,
  TEST__BrowserEnvironmentProvider,
} from '@finos/legend-application/test';
import { type LegendStudioApplicationStore } from '../../../stores/LegendStudioBaseStore.js';
import { TEST__getLegendStudioApplicationConfig } from '../../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { Route } from '@finos/legend-application/browser';
import { ProjectViewer } from '../../project-view/ProjectViewer.js';

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

export const TEST_DATA__DefaultDepotReport = {
  dependencyReport: {
    graph: {
      nodes: [],
      rootNodes: [],
    },
    conflicts: [],
  },
};

export const TEST__provideMockedEditorStore = (customization?: {
  mock?: EditorStore;
  applicationStore?: LegendStudioApplicationStore;
  graphManagerState?: GraphManagerState;
  pluginManager?: LegendStudioPluginManager;
}): EditorStore => {
  const pluginManager =
    customization?.pluginManager ?? LegendStudioPluginManager.create();
  const applicationStore =
    customization?.applicationStore ??
    new ApplicationStore(
      TEST__getLegendStudioApplicationConfig(),
      pluginManager,
    );
  const value =
    customization?.mock ??
    new EditorStore(
      applicationStore,
      new SDLCServerClient({
        env: applicationStore.config.env,
        serverUrl: applicationStore.config.sdlcServerUrl,
        baseHeaders: applicationStore.config.sdlcServerBaseHeaders,
      }),
      new DepotServerClient({
        serverUrl: applicationStore.config.depotServerUrl,
      }),
    );
  const MOCK__EditorStoreProvider = require('../EditorStoreProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  MOCK__EditorStoreProvider.useEditorStore = createMock();
  MOCK__EditorStoreProvider.useEditorStore.mockReturnValue(value);
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
    projects: PlainObject<StoreProjectData>[];
    projectDependency: PlainObject<ProjectVersionEntities>[];
    projectDependencyVersions: string[];
    projectDependencyReport: PlainObject<RawProjectDependencyReport>;
  },
  viewerMode?: boolean,
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
    projects,
    projectDependency,
    projectDependencyVersions,
    projectDependencyReport,
  } = data;

  // SDLC
  createSpy(MOCK__editorStore.sdlcServerClient, 'getProject').mockResolvedValue(
    project,
  );
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'getWorkspace',
  ).mockResolvedValue(workspace);
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'getVersions',
  ).mockResolvedValue(projectVersions);
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'getRevision',
  ).mockResolvedValue(curentRevision);
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'checkIfWorkspaceIsInConflictResolutionMode',
  ).mockResolvedValue(false);
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'isWorkspaceOutdated',
  ).mockResolvedValue(false);

  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'getEntities',
  ).mockResolvedValue(entities);
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'getConfiguration',
  ).mockResolvedValue(projectConfiguration);
  createSpy(
    MOCK__editorStore.sdlcServerClient,
    'getLatestProjectStructureVersion',
  ).mockResolvedValue(latestProjectStructureVersion);
  MOCK__editorStore.sdlcServerClient._setFeatures(
    SDLCServerFeaturesConfiguration.serialization.fromJson({
      canCreateProject: true,
      canCreateVersion: true,
    }),
  );

  // depot
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getProjects',
  ).mockResolvedValue(projects);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'getVersions',
  ).mockResolvedValue(projectDependencyVersions);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'collectDependencyEntities',
  ).mockResolvedValue(projectDependency);
  createSpy(
    MOCK__editorStore.depotServerClient,
    'analyzeDependencyTree',
  ).mockResolvedValue(projectDependencyReport);

  // TODO: we need to think of how we will mock these calls when we modularize
  // we don't need to but we probably should mock the call to get other configurations,
  // e.g. external format, function activator, etc.
  const graphManagerState = MOCK__editorStore.graphManagerState;
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  createSpy(
    graphManagerState.graphManager,
    'getAvailableGenerationConfigurationDescriptions',
  ).mockResolvedValue(availableGenerationDescriptions);

  // mock change detections (since we do not test them now)
  MOCK__editorStore.changeDetectionState.workspaceLocalLatestRevisionState.buildEntityHashesIndex =
    createMock();
  MOCK__editorStore.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex =
    createMock();
  MOCK__editorStore.sdlcState.buildProjectLatestRevisionEntityHashesIndex =
    createMock();
  MOCK__editorStore.workspaceReviewState.fetchCurrentWorkspaceReview =
    createMock();
  MOCK__editorStore.workspaceUpdaterState.fetchLatestCommittedReviews =
    createMock();

  if (viewerMode) {
    createSpy(
      MOCK__editorStore.sdlcServerClient,
      'getLatestVersion',
    ).mockResolvedValue(undefined);
    MOCK__editorStore.sdlcServerClient.setTracerService(
      MOCK__editorStore.applicationStore.tracerService,
    );
    MOCK__editorStore.depotServerClient.setTracerService(
      MOCK__editorStore.applicationStore.tracerService,
    );
  }

  const history = createMemoryHistory({
    initialEntries: [
      viewerMode
        ? generateViewProjectRoute(
            (workspace as unknown as Workspace).projectId,
          )
        : generateEditorRoute(
            (workspace as unknown as Workspace).projectId,
            undefined,
            (workspace as unknown as Workspace).workspaceId,
            WorkspaceType.USER,
          ),
    ],
  });

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__editorStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider historyAPI={history}>
        <LegendStudioFrameworkProvider>
          {viewerMode ? (
            <Route path={[LEGEND_STUDIO_ROUTE_PATTERN.VIEW]}>
              <ProjectViewer />
            </Route>
          ) : (
            <Route path={[LEGEND_STUDIO_ROUTE_PATTERN.EDIT_WORKSPACE]}>
              <Editor />
            </Route>
          )}
        </LegendStudioFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
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
    projects?: PlainObject<StoreProjectData>[];
    projectData?: PlainObject<StoreProjectData>[];
    projectDependency?: PlainObject<ProjectVersionEntities>[];
    projectDependencyVersions?: string[];
    projectDependencyReport?: PlainObject<RawProjectDependencyReport>;
  },
  viewerMode?: boolean,
): Promise<RenderResult> =>
  TEST__setUpEditor(
    MOCK__editorStore,
    {
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
      projectDependency: [],
      projectDependencyVersions: [],
      projectDependencyReport: TEST_DATA__DefaultDepotReport.dependencyReport,
      ...overrides,
    },
    viewerMode,
  );
