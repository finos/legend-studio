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

import { test, beforeEach } from '@jest/globals';
import { fireEvent, type RenderResult, waitFor } from '@testing-library/react';
import { integrationTest } from '@finos/legend-shared';
import {
  TEST__openElementFromExplorerTree,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../../EditorComponentTestUtils.js';
import { TEST_DATA__multiEXecutionService } from './TEST_DATA__ServiceEditor.js';

let renderResult: RenderResult;

beforeEach(async () => {
  const MOCK__editorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(MOCK__editorStore, {
    entities: TEST_DATA__multiEXecutionService,
  });
});

// TODO: fix issue with monaco not reading lambda value. probably need to mock jsonToGrammar result
test.skip(integrationTest('Service Multi Execution Editor'), async () => {
  await TEST__openElementFromExplorerTree(
    'testModelStoreTestSuites::service::DocM2MService',
    renderResult,
  );
  await waitFor(() => renderResult.getByText('Service to test refiner flow'));
  await waitFor(() => renderResult.getByText('dummy1'));
  await waitFor(() => renderResult.getByText('dummy'));
  fireEvent.click(renderResult.getByText('Execution'));
  // TODO: fix issue with monaco not reading value
  await waitFor(() => renderResult.getByText('Execution Contexts'));
  await waitFor(() => renderResult.getByText('env'));
  await waitFor(() => renderResult.getByText('QA'));
  await waitFor(() =>
    renderResult.getByText('testModelStoreTestSuites::runtime::DocM2MRuntime'),
  );
  await waitFor(() => renderResult.getByText('UAT'));
  fireEvent.click(renderResult.getByText('UAT'));
  await waitFor(() =>
    renderResult.getByText('testModelStoreTestSuites::runtime::DocM2MRuntime3'),
  );
});
