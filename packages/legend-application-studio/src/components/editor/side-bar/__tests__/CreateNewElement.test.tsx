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

import { test, beforeEach, expect } from '@jest/globals';
import {
  type RenderResult,
  waitFor,
  fireEvent,
  getByText,
  getByPlaceholderText,
  act,
  findByText,
} from '@testing-library/react';
import { toTitleCase } from '@finos/legend-shared';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../../../stores/editor/utils/ModelClassifierUtils.js';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { CUSTOM_LABEL } from '../../../../stores/editor/NewElementState.js';

const addRootPackage = async (
  packagePath: string,
  result: RenderResult,
): Promise<void> => {
  fireEvent.click(result.getByTitle('New Element...', { exact: false }));
  const contextMenu = await waitFor(() => result.getByRole('menu'));
  fireEvent.click(getByText(contextMenu, 'Package'));
  const modal = result.getByTestId(LEGEND_STUDIO_TEST_ID.NEW_ELEMENT_MODAL);
  const packageInput = getByPlaceholderText(modal, 'Enter a name', {
    exact: false,
  });
  fireEvent.change(packageInput, { target: { value: packagePath } });
  await act(async () => {
    fireEvent.click(getByText(modal, 'Create'));
  });
};

const createNewElementOnRootPackage = async (
  pkg: string,
  elementType: PACKAGEABLE_ELEMENT_TYPE,
  result: RenderResult,
  elementName?: string,
): Promise<void> => {
  const packageExplorer = result.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  const pkgContainer = getByText(packageExplorer, pkg);
  fireEvent.contextMenu(pkgContainer);
  const contextMenu = await waitFor(() => result.getByRole('menu'));
  fireEvent.click(
    getByText(contextMenu, `${toTitleCase(elementType.toLowerCase())}`),
  );
  const modal = result.getByTestId(LEGEND_STUDIO_TEST_ID.NEW_ELEMENT_MODAL);
  const elementInput = getByPlaceholderText(modal, 'Enter a name', {
    exact: false,
  });
  const inputValue = elementName ?? `${elementType}Test`;
  fireEvent.change(elementInput, { target: { value: inputValue } });
  await act(async () => {
    fireEvent.click(getByText(modal, 'Create'));
  });
  getByText(packageExplorer, inputValue);
};

let renderResult: RenderResult;
let MOCK__editorStore: EditorStore;

beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore);
});

test(
  integrationTest('Model Importer shows up if no elements in graph'),
  async () => {
    const packageExplorer = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
    );
    getByText(packageExplorer, 'Open Model Importer');
    // TODO
  },
);

// TODO: add connection, runtime, text, etc.
test(integrationTest('Create elements with no drivers'), async () => {
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
  const ROOT_PACKAGE_NAME = 'model';
  await addRootPackage(ROOT_PACKAGE_NAME, renderResult);
  await createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.PROFILE,
    renderResult,
    'ProfileExtension',
  );
  await createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
    renderResult,
    'MyEnumeration',
  );
  await createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.CLASS,
    renderResult,
    'Person',
  );
  await createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.MAPPING,
    renderResult,
    'MyMapping',
  );
  await createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.SERVICE,
    renderResult,
    'MyService',
  );
  await waitFor(() =>
    expect(
      MOCK__editorStore.graphManagerState.graph.getProfile(
        `${ROOT_PACKAGE_NAME}::ProfileExtension`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      MOCK__editorStore.graphManagerState.graph.getEnumeration(
        `${ROOT_PACKAGE_NAME}::MyEnumeration`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      MOCK__editorStore.graphManagerState.graph.getClass(
        `${ROOT_PACKAGE_NAME}::Person`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      MOCK__editorStore.graphManagerState.graph.getMapping(
        `${ROOT_PACKAGE_NAME}::MyMapping`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      MOCK__editorStore.graphManagerState.graph.getService(
        `${ROOT_PACKAGE_NAME}::MyService`,
      ),
    ).toBeDefined(),
  );
  expect(renderResult.queryByText('system')).toBeTruthy();
  expect(renderResult.queryByText('config')).toBeTruthy();
});

test(integrationTest('Create a service'), async () => {
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
  const ROOT_PACKAGE_NAME = 'model';
  await addRootPackage(ROOT_PACKAGE_NAME, renderResult);
  await createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.MAPPING,
    renderResult,
    'MyMapping',
  );
  const packageExplorer = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EXPLORER_TREES,
  );
  fireEvent.click(getByText(packageExplorer, 'MyMapping'));
  fireEvent.click(renderResult.getByTitle('New Element... (Ctrl + Shift + N)'));
  const contextMenu = await waitFor(() => renderResult.getByRole('menu'));
  fireEvent.click(getByText(contextMenu, 'Service'));
  const dialog = await waitFor(() => renderResult.getByRole('dialog'));
  await waitFor(() => findByText(dialog, 'Mapping'));
  await waitFor(() => findByText(dialog, 'MyMapping'));
  await waitFor(() => findByText(dialog, 'Runtime'));
  await waitFor(() => findByText(dialog, CUSTOM_LABEL));
  const elementInput = getByPlaceholderText(dialog, 'Enter a name', {
    exact: false,
  });
  fireEvent.change(elementInput, { target: { value: 'MyService' } });
  await act(async () => {
    fireEvent.click(getByText(dialog, 'Create'));
  });
  getByText(packageExplorer, 'MyService');
  await waitFor(() => renderResult.getByTitle('Run Query'));
  await waitFor(() => renderResult.getByText('model::MyMapping'));
  await waitFor(() => renderResult.getByText(CUSTOM_LABEL));
});
