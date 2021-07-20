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
  waitFor,
  fireEvent,
  getByText,
  getByPlaceholderText,
} from '@testing-library/react';
import { integrationTest, toTitleCase } from '@finos/legend-studio-shared';
import {
  getMockedEditorStore,
  setUpEditorWithDefaultSDLCData,
} from '../../../ComponentTestUtils';
import { CORE_TEST_ID } from '../../../../const';
import type { EditorStore } from '../../../../stores/EditorStore';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElement';

const addRootPackage = (packagePath: string, result: RenderResult): void => {
  fireEvent.click(result.getByTitle('New Element...', { exact: false }));
  const contextMenu = result.getByRole('menu');
  fireEvent.click(getByText(contextMenu, 'New Package...'));
  const modal = result.getByTestId(CORE_TEST_ID.NEW_ELEMENT_MODAL);
  const packageInput = getByPlaceholderText(modal, 'Enter a name', {
    exact: false,
  });
  fireEvent.change(packageInput, { target: { value: packagePath } });
  fireEvent.click(getByText(modal, 'Create'));
};

const createNewElementOnRootPackage = (
  rootPackage: string,
  elementType: PACKAGEABLE_ELEMENT_TYPE,
  result: RenderResult,
  elementName?: string,
): void => {
  const packageExplorer = result.getByTestId(CORE_TEST_ID.EXPLORER_TREES);
  const rootPackageDiv = getByText(packageExplorer, rootPackage);
  const rightClick = { button: 2 };
  fireEvent.click(rootPackageDiv, rightClick);
  fireEvent.click(
    result.getByText(`New ${toTitleCase(elementType.toLowerCase())}...`),
  );
  const modal = result.getByTestId(CORE_TEST_ID.NEW_ELEMENT_MODAL);
  const elementInput = getByPlaceholderText(modal, 'Enter a name', {
    exact: false,
  });
  const inputValue = elementName ?? `${elementType}Test`;
  fireEvent.change(elementInput, { target: { value: inputValue } });
  fireEvent.click(getByText(modal, 'Create'));
  getByText(packageExplorer, inputValue);
};

let renderResult: RenderResult;
let mockedEditorStore: EditorStore;

beforeEach(async () => {
  mockedEditorStore = getMockedEditorStore();
  renderResult = await setUpEditorWithDefaultSDLCData(mockedEditorStore);
});

test(
  integrationTest('Model loader shows up if no elements in graph'),
  async () => {
    const packageExplorer = renderResult.getByTestId(
      CORE_TEST_ID.EXPLORER_TREES,
    );
    getByText(packageExplorer, 'Open Model Loader');
    // TODO
  },
);

// TODO: add connection, runtime, text, etc.
test(integrationTest('Create elements with no drivers'), async () => {
  const ROOT_PACKAGE_NAME = 'model';
  addRootPackage(ROOT_PACKAGE_NAME, renderResult);
  createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.PROFILE,
    renderResult,
    'ProfileExtension',
  );
  createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.ENUMERATION,
    renderResult,
    'MyEnumeration',
  );
  createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.CLASS,
    renderResult,
    'Person',
  );
  createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.MAPPING,
    renderResult,
    'MyMapping',
  );
  createNewElementOnRootPackage(
    ROOT_PACKAGE_NAME,
    PACKAGEABLE_ELEMENT_TYPE.SERVICE,
    renderResult,
    'MyService',
  );
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.graph.getProfile(
        `${ROOT_PACKAGE_NAME}::ProfileExtension`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.graph.getEnumeration(
        `${ROOT_PACKAGE_NAME}::MyEnumeration`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.graph.getClass(
        `${ROOT_PACKAGE_NAME}::Person`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.graph.getMapping(
        `${ROOT_PACKAGE_NAME}::MyMapping`,
      ),
    ).toBeDefined(),
  );
  await waitFor(() =>
    expect(
      mockedEditorStore.graphState.graph.getService(
        `${ROOT_PACKAGE_NAME}::MyService`,
      ),
    ).toBeDefined(),
  );
  expect(renderResult.queryByText('system')).toBeTruthy();
  expect(renderResult.queryByText('config')).toBeTruthy();
});
