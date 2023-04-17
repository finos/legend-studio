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

import { test, expect } from '@jest/globals';
import { render, waitFor } from '@testing-library/react';
import { WorkspaceSetup } from '../WorkspaceSetup.js';
import { createSpy, integrationTest } from '@finos/legend-shared';
import { TEST_DATA__DefaultSDLCInfo } from '../../editor/__test-utils__/EditorComponentTestUtils.js';
import {
  ApplicationStoreProvider,
  TEST__BrowserEnvironmentProvider,
} from '@finos/legend-application';
import { LegendStudioFrameworkProvider } from '../../LegendStudioFrameworkProvider.js';
import { TEST__provideMockedLegendStudioBaseStore } from '../../__test-utils__/LegendStudioFrameworkTestUtils.js';

test(integrationTest('Shows project searcher properly'), async () => {
  const baseStore = TEST__provideMockedLegendStudioBaseStore();

  createSpy(baseStore.sdlcServerClient, 'getProjects')
    .mockResolvedValueOnce([TEST_DATA__DefaultSDLCInfo.project])
    .mockResolvedValueOnce([]);

  const { queryByText } = render(
    <ApplicationStoreProvider store={baseStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider>
        <LegendStudioFrameworkProvider>
          <WorkspaceSetup />
        </LegendStudioFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );

  // NOTE: react-select does not seem to produce a normal input box where we could set the placeholder attribute
  // as such, we cannot use `queryByPlaceholderText` but use `queryByText` instead
  await waitFor(() =>
    expect(queryByText('Search for project...')).not.toBeNull(),
  );
});
