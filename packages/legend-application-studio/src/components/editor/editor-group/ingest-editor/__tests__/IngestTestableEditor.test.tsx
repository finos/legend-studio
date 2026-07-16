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

import { test, expect, jest } from '@jest/globals';
import {
  findByPlaceholderText,
  findByRole,
  findByText,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared/test';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../__test-utils__/EditorComponentTestUtils.js';
import { LEGEND_STUDIO_TEST_ID } from '../../../../../__lib__/LegendStudioTesting.js';
import TEST_DATA__IngestTestable from './TEST_DATA__IngestTestable.json' with { type: 'json' };

jest.mock('@finos/legend-lego/code-editor', () => ({
  CodeEditor: () => null,
}));

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

test(integrationTest('Create ingest test suite from testing tab'), async () => {
  const editorStore = TEST__provideMockedEditorStore();
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA__IngestTestable,
  });

  await TEST__openElementFromExplorerTree(
    'ingest::MatViewIngest',
    renderResult,
  );

  const editorGroup = await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.EDITOR_GROUP),
  );

  fireEvent.click(await findByText(editorGroup, 'Testing'));
  await findByText(editorGroup, 'Add Test Suite');

  fireEvent.click(
    await findByRole(editorGroup, 'button', { name: 'Add Test Suite' }),
  );

  const dialog = await renderResult.findByRole('dialog');
  const testNameInput = await findByPlaceholderText(dialog, 'e.g. test_1');

  fireEvent.change(testNameInput, { target: { value: 'test_1' } });
  fireEvent.click(await findByText(dialog, 'Create'));

  await waitFor(() => {
    expect(within(editorGroup).getByText('suite_1')).toBeDefined();
    expect(within(editorGroup).getByText('test_1')).toBeDefined();
  });
});
