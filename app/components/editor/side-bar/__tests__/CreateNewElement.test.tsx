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

import 'PassThruWorker';
import { waitFor, RenderResult, fireEvent, getByText, getByPlaceholderText } from '@testing-library/react';
import { integration } from 'Utilities/TestUtil';
import { getMockedEditorStore, setUpEditor } from 'Components/__tests__/ComponentTestUtil';
import { TEST_ID } from 'Const';
import { EditorStore } from 'Stores/EditorStore';
import { testProject, testWorkspace, testProjectConfig, availableCodeGenerations, availableSchemaGenerations, testLatestProjectStructureVersion, currentTestRevision, availableSchemaImports, availableCodeImports } from 'Components/__tests__/SdlcTestData';
import { Project } from 'SDLC/project/Project';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { Workspace } from 'SDLC/workspace/Workspace';
import { ImportConfigurationDescription } from 'EXEC/modelImport/ImportConfigurationDescription';
import { GenerationConfigurationDescription } from 'EXEC/fileGeneration/GenerationConfigurationDescription';
import { ProjectStructureVersion } from 'SDLC/configuration/ProjectStructureVersion';
import { Revision } from 'SDLC/revision/Revision';
import { PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';

const addRootPackage = (packageName: string, result: RenderResult): void => {
  fireEvent.click(result.getByTitle('create new element', { exact: false }));
  const contextMenu = result.getByRole('menu');
  fireEvent.click(getByText(contextMenu, 'Add a new package'));
  const modal = result.getByTestId(TEST_ID.NEW_ELEMENT_MODAL);
  const packageInput = getByPlaceholderText(modal, 'Enter a name', { exact: false });
  fireEvent.change(packageInput, { target: { value: packageName } });
  fireEvent.click(getByText(modal, 'Create'));
};

const createNewElementOnRootPackage = (rootPackage: string, elementType: PACKAGEABLE_ELEMENT_TYPE, result: RenderResult, elementName?: string): void => {
  const packageExplorer = result.getByTestId(TEST_ID.EXPLORER_TREES);
  const rootPackageDiv = getByText(packageExplorer, rootPackage);
  const rightClick = { button: 2 };
  fireEvent.click(rootPackageDiv, rightClick);
  fireEvent.click(result.getByText(`Add a new ${elementType.toLowerCase()}`));
  const modal = result.getByTestId(TEST_ID.NEW_ELEMENT_MODAL);
  const elementInput = getByPlaceholderText(modal, 'Enter a name', { exact: false });
  const inputValue = elementName ?? `${elementType}Test`;
  fireEvent.change(elementInput, { target: { value: inputValue } });
  fireEvent.click(getByText(modal, 'Create'));
  getByText(packageExplorer, inputValue);
};

let renderResult: RenderResult;
let mockedEditorStore: EditorStore;

beforeEach(async () => {
  mockedEditorStore = getMockedEditorStore();
  renderResult = await setUpEditor(mockedEditorStore, {
    project: testProject as unknown as Project,
    workspace: testWorkspace as Workspace,
    curentRevision: currentTestRevision as unknown as Revision,
    projectVersions: [],
    entities: [],
    projectConfiguration: testProjectConfig as unknown as ProjectConfiguration,
    availableCodeGenerationDescriptions: availableCodeGenerations as unknown as GenerationConfigurationDescription[],
    availableSchemaGenerationDescriptions: availableSchemaGenerations as unknown as GenerationConfigurationDescription[],
    latestProjectStructureVersion: testLatestProjectStructureVersion as ProjectStructureVersion,
    availableSchemaImportDescriptions: availableSchemaImports as unknown as ImportConfigurationDescription[],
    availableCodeImportDescriptions: availableCodeImports as unknown as ImportConfigurationDescription[]
  });
});

test(integration('Model loader shows up if no elements in graph'), async () => {
  const packageExplorer = renderResult.getByTestId(TEST_ID.EXPLORER_TREES);
  getByText(packageExplorer, 'Open Model Loader');
  // TODO
});

// TODO: add conneciton, runtime, text, etc.
test(integration('Create elements with no drivers'), async () => {
  const ROOT_PACKAGE_NAME = 'model';
  addRootPackage(ROOT_PACKAGE_NAME, renderResult);
  createNewElementOnRootPackage(ROOT_PACKAGE_NAME, PACKAGEABLE_ELEMENT_TYPE.PROFILE, renderResult, 'ProfileExtension');
  createNewElementOnRootPackage(ROOT_PACKAGE_NAME, PACKAGEABLE_ELEMENT_TYPE.ENUMERATION, renderResult, 'MyEnumeration');
  createNewElementOnRootPackage(ROOT_PACKAGE_NAME, PACKAGEABLE_ELEMENT_TYPE.CLASS, renderResult, 'Person');
  createNewElementOnRootPackage(ROOT_PACKAGE_NAME, PACKAGEABLE_ELEMENT_TYPE.MAPPING, renderResult, 'MyMapping');
  await waitFor(() => expect(mockedEditorStore.graphState.graph.getProfile(`${ROOT_PACKAGE_NAME}::ProfileExtension`)).toBeDefined());
  await waitFor(() => expect(mockedEditorStore.graphState.graph.getEnumeration(`${ROOT_PACKAGE_NAME}::MyEnumeration`)).toBeDefined());
  await waitFor(() => expect(mockedEditorStore.graphState.graph.getClass(`${ROOT_PACKAGE_NAME}::Person`)).toBeDefined());
  await waitFor(() => expect(mockedEditorStore.graphState.graph.getMapping(`${ROOT_PACKAGE_NAME}::MyMapping`)).toBeDefined());
  expect(renderResult.queryByText('system')).toBeTruthy();
  expect(renderResult.queryByText('config')).toBeTruthy();
});

