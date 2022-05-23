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
import { integrationTest } from '@finos/legend-shared';
import {
  type RenderResult,
  getByText,
  fireEvent,
} from '@testing-library/react';
import type { EditorStore } from '../../../../../stores/EditorStore';
import {
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
} from '../../../../EditorComponentTestUtils';
import { LEGEND_STUDIO_TEST_ID } from '../../../../LegendStudioTestID';
import { TEST_DATA__RelationalServiceTestable } from './TEST_DATA__TestableData';

let renderResult: RenderResult;
let mockedEditorStore: EditorStore;

beforeEach(async () => {
  mockedEditorStore = TEST__provideMockedEditorStore();
  renderResult = await TEST__setUpEditorWithDefaultSDLCData(mockedEditorStore, {
    entities: TEST_DATA__RelationalServiceTestable,
  });
});

test.skip(
  integrationTest('Test navigation on gloabl test runner explorer'),
  async () => {
    const globalTestRunnerButton =
      renderResult.getByTitle('Global Test Runner');
    fireEvent.click(globalTestRunnerButton);
    const globalTestRunner = renderResult.getByTestId(
      LEGEND_STUDIO_TEST_ID.GLOBAL_TEST_RUNNER,
    );
    // open service nodes
    fireEvent.click(getByText(globalTestRunner, 'MyErroredService'));
    fireEvent.click(getByText(globalTestRunner, 'errorSuite'));
    fireEvent.click(getByText(globalTestRunner, 'errorTest'));
    getByText(globalTestRunner, 'shouldErrorOut');
    fireEvent.click(getByText(globalTestRunner, 'MySuccessfulService'));
    fireEvent.click(getByText(globalTestRunner, 'successfulSuite'));
    fireEvent.click(getByText(globalTestRunner, 'successfulTest'));
    getByText(globalTestRunner, 'successfulAssert');
    fireEvent.click(getByText(globalTestRunner, 'MyFailedService'));
    fireEvent.click(getByText(globalTestRunner, 'failedSuite'));
    fireEvent.click(getByText(globalTestRunner, 'failedTest'));
    getByText(globalTestRunner, 'shouldPass');
    getByText(globalTestRunner, 'shouldFail');
  },
);
