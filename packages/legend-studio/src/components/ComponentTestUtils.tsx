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
import {
  ApplicationStoreProvider,
  ApplicationStore,
} from '../stores/ApplicationStore';
import { CORE_TEST_ID } from '../const';
import { ELEMENT_PATH_DELIMITER } from '../models/MetaModelConst';
import { EditorStore } from '../stores/EditorStore';
import { Editor } from './editor/Editor';
import type { Project } from '../models/sdlc/models/project/Project';
import type { Workspace } from '../models/sdlc/models/workspace/Workspace';
import type { Version } from '../models/sdlc/models/version/Version';
import type { Entity } from '../models/sdlc/models/entity/Entity';
import type { ProjectConfiguration } from '../models/sdlc/models/configuration/ProjectConfiguration';
import type { ProjectStructureVersion } from '../models/sdlc/models/configuration/ProjectStructureVersion';
import type { Revision } from '../models/sdlc/models/revision/Revision';
import { generateEditorRoute } from '../stores/LegendStudioRouter';
import { getTestApplicationConfig } from '../stores/StoreTestUtils';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  Log,
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
} from '@finos/legend-studio-shared';
import type {
  ImportConfigurationDescription,
  ImportMode,
} from '../models/metamodels/pure/action/generation/ImportConfigurationDescription';
import type { GenerationConfigurationDescription } from '../models/metamodels/pure/action/generation/GenerationConfigurationDescription';
import { PluginManager } from '../application/PluginManager';
import type { GenerationMode } from '../models/metamodels/pure/model/packageableElements/fileGeneration/FileGenerationSpecification';
import { WebApplicationNavigator } from '../stores/application/WebApplicationNavigator';

export const SDLC_TestData = {
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
    config={getTestApplicationConfig()}
    pluginManager={PluginManager.create()}
    navigator={new WebApplicationNavigator(createMemoryHistory())}
    log={new Log()}
  >
    {children}
  </ApplicationStoreProvider>
);

export const getMockedApplicationStore = (
  config = getTestApplicationConfig(),
): ApplicationStore => {
  const mockedApplicationStore = new ApplicationStore(
    config,
    PluginManager.create(),
    new WebApplicationNavigator(createMemoryHistory()),
    new Log(),
  );
  const MockedApplicationStore = require('../stores/ApplicationStore'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedApplicationStore.useApplicationStore = jest.fn();
  MockedApplicationStore.useApplicationStore.mockReturnValue(
    mockedApplicationStore,
  );
  return mockedApplicationStore;
};

export const getMockedWebApplicationNavigator = (
  history = createMemoryHistory(),
): WebApplicationNavigator => {
  const mock = new WebApplicationNavigator(history);
  const MockWebApplicationNavigator = require('../stores/application/WebApplicationNavigator'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockWebApplicationNavigator.useWebApplicationNavigator = jest.fn();
  MockWebApplicationNavigator.useWebApplicationNavigator.mockReturnValue(mock);
  return mock;
};

export const getMockedEditorStore = (
  applicationStore?: ApplicationStore,
): EditorStore => {
  const mockedEditorStore = new EditorStore(
    applicationStore ?? getMockedApplicationStore(),
  );
  const MockedEditorStore = require('../stores/EditorStore'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedEditorStore.useEditorStore = jest.fn();
  MockedEditorStore.useEditorStore.mockReturnValue(mockedEditorStore);
  return mockedEditorStore;
};

export const openAndAssertPathWithElement = async (
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

export const openElementFromExplorerTree = async (
  path: string,
  renderResult: RenderResult,
): Promise<void> => {
  const packageExplorer = renderResult.getByTestId(CORE_TEST_ID.EXPLORER_TREES);
  await openAndAssertPathWithElement(path, renderResult, false);
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
export const setUpEditor = async (
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
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'getProject',
    )
    .mockResolvedValue(project);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'getWorkspace',
    )
    .mockResolvedValue(workspace);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'getVersions',
    )
    .mockResolvedValue(projectVersions);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'getRevision',
    )
    .mockResolvedValue(curentRevision);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'checkIfWorkspaceIsInConflictResolutionMode',
    )
    .mockResolvedValue(false);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'isWorkspaceOutdated',
    )
    .mockResolvedValue(false);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'getEntities',
    )
    .mockResolvedValue(entities);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
      'getConfiguration',
    )
    .mockResolvedValue(projectConfiguration);
  jest
    .spyOn(
      mockedEditorStore.applicationStore.networkClientManager.sdlcClient,
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
        <Editor />
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

export const setUpEditorWithDefaultSDLCData = (
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
  setUpEditor(mockedEditorStore, {
    project: SDLC_TestData.project,
    workspace: SDLC_TestData.workspace,
    curentRevision: SDLC_TestData.currentRevision,
    projectVersions: [],
    entities: [],
    projectConfiguration: SDLC_TestData.projectConfig,
    latestProjectStructureVersion: SDLC_TestData.latestProjectStructureVersion,
    availableGenerationDescriptions: [
      ...SDLC_TestData.availableSchemaGenerations,
      ...SDLC_TestData.availableCodeGenerations,
    ],
    availableImportDescriptions: [
      ...SDLC_TestData.availableSchemaImports,
      ...SDLC_TestData.availableCodeImports,
    ],
    ...overrides,
  });
