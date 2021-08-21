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

import type { RenderResult } from '@testing-library/react';
import { render, fireEvent, waitFor, getByText } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ApplicationStore } from '../stores/ApplicationStore';
import { CORE_TEST_ID } from '../const';
import { EditorStore } from '../stores/EditorStore';
import { Editor } from './editor/Editor';
import { generateEditorRoute } from '../stores/LegendStudioRouter';
import {
  TEST__getTestApplicationConfig,
  TEST__getTestApplicationStore as TEST__getTestApplicationStore,
} from '../stores/StoreTestUtils';
import type { PlainObject } from '@finos/legend-shared';
import {
  Log,
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
} from '@finos/legend-shared';
import { StudioPluginManager } from '../application/StudioPluginManager';
import { WebApplicationNavigator } from '../stores/application/WebApplicationNavigator';
import type { Entity } from '@finos/legend-model-storage';
import type {
  Project,
  ProjectConfiguration,
  ProjectStructureVersion,
  Revision,
  Version,
  Workspace,
} from '@finos/legend-server-sdlc';
import {
  TEST__SDLCServerClientProvider,
  TEST__getTestSDLCServerClient,
} from '@finos/legend-server-sdlc';
import { ApplicationStoreProvider } from './application/ApplicationStoreProvider';
import type {
  ImportConfigurationDescription,
  ImportMode,
  GenerationConfigurationDescription,
  GenerationMode,
} from '@finos/legend-graph';
import { ELEMENT_PATH_DELIMITER } from '@finos/legend-graph';
import {
  TEST__DepotServerClientProvider,
  TEST__getTestDepotServerClient,
} from '@finos/legend-server-depot';
import { StudioStoreProvider } from './StudioStoreProvider';

export const TEST_DATA__DefaultSDLCInfo = {
  project: {
    projectId: 'UAT-2689',
    description: 'sdlcTesting',
    tags: [],
    projectType: 'PROTOTYPE',
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
    projectType: 'PROTOTYPE',
    groupId: 'com.test',
    artifactId: 'string',
    projectDependencies: [],
    metamodelDependencies: [],
  },
  latestProjectStructureVersion: {
    version: 6,
    extensionVersion: 3,
  },
  availableSchemaImports: [
    {
      label: 'XSD',
      key: 'Xsd',
      modelImportMode: 'schemaImport' as ImportMode,
    },
  ],
  availableCodeImports: [
    {
      label: 'Java',
      key: 'java',
      modelImportMode: 'codeImport' as ImportMode,
    },
  ],
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

export const TEST__ApplicationStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <ApplicationStoreProvider
    config={TEST__getTestApplicationConfig()}
    navigator={new WebApplicationNavigator(createMemoryHistory())}
    log={new Log()}
  >
    {children}
  </ApplicationStoreProvider>
);

export const TEST__StudioStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <StudioStoreProvider pluginManager={StudioPluginManager.create()}>
    {children}
  </StudioStoreProvider>
);

export const TEST__provideMockedApplicationStore = (
  config = TEST__getTestApplicationConfig(),
): ApplicationStore => {
  const mockedApplicationStore = new ApplicationStore(
    config,
    new WebApplicationNavigator(createMemoryHistory()),
    new Log(),
  );
  const MockedApplicationStoreProvider = require('./application/ApplicationStoreProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedApplicationStoreProvider.useApplicationStore = jest.fn();
  MockedApplicationStoreProvider.useApplicationStore.mockReturnValue(
    mockedApplicationStore,
  );
  return mockedApplicationStore;
};

export const TEST__provideMockedWebApplicationNavigator = (
  history = createMemoryHistory(),
): WebApplicationNavigator => {
  const mock = new WebApplicationNavigator(history);
  const MockWebApplicationNavigatorProvider = require('./application/WebApplicationNavigatorProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockWebApplicationNavigatorProvider.useWebApplicationNavigator = jest.fn();
  MockWebApplicationNavigatorProvider.useWebApplicationNavigator.mockReturnValue(
    mock,
  );
  return mock;
};

export const TEST__provideMockedEditorStore = (
  applicationStore?: ApplicationStore,
  pluginManager?: StudioPluginManager,
): EditorStore => {
  const mockedEditorStore = new EditorStore(
    applicationStore ?? TEST__getTestApplicationStore(),
    TEST__getTestSDLCServerClient(),
    TEST__getTestDepotServerClient(),
    pluginManager ?? StudioPluginManager.create(),
  );
  const MockedEditorStoreProvider = require('./editor/EditorStoreProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedEditorStoreProvider.useEditorStore = jest.fn();
  MockedEditorStoreProvider.useEditorStore.mockReturnValue(mockedEditorStore);
  return mockedEditorStore;
};

export const TEST__openAndAssertPathWithElement = async (
  path: string,
  renderResult: RenderResult,
  closePackage = true,
): Promise<void> => {
  const packageExplorer = renderResult.getByTestId(CORE_TEST_ID.EXPLORER_TREES);
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
  const packageExplorer = renderResult.getByTestId(CORE_TEST_ID.EXPLORER_TREES);
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
  mockedEditorStore: EditorStore,
  data: {
    project: PlainObject<Project>;
    workspace: PlainObject<Workspace>;
    curentRevision: PlainObject<Revision>;
    entities: PlainObject<Entity>[];
    projectVersions: PlainObject<Version>[];
    projectConfiguration: PlainObject<ProjectConfiguration>;
    latestProjectStructureVersion: PlainObject<ProjectStructureVersion>;
    availableGenerationDescriptions: GenerationConfigurationDescription[];
    availableImportDescriptions: ImportConfigurationDescription[];
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
    availableImportDescriptions,
  } = data;
  // mock editor initialization data
  MOBX__enableSpyOrMock();
  jest
    .spyOn(mockedEditorStore.sdlcServerClient, 'getProject')
    .mockResolvedValue(project);
  jest
    .spyOn(mockedEditorStore.sdlcServerClient, 'getWorkspace')
    .mockResolvedValue(workspace);
  jest
    .spyOn(mockedEditorStore.sdlcServerClient, 'getVersions')
    .mockResolvedValue(projectVersions);
  jest
    .spyOn(mockedEditorStore.sdlcServerClient, 'getRevision')
    .mockResolvedValue(curentRevision);
  jest
    .spyOn(
      mockedEditorStore.sdlcServerClient,
      'checkIfWorkspaceIsInConflictResolutionMode',
    )
    .mockResolvedValue(false);
  jest
    .spyOn(mockedEditorStore.sdlcServerClient, 'isWorkspaceOutdated')
    .mockResolvedValue(false);
  jest
    .spyOn(mockedEditorStore.sdlcServerClient, 'getEntities')
    .mockResolvedValue(entities);
  jest
    .spyOn(mockedEditorStore.sdlcServerClient, 'getConfiguration')
    .mockResolvedValue(projectConfiguration);
  jest
    .spyOn(
      mockedEditorStore.sdlcServerClient,
      'getLatestProjectStructureVersion',
    )
    .mockResolvedValue(latestProjectStructureVersion);
  // TODO: we need to think of how we will mock these calls when we modularize
  mockedEditorStore.graphState.graphManager.initialize = jest.fn();
  jest
    .spyOn(
      mockedEditorStore.graphState.graphManager,
      'getAvailableGenerationConfigurationDescriptions',
    )
    .mockResolvedValue(availableGenerationDescriptions);
  jest
    .spyOn(
      mockedEditorStore.graphState.graphManager,
      'getAvailableImportConfigurationDescriptions',
    )
    .mockResolvedValue(availableImportDescriptions);
  // skip font loader (as we have no network access in test)
  mockedEditorStore.preloadTextEditorFont = jest.fn();
  // mock change detections (since we do not test them now)
  mockedEditorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex =
    jest.fn();
  mockedEditorStore.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex =
    jest.fn();
  mockedEditorStore.sdlcState.buildProjectLatestRevisionEntityHashesIndex =
    jest.fn();
  mockedEditorStore.workspaceReviewState.fetchCurrentWorkspaceReview =
    jest.fn();
  mockedEditorStore.workspaceUpdaterState.fetchLatestCommittedReviews =
    jest.fn();
  MOBX__disableSpyOrMock();

  const history = createMemoryHistory({
    initialEntries: [
      generateEditorRoute(
        mockedEditorStore.applicationStore.config.sdlcServerKey,
        (workspace as unknown as Workspace).projectId,
        (workspace as unknown as Workspace).workspaceId,
      ),
    ],
  });
  mockedEditorStore.applicationStore.navigator = new WebApplicationNavigator(
    history,
  );

  const renderResult = render(
    <Router history={history}>
      <TEST__ApplicationStoreProvider>
        <TEST__SDLCServerClientProvider>
          <TEST__DepotServerClientProvider>
            <TEST__StudioStoreProvider>
              <Editor />
            </TEST__StudioStoreProvider>
          </TEST__DepotServerClientProvider>
        </TEST__SDLCServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </Router>,
  );
  // assert project/workspace have been set
  await waitFor(() =>
    expect(mockedEditorStore.sdlcState.currentProject).toBeDefined(),
  );
  await waitFor(() =>
    expect(mockedEditorStore.sdlcState.currentWorkspace).toBeDefined(),
  );
  // assert immutable models have been model
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.systemModel.buildState.hasSucceeded,
    ).toBeTrue(),
  );
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.graph.dependencyManager.buildState
        .hasSucceeded,
    ).toBeTrue(),
  );
  // assert main model has been build
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.graph.buildState.hasSucceeded,
    ).toBeTrue(),
  );
  // assert explorer trees have been built and rendered
  await waitFor(() =>
    expect(
      mockedEditorStore.explorerTreeState.buildState.hasCompleted,
    ).toBeTrue(),
  );
  await waitFor(() => renderResult.getByTestId(CORE_TEST_ID.EXPLORER_TREES));
  return renderResult;
};

export const TEST__setUpEditorWithDefaultSDLCData = (
  mockedEditorStore: EditorStore,
  overrides?: {
    project?: PlainObject<Project>;
    workspace?: PlainObject<Workspace>;
    curentRevision?: PlainObject<Revision>;
    entities?: PlainObject<Entity>[];
    projectVersions?: PlainObject<Version>[];
    projectConfiguration?: PlainObject<ProjectConfiguration>;
    latestProjectStructureVersion?: PlainObject<ProjectStructureVersion>;
    availableGenerationDescriptions?: GenerationConfigurationDescription[];
    availableImportDescriptions?: ImportConfigurationDescription[];
  },
): Promise<RenderResult> =>
  TEST__setUpEditor(mockedEditorStore, {
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
    availableImportDescriptions: [
      ...TEST_DATA__DefaultSDLCInfo.availableSchemaImports,
      ...TEST_DATA__DefaultSDLCInfo.availableCodeImports,
    ],
    ...overrides,
  });
