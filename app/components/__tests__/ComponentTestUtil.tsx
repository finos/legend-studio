/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { render, RenderResult, fireEvent, waitFor, getByText } from '@testing-library/react';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory, History } from 'history';
import { ApplicationStoreProvider, ApplicationStore } from 'Stores/ApplicationStore';
import { TEST_ID } from 'Const';
import { ENTITY_PATH_DELIMITER } from 'MetaModelConst';
import { EditorStore } from 'Stores/EditorStore';
import { sdlcClient } from 'API/SdlcClient';
import { Editor } from 'Components/editor/Editor';
import { Project } from 'SDLC/project/Project';
import { Workspace } from 'SDLC/workspace/Workspace';
import { Version } from 'SDLC/version/Version';
import { Entity } from 'SDLC/entity/Entity';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { GenerationConfigurationDescription } from 'EXEC/fileGeneration/GenerationConfigurationDescription';
import { ProjectStructureVersion } from 'SDLC/configuration/ProjectStructureVersion';
import { executionClient } from 'API/ExecutionClient';
import { Revision } from 'SDLC/revision/Revision';
import { ROUTE_PATTERN, getEditorRoute } from 'Stores/RouterConfig';
import { ImportConfigurationDescription } from 'EXEC/modelImport/ImportConfigurationDescription';

// NOTE: use get by (i.e getByTestId) functions to assert as these functions will throw an error when no elements
// are returned or if more than one element is returned. This will ensure you are isolating where you want to test.
// To assert null you can assert query by functions to be null or empty (query by -> null), (queryAll -> empty)

// A handy function to test any component that relies on the router being in context
// See https://testing-library.com/docs/example-react-router
export const renderWithAppContext = (
  ui: React.ReactNode,
  { route = '/', history = createMemoryHistory({ initialEntries: [route] }) }: { route?: string; history?: History } = {}
): RenderResult & { history: History } => ({
  ...render(
    <ApplicationStoreProvider history={history}>
      <Router history={history}>{ui}</Router>
    </ApplicationStoreProvider>
  ),
  // adding `history` to the returned utilities to allow us
  // to reference it in our tests (just try to avoid using this to test implementation details).
  history,
});

export const getMockedEditorStore = (applicationStore?: ApplicationStore): EditorStore => {
  const mockedEditorStore = new EditorStore(applicationStore ?? new ApplicationStore(createMemoryHistory()));
  const MockedEditorStore = require('Stores/EditorStore'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedEditorStore.useEditorStore = jest.fn();
  MockedEditorStore.useEditorStore.mockReturnValue(mockedEditorStore);
  return mockedEditorStore;
};

export const openAndAssertPathWithElement = async (path: string, renderResult: RenderResult, closePackage = true): Promise<void> => {
  const packageExplorer = renderResult.getByTestId(TEST_ID.EXPLORER_TREES);
  const packages = path.split(ENTITY_PATH_DELIMITER);
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

export const openElementFromExplorerTree = async (path: string, renderResult: RenderResult): Promise<void> => {
  const packageExplorer = renderResult.getByTestId(TEST_ID.EXPLORER_TREES);
  await openAndAssertPathWithElement(path, renderResult, false);
  const elementName = path.split(ENTITY_PATH_DELIMITER).pop() as string;
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
export const setUpEditor = async (mockedEditorStore: EditorStore, data: {
  project: Project;
  workspace: Workspace;
  curentRevision: Revision;
  entities: Entity[];
  projectVersions: Version[];
  projectConfiguration: ProjectConfiguration;
  availableSchemaGenerationDescriptions: GenerationConfigurationDescription[];
  availableCodeGenerationDescriptions: GenerationConfigurationDescription[];
  latestProjectStructureVersion: ProjectStructureVersion;
  availableSchemaImportDescriptions: ImportConfigurationDescription[];
  availableCodeImportDescriptions: ImportConfigurationDescription[];
}): Promise<RenderResult> => {
  const { project, workspace, curentRevision, projectVersions, projectConfiguration, entities, latestProjectStructureVersion, availableCodeGenerationDescriptions, availableSchemaGenerationDescriptions, availableSchemaImportDescriptions, availableCodeImportDescriptions } = data;
  // Mock values -> with expected returns
  jest.spyOn(sdlcClient, 'getProject').mockResolvedValue(project);
  jest.spyOn(sdlcClient, 'getWorkspace').mockResolvedValue(workspace);
  jest.spyOn(sdlcClient, 'getVersions').mockResolvedValue(projectVersions);
  jest.spyOn(sdlcClient, 'getRevision').mockResolvedValue(curentRevision);
  jest.spyOn(sdlcClient, 'checkIfWorkspaceIsInConflictResolutionMode').mockResolvedValue(false);
  jest.spyOn(sdlcClient, 'isWorkspaceOutdated').mockResolvedValue(false);
  jest.spyOn(sdlcClient, 'getEntities').mockResolvedValue(entities);
  jest.spyOn(sdlcClient, 'getConfiguration').mockResolvedValue(projectConfiguration);
  jest.spyOn(sdlcClient, 'getLatestProjectStructureVersion').mockResolvedValue(latestProjectStructureVersion);
  jest.spyOn(executionClient, 'getAvailableCodeGenerationDescriptions').mockResolvedValue(availableCodeGenerationDescriptions);
  jest.spyOn(executionClient, 'getAvailableSchemaGenerationDescriptions').mockResolvedValue(availableSchemaGenerationDescriptions);
  jest.spyOn(executionClient, 'getAvailableSchemaImportDescriptions').mockResolvedValue(availableSchemaImportDescriptions);
  jest.spyOn(executionClient, 'getAvailableCodeImportDescriptions').mockResolvedValue(availableCodeImportDescriptions);

  // mock change detections (since we do not test them now)
  mockedEditorStore.changeDetectionState.workspaceLatestRevisionState.buildEntityHashesIndex = jest.fn();
  mockedEditorStore.sdlcState.buildWorkspaceBaseRevisionEntityHashesIndex = jest.fn();
  mockedEditorStore.sdlcState.buildProjectLatestRevisionEntityHashesIndex = jest.fn();
  mockedEditorStore.sdlcState.fetchProjectVersions = jest.fn();
  mockedEditorStore.workspaceReviewState.fetchCurrentWorkspaceReview = jest.fn();
  mockedEditorStore.workspaceUpdaterState.fetchLatestCommittedReviews = jest.fn();
  // render main editor
  const component = <Route exact={true} strict={true} path={ROUTE_PATTERN.EDITOR} component={Editor} />;
  const renderResult = renderWithAppContext(component, { route: getEditorRoute(workspace.projectId, workspace.workspaceId) });
  // assert project/workspace have been set
  await waitFor(() => expect(mockedEditorStore.sdlcState.currentProject).toBeDefined());
  await waitFor(() => expect(mockedEditorStore.sdlcState.currentWorkspace).toBeDefined());
  // assert immutable models have been model
  await waitFor(() => expect(mockedEditorStore.graphState.systemModel.isBuilt).toBeTrue());
  await waitFor(() => expect(mockedEditorStore.graphState.legalModel.isBuilt).toBeTrue());
  await waitFor(() => expect(mockedEditorStore.graphState.graph.dependencyManager.isBuilt).toBeTrue());
  // assert main model has been build
  await waitFor(() => expect(mockedEditorStore.graphState.graph.isBuilt).toBeTrue());
  // assert explorer trees have been built and rendered
  await waitFor(() => expect(mockedEditorStore.explorerTreeState.isBuilt).toBeTrue());
  await waitFor(() => renderResult.getByTestId(TEST_ID.EXPLORER_TREES));
  return renderResult;
};
