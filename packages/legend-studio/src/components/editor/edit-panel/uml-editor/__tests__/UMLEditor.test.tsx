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
import {
  getByText,
  getByDisplayValue,
  queryByDisplayValue,
  getByTestId,
  getAllByRole,
  getAllByText,
  getAllByDisplayValue,
  queryByRole,
  queryAllByRole,
  queryByText,
  waitFor,
  fireEvent,
} from '@testing-library/react';
import m2mGraphEntities from '../../../../../stores/__tests__/buildGraph/M2MGraphEntitiesTestData.json';
import { integrationTest } from '@finos/legend-studio-shared';
import {
  openElementFromExplorerTree,
  getMockedEditorStore,
  setUpEditorWithDefaultSDLCData,
} from '../../../../ComponentTestUtils';
import { CORE_TEST_ID } from '../../../../../const';

let renderResult: RenderResult;

beforeEach(async () => {
  const mockedEditorStore = getMockedEditorStore();
  renderResult = await setUpEditorWithDefaultSDLCData(mockedEditorStore, {
    entities: m2mGraphEntities,
  });
});

test(integrationTest('Profile view renders properly'), async () => {
  await openElementFromExplorerTree('ui::test1::ProfileTest', renderResult);
  const editPanelHeader = renderResult.getByTestId(
    CORE_TEST_ID.EDIT_PANEL__HEADER_TABS,
  );
  expect(getByText(editPanelHeader, 'ProfileTest')).not.toBeNull();
  const editPanelContent = renderResult.getByTestId(
    CORE_TEST_ID.EDIT_PANEL_CONTENT,
  );
  expect(getByText(editPanelContent, 'ProfileTest')).not.toBeNull();
  const taggedValues = ['tag1', 'tag2', 'tag3'];
  taggedValues.forEach((t) =>
    expect(getByDisplayValue(editPanelContent, t)).not.toBeNull(),
  );
  fireEvent.click(getByText(editPanelContent, 'Stereotypes'));
  const stereotypes = ['stereotype1', 'stereotype2'];
  stereotypes.forEach((s) =>
    expect(getByDisplayValue(editPanelContent, s)).not.toBeNull(),
  );
});

test(
  integrationTest('Class view without constraints and derived properties'),
  async () => {
    await openElementFromExplorerTree('ui::TestClass', renderResult);
    const editPanelHeader = renderResult.getByTestId(
      CORE_TEST_ID.EDIT_PANEL__HEADER_TABS,
    );
    expect(getByText(editPanelHeader, 'TestClass')).not.toBeNull();
    const classForm = renderResult.getByTestId(CORE_TEST_ID.CLASS_FORM_EDITOR);
    // Normal properties
    const classProperties = ['a', 'b', 'name', 'person'];
    classProperties.forEach((t) =>
      expect(getByDisplayValue(classForm, t)).not.toBeNull(),
    );
    // Supertype propertes
    const superTypeProperties = [
      'legs',
      'arms',
      'planet',
      'description',
      'founder',
    ];
    superTypeProperties.forEach((superTypeProperty) => {
      // input fields for super type property name are not present/disabled
      expect(queryByDisplayValue(classForm, superTypeProperty)).toBeNull();
      expect(queryByText(classForm, superTypeProperty)).not.toBeNull();
    });
    // Association properties
    const associationProperties = ['testClassSibling'];
    associationProperties.forEach((associationProperty) => {
      // input fields for association property name are not present/disabled
      expect(queryByDisplayValue(classForm, associationProperty)).toBeNull();
      expect(queryByText(classForm, associationProperty)).not.toBeNull();
    });
    // SuperTypes
    fireEvent.click(getByText(classForm, 'Super Types'));
    await waitFor(() => getByText(classForm, 'Animal'));
    // TaggedValues
    fireEvent.click(getByText(classForm, 'Tagged Values'));
    await waitFor(() => getByText(classForm, 'ProfileTest'));
    expect(getByText(classForm, 'tag1')).not.toBeNull();
    expect(getByDisplayValue(classForm, 'test')).not.toBeNull();
    // Stereotypes
    fireEvent.click(getByText(classForm, 'Stereotypes'));
    await waitFor(() => getByText(classForm, 'ProfileTest'));
    expect(getByText(classForm, 'stereotype1')).not.toBeNull();
    // Back to properties. Test more rigorous
    fireEvent.click(getByText(classForm, 'Properties'));
    await waitFor(() => getByText(classForm, 'founder'));
    const inputA = getByDisplayValue(classForm, 'a');
    const propertyA = inputA.parentElement as HTMLElement;
    fireEvent.change(inputA, { target: { value: 'abcdefg' } });
    await waitFor(() => getByDisplayValue(classForm, 'abcdefg'));
    expect(getAllByDisplayValue(propertyA, '1')).toHaveLength(2);
    expect(getByText(propertyA, 'String')).not.toBeNull();
    expect(getAllByRole(propertyA, 'button')).toHaveLength(2);
    const deleteButton = getAllByRole(propertyA, 'button')[1];
    fireEvent.click(deleteButton);
    expect(queryByDisplayValue(classForm, 'abcdefg')).toBeNull();
    // Sub Panel Property
    const inputB = getByDisplayValue(classForm, 'b');
    const propertyB = inputB.parentElement as HTMLElement;
    const buttons = getAllByRole(propertyB, 'button');
    expect(buttons).toHaveLength(2);
    expect(queryByDisplayValue(classForm, 'ProfileTest')).toBeNull();
    const navigateToPropertyButton = buttons[0];
    fireEvent.click(navigateToPropertyButton);
    await waitFor(() => getByText(classForm, 'property'));
    const subPropertyPanel = getByTestId(classForm, CORE_TEST_ID.PANEL);
    expect(
      getByDisplayValue(subPropertyPanel, 'lets write a tag'),
    ).not.toBeNull();
    expect(getAllByText(subPropertyPanel, 'tag2')).not.toBeNull();
    expect(getByText(subPropertyPanel, 'ProfileTest')).not.toBeNull();
    fireEvent.click(getByText(subPropertyPanel, 'Stereotypes'));
    await waitFor(() => getByText(subPropertyPanel, 'stereotype1'));
    const exitButtons = getAllByRole(subPropertyPanel, 'button');
    fireEvent.click(exitButtons[0]);
    expect(queryByRole(classForm, 'panel')).toBeNull();
  },
);

test(integrationTest('Enumeration View'), async () => {
  await openElementFromExplorerTree('ui::TestEnumeration', renderResult);
  const editPanelHeader = renderResult.getByTestId(
    CORE_TEST_ID.EDIT_PANEL__HEADER_TABS,
  );
  expect(getByText(editPanelHeader, 'TestEnumeration')).not.toBeNull();
  const enumerationEditor = renderResult.getByTestId(
    CORE_TEST_ID.ENUMERATION_EDITOR,
  );
  const enums = ['enumA', 'enumB', 'enumC'];
  enums.forEach((e) => getByDisplayValue(enumerationEditor, e));
  fireEvent.click(getByText(enumerationEditor, 'Tagged Values'));
  await waitFor(() => getByText(enumerationEditor, 'ProfileTest'));
  getByDisplayValue(enumerationEditor, 'Enumeration Tag');
  fireEvent.click(getByText(enumerationEditor, 'Stereotypes'));
  await waitFor(() => getByText(enumerationEditor, 'stereotype2'));
  fireEvent.click(getByText(enumerationEditor, 'Values'));
  await waitFor(() => getByDisplayValue(enumerationEditor, 'enumA'));
  const enumB = getByDisplayValue(enumerationEditor, 'enumA');
  const parentElement = enumB.parentElement as HTMLElement;
  const buttons = queryAllByRole(parentElement, 'button');
  expect(buttons).toHaveLength(2);
  const navigateButton = buttons[0];
  const deleteButton = buttons[1];
  fireEvent.click(navigateButton);
  await waitFor(() => getByText(enumerationEditor, 'enum'));
  const subPropertyPanel = getByTestId(enumerationEditor, CORE_TEST_ID.PANEL);
  getByDisplayValue(subPropertyPanel, 'enumATag');
  fireEvent.click(getByText(subPropertyPanel, 'Stereotypes'));
  await waitFor(() => getByText(subPropertyPanel, 'stereotype1'));
  const deleteSubPanelButton = queryAllByRole(subPropertyPanel, 'button')[0];
  fireEvent.click(deleteSubPanelButton);
  fireEvent.click(deleteButton);
  expect(queryByText(enumerationEditor, 'enumA')).toBeNull();
});

test(integrationTest('Association View'), async () => {
  await openElementFromExplorerTree('ui::TestAssociation', renderResult);
  const editPanelHeader = renderResult.getByTestId(
    CORE_TEST_ID.EDIT_PANEL__HEADER_TABS,
  );
  expect(getByText(editPanelHeader, 'TestAssociation')).not.toBeNull();
  const associationEditor = renderResult.getByTestId(
    CORE_TEST_ID.ASSOCIATION_EDITOR,
  );
  const properties = ['testClassProp', 'testClassSibling'];
  // input fields for association property name are present
  properties.forEach((t) =>
    expect(getByDisplayValue(associationEditor, t)).not.toBeNull(),
  );
  // Tagged Values
  fireEvent.click(getByText(associationEditor, 'Tagged Values'));
  await waitFor(() => getByText(associationEditor, 'ProfileTest'));
  getByDisplayValue(associationEditor, 'Association Tag');
  // Steretypes
  fireEvent.click(getByText(associationEditor, 'Stereotypes'));
  await waitFor(() => getByText(associationEditor, 'stereotype2'));
  // Back to properties
  fireEvent.click(getByText(associationEditor, 'Properties'));
  await waitFor(() => getByDisplayValue(associationEditor, 'testClassProp'));
  const inputA = getByDisplayValue(associationEditor, 'testClassProp');
  const propertyTypeA = inputA.parentElement as HTMLElement;
  fireEvent.change(inputA, { target: { value: 'random' } });
  await waitFor(() => getByDisplayValue(associationEditor, 'random'));
  expect(getAllByDisplayValue(propertyTypeA, '1')).toHaveLength(2);
  expect(getByText(propertyTypeA, 'TestClass')).not.toBeNull();
  expect(getAllByRole(propertyTypeA, 'button')).toHaveLength(2);
  // sub panel property
  const inputB = getByDisplayValue(associationEditor, 'testClassSibling');
  const propertyTypeB = inputB.parentElement as HTMLElement;
  const buttons = getAllByRole(propertyTypeB, 'button');
  expect(buttons).toHaveLength(2);
  expect(queryByDisplayValue(associationEditor, 'ProfileTest')).toBeNull();
  const navigateToPropertyButton = buttons[1];
  fireEvent.click(navigateToPropertyButton);
  await waitFor(() => getByText(associationEditor, 'property'));
  const subPropertyPanel = getByTestId(associationEditor, CORE_TEST_ID.PANEL);
  getByDisplayValue(subPropertyPanel, 'association tag');
  fireEvent.click(getByText(subPropertyPanel, 'Stereotypes'));
  await waitFor(() => getByText(subPropertyPanel, 'stereotype1'));
  const deleteSubPanelButton = queryAllByRole(subPropertyPanel, 'button')[0];
  fireEvent.click(deleteSubPanelButton);
});
