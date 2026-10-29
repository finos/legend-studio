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

import { test, expect, beforeEach } from '@jest/globals';
import {
  type RenderResult,
  getByDisplayValue,
  waitFor,
  fireEvent,
  getByText,
  getByTitle,
  queryByText,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../__test-utils__/EditorComponentTestUtils.js';
import { TEST_DATA__EmptyProjectDependencyReport } from './TEST_DATA__ProjectDependencyReport.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../__lib__/LegendStudioTesting.js';
import type { EditorStore } from '../../../../stores/editor/EditorStore.js';

let renderResult: RenderResult;

const TEST_DATA__ProjectConfiguration = {
  projectStructureVersion: { version: 10, extensionVersion: 1 },
  projectId: 'PROD-1234',
  groupId: 'org.finos.legend',
  artifactId: 'dependency-test',
  projectDependencies: [],
  metamodelDependencies: [],
};

const TEST_DATA__latestProjectStructure = { version: 11, extensionVersion: 1 };

let MOCK__editorStore: EditorStore;
beforeEach(async () => {
  MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: [],
    projectConfiguration: TEST_DATA__ProjectConfiguration,
    latestProjectStructureVersion: TEST_DATA__latestProjectStructure,
    projectDependencyReport: TEST_DATA__EmptyProjectDependencyReport,
  });
  fireEvent.click(renderResult.getByTitle('Project Configuration Panel'));
  const editorGroupContent = await renderResult.findByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  const updateButton = getByText(editorGroupContent, 'Update configuration');
  expect(updateButton.getAttribute('disabled')).not.toBeNull();
  await waitFor(() => renderResult.getByText('Project Structure'));
});

test(integrationTest('Test Project Structure'), async () => {
  const editorGroupContent = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
  );
  await waitFor(() => getByText(editorGroupContent, '10.1'));
  await waitFor(() => getByText(editorGroupContent, '11.1 available'));
  await waitFor(() => getByText(editorGroupContent, 'Update to 11.1'));
  await waitFor(() =>
    getByDisplayValue(editorGroupContent, 'org.finos.legend'),
  );
  await waitFor(() => getByDisplayValue(editorGroupContent, 'dependency-test'));
  // the coordinates the project is published as
  getByText(editorGroupContent, 'org.finos.legend:dependency-test');
  // TODO: test update project structure
});

test(
  integrationTest(
    'Changing the coordinates warns about the impact and enables saving',
  ),
  async () => {
    const editorGroupContent = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.EDITOR_GROUP_CONTENT,
    );
    expect(
      queryByText(editorGroupContent, /Changing the coordinates/),
    ).toBeNull();
    expect(
      queryByText(editorGroupContent, 'Unsaved configuration changes'),
    ).toBeNull();

    fireEvent.change(getByTitle(editorGroupContent, 'Group ID'), {
      target: { value: 'org.finos.legend.v2' },
    });

    await waitFor(() =>
      getByText(editorGroupContent, /Changing the coordinates/),
    );
    getByText(editorGroupContent, 'org.finos.legend.v2:dependency-test');
    getByText(editorGroupContent, 'Unsaved configuration changes');
    expect(
      getByText(editorGroupContent, 'Update configuration').getAttribute(
        'disabled',
      ),
    ).toBeNull();
  },
);
