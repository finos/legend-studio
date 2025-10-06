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

import { createMock, integrationTest } from '@finos/legend-shared/test';
import {
  TEST_QUERY_NAME,
  TEST__provideMockedQueryEditorStore,
  TEST__setUpQueryEditor,
} from '../__test-utils__/QueryEditorComponentTestUtils.js';
import { expect, test } from '@jest/globals';
import {
  ApplicationStore,
  type VersionReleaseNotes,
} from '@finos/legend-application';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import {
  TEST_DATA__ResultState_entities,
  TEST_DATA__modelCoverageAnalysisResult,
} from './TEST_DATA__QueryBuilder_ResultStateTest.js';
import { stub_RawLambda } from '@finos/legend-graph';
import {
  fireEvent,
  getAllByTitle,
  getByText,
  queryByText,
  waitFor,
} from '@testing-library/react';

const releaseLog = [
  {
    version: '3.0.0',
    notes: [
      {
        type: 'ENHANCEMENT',
        description:
          'This is a test description for enhancement 1 version 3.0.0',
        docLink: 'https://github.com/finos/legend-engine',
      },

      {
        type: 'ENHANCEMENT',
        description: 'This is a test description for enhancement 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
      {
        type: 'BUG_FIX',
        description: 'This is a bug description for bug fix 1',
      },
      {
        type: 'BUG_FIX',
        description: 'This is a bug description for bug fix 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
    ],
  },
  {
    version: '2.0.0',
    notes: [
      {
        type: 'ENHANCEMENT',
        description: 'This is a test description for enhancement 1',
        docLink: 'https://github.com/finos/legend-engine',
      },
      {
        type: 'ENHANCEMENT',
        description: 'This is a test description for enhancement 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
      {
        type: 'BUG_FIX',
        description:
          'This is a bug description for bug fix for version 2.0.0 bug 1',
      },
      {
        type: 'BUG_FIX',
        description:
          'This is a bug description for bug fix for version 2.0.0 bug 2',
        docLink: 'https://github.com/finos/legend-engine',
      },
    ],
  },
];

test(
  integrationTest(
    'Legend Query shows Release Updates from last Viewed Version',
  ),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();

    const appStore = new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('1.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore({
      applicationStore: appStore,
    });
    mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedQueryEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );
    expect(
      renderResult.queryByText('Class is required to build query'),
    ).toBeNull();
    const releaseDialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(
      getByText(releaseDialog, 'Legend Query Has Been Upgraded!'),
    ).not.toBeNull();
    expect(
      getByText(
        releaseDialog,
        'New features, enhancements and bug fixes that were released',
      ),
    ).not.toBeNull();
    expect(
      getByText(releaseDialog, 'This is a bug description for bug fix 1'),
    ).not.toBeNull();
    expect(
      getByText(
        releaseDialog,
        'This is a test description for enhancement 1 version 3.0.0',
      ),
    ).not.toBeNull();

    expect(getByText(releaseDialog, 'Version 2.0.0')).not.toBeNull();
    expect(getByText(releaseDialog, 'Version 3.0.0')).not.toBeNull();

    expect(getAllByTitle(releaseDialog, 'Visit...')).toHaveLength(6);

    fireEvent.click(getByText(releaseDialog, 'Close'));
    expect(renderResult.queryByText('dialog')).toBeNull();
  },
);

test(
  integrationTest('Legend Query does not show viewed release notes'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();

    const appStore = new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('2.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore({
      applicationStore: appStore,
    });
    mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedQueryEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );
    expect(
      renderResult.queryByText('Class is required to build query'),
    ).toBeNull();
    const releaseDialog = await waitFor(() => renderResult.getByRole('dialog'));
    expect(
      getByText(releaseDialog, 'Legend Query Has Been Upgraded!'),
    ).not.toBeNull();
    expect(
      getByText(
        releaseDialog,
        'New features, enhancements and bug fixes that were released',
      ),
    ).not.toBeNull();
    expect(
      getByText(releaseDialog, 'This is a bug description for bug fix 1'),
    ).not.toBeNull();
    expect(
      getByText(
        releaseDialog,
        'This is a test description for enhancement 1 version 3.0.0',
      ),
    ).not.toBeNull();

    expect(queryByText(releaseDialog, 'Version 2.0.0')).toBeNull();
    expect(queryByText(releaseDialog, 'Version 3.0.0')).not.toBeNull();

    expect(getAllByTitle(releaseDialog, 'Visit...')).toHaveLength(3);

    fireEvent.click(getByText(releaseDialog, 'Close'));
    expect(renderResult.queryByText('dialog')).toBeNull();
  },
);

test(
  integrationTest('Legend Query does not render release updates for new users'),
  async () => {
    const pluginManager = LegendQueryPluginManager.create();

    const appStore = new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig(),
      pluginManager,
    );
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedQueryEditorStore = TEST__provideMockedQueryEditorStore({
      applicationStore: appStore,
    });
    mockedQueryEditorStore.setExistingQueryName(TEST_QUERY_NAME);

    const { renderResult } = await TEST__setUpQueryEditor(
      mockedQueryEditorStore,
      TEST_DATA__ResultState_entities,
      stub_RawLambda(),
      'execution::RelationalMapping',
      'execution::Runtime',
      TEST_DATA__modelCoverageAnalysisResult,
    );
    expect(renderResult.queryByRole('dialog')).toBeNull();
  },
);
