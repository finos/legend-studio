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
import { waitFor, RenderResult, fireEvent, getByText, getByTestId, queryByText, getByTitle } from '@testing-library/react';
import completeGraphEntities from 'Stores/__tests__/buildGraph/CompleteGraphEntitiesTestData.json';
import { integration } from 'Utilities/TestUtil';
import { testProject, testWorkspace, testProjectConfig, currentTestRevision, availableCodeGenerations, availableSchemaGenerations, testLatestProjectStructureVersion, availableCodeImports, availableSchemaImports } from 'Components/__tests__/SdlcTestData';
import { openElementFromExplorerTree, getMockedEditorStore, setUpEditor } from 'Components/__tests__/ComponentTestUtil';
import { TEST_ID } from 'Const';
import { Entity } from 'SDLC/entity/Entity';
import { Project } from 'SDLC/project/Project';
import { ProjectConfiguration } from 'SDLC/configuration/ProjectConfiguration';
import { Workspace } from 'SDLC/workspace/Workspace';
import { GenerationConfigurationDescription } from 'EXEC/fileGeneration/GenerationConfigurationDescription';
import { ImportConfigurationDescription } from 'EXEC/modelImport/ImportConfigurationDescription';
import { ProjectStructureVersion } from 'SDLC/configuration/ProjectStructureVersion';
import { Revision } from 'SDLC/revision/Revision';

let renderResult: RenderResult;

beforeEach(async () => {
  const mockedEditorStore = getMockedEditorStore();
  renderResult = await setUpEditor(mockedEditorStore, {
    project: testProject as unknown as Project,
    workspace: testWorkspace as Workspace,
    curentRevision: currentTestRevision as unknown as Revision,
    projectVersions: [],
    entities: completeGraphEntities as Entity[],
    projectConfiguration: testProjectConfig as unknown as ProjectConfiguration,
    availableCodeGenerationDescriptions: availableCodeGenerations as unknown as GenerationConfigurationDescription[],
    availableSchemaGenerationDescriptions: availableSchemaGenerations as unknown as GenerationConfigurationDescription[],
    latestProjectStructureVersion: testLatestProjectStructureVersion as ProjectStructureVersion,
    availableSchemaImportDescriptions: availableSchemaImports as unknown as ImportConfigurationDescription[],
    availableCodeImportDescriptions: availableCodeImports as unknown as ImportConfigurationDescription[]
  });
});

test(integration('Test navigation between element states'), async () => {
  // Test opening multiple elements
  await openElementFromExplorerTree('ui::mapping::editor::domain::Animal', renderResult);
  const packageExplorer = renderResult.getByTestId(TEST_ID.EXPLORER_TREES);
  fireEvent.click(getByText(packageExplorer, 'TestClass'));
  fireEvent.click(getByText(packageExplorer, 'TestEnumeration'));
  fireEvent.click(getByText(packageExplorer, 'testDiagram'));
  fireEvent.click(getByText(packageExplorer, 'Anyone'));
  fireEvent.click(getByText(packageExplorer, 'Dog'));
  fireEvent.click(getByText(packageExplorer, 'Something'));
  fireEvent.click(getByText(packageExplorer, 'ProfileTest'));
  const editPanelHeader = renderResult.getByTestId(TEST_ID.EDIT_PANEL__HEADER_TABS);
  await waitFor(() => getByText(editPanelHeader, 'ProfileTest'));

  const openElements = ['TestEnumeration', 'testDiagram', 'TestClass', 'Anyone', 'Dog', 'Something', 'ProfileTest'];
  openElements.forEach(openEl => getByText(editPanelHeader, openEl));

  // navigate through visit buttons
  fireEvent.click(getByText(editPanelHeader, 'TestClass'));
  await waitFor(() => renderResult.getByText('founder'));
  const navigateToClass = async (className: string): Promise<void> => {
    const classForm = renderResult.getByTestId(TEST_ID.CLASS_FORM_EDITOR);
    const property = await waitFor(() => getByText(classForm, className));
    const propertyBasicEditor = property.parentElement as HTMLElement;
    const navigateButton = getByTestId(propertyBasicEditor, TEST_ID.TYPE_VISIT);
    fireEvent.click(navigateButton);
    await waitFor(() => getByText(editPanelHeader, className));
  };

  await navigateToClass('Person');
  await navigateToClass('Firm');
  await navigateToClass('Person');
  await navigateToClass('Degree');
  const newOpened = ['Firm', 'Degree', 'Person'];
  openElements.concat(newOpened).forEach(openElement => getByText(editPanelHeader, openElement));

  // test closing of tabs
  const closeTabs = ['Firm', 'Degree', 'TestEnumeration'];
  closeTabs.forEach(tab => {
    const text = getByText(editPanelHeader, tab);
    const parent = text.parentElement as HTMLElement;
    const deleteButton = getByTitle(parent, 'Close');
    fireEvent.click(deleteButton);
  });
  closeTabs.forEach(tab => expect(queryByText(editPanelHeader, tab)).toBeNull());
  // TODO Add Diff Element States
});

