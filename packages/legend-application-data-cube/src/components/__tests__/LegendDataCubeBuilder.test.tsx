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
import { expect, jest, test } from '@jest/globals';
import {
  fireEvent,
  getAllByTitle,
  getByRole,
  getByText,
  queryByText,
  screen,
} from '@testing-library/dom';
import {
  TEST__provideMockedLegendDataCubeBuilderStore,
  TEST__setUpDataCubeBuilder,
} from '../__test-utils__/LegendDataCubeStoreTestUtils.js';
import { type PlainObject, guaranteeNonNullable } from '@finos/legend-shared';
import { MockedMonacoEditorAPI } from '@finos/legend-lego/code-editor/test';
import {
  type V1_Lambda,
  PersistentDataCube,
  V1_Query,
} from '@finos/legend-graph';
import depotEntities from './TEST_DATA__DSL_DataSpace_Entities.json' with { type: 'json' };
import { LegendDataCubePluginManager } from '../../application/LegendDataCubePluginManager.js';
import {
  ApplicationStore,
  type VersionReleaseNotes,
} from '@finos/legend-application';
import { TEST__getTestLegendDataCubeApplicationConfig } from '../../application/__test-utils__/LegendDataCubeApplicationTestUtils.js';
import { ENGINE_TEST_SUPPORT__JSONToGrammar_lambda } from '@finos/legend-graph/test';

// Mock the LegendDataCubeDuckDBEngine module because it causes
// problems when running in the jest environment.
jest.mock('../../stores/LegendDataCubeDuckDBEngine', () => {
  return {
    LegendDataCubeDuckDBEngine: jest.fn(() => ({
      initialize: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

test(
  integrationTest('Load DataCube window appears on first load'),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);
    await screen.findByPlaceholderText('Search for DataCube(s) by name or ID');
  },
);

test(
  integrationTest('New DataCube window appears on button click'),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);
    await screen.findByPlaceholderText('Search for DataCube(s) by name or ID');
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    fireEvent.click(
      guaranteeNonNullable(
        (await screen.findAllByRole('button', { name: 'New DataCube' }))[0],
      ),
    );
    await screen.findByText('Choose Source Type:');
  },
);

test(integrationTest('Loads DataCube from Legend Query'), async () => {
  MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

  const mockDataCubeId = 'test-data-cube-id';
  const mockDataCube: PersistentDataCube =
    PersistentDataCube.serialization.fromJson({
      id: mockDataCubeId,
      name: `${mockDataCubeId}-name`,
      description: undefined,
      content: {
        query: `select(~[Id, 'Case Type'])`,
        source: {
          queryId: `${mockDataCubeId}-query-id`,
          _type: 'legendQuery',
        },
        configuration: {
          name: `${mockDataCubeId}-query-name`,
          columns: [
            { name: 'Id', type: 'Integer' },
            { name: 'Case Type', type: 'String' },
          ],
        },
      },
    });
  const mockQuery: V1_Query = V1_Query.serialization.fromJson({
    name: `${mockDataCubeId}-query-name`,
    id: `${mockDataCubeId}-query-id`,
    versionId: 'latest',
    groupId: 'com.legend',
    artifactId: 'test-project',
    content: `|domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])`,
    executionContext: {
      dataSpacePath: 'domain::COVIDDatapace',
      executionKey: 'dummyContext',
      _type: 'dataSpaceExecutionContext',
    },
  });
  const mockedLegendDataCubeBuilderStore =
    await TEST__provideMockedLegendDataCubeBuilderStore();
  await TEST__setUpDataCubeBuilder(
    guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
    mockDataCube,
    mockQuery,
    depotEntities,
  );
  await screen.findByText(
    'test-data-cube-id-query-name',
    {},
    { timeout: 30000 },
  );
  expect(
    (await screen.findAllByText('Id', {}, { timeout: 30000 })).length,
  ).toBeGreaterThanOrEqual(1);
  await screen.findByText('Case Type', {}, { timeout: 30000 });
  await screen.findByText('1', {}, { timeout: 30000 });
  await screen.findByText('Active', {}, { timeout: 30000 });
  await screen.findByText('2', {}, { timeout: 30000 });
  await screen.findByText('Confirmed', {}, { timeout: 30000 });
});

test(
  integrationTest('Loads DataCube from Legend Query with multi-line lambda'),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `{|let date = now(); domain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType]);}`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();

    await TEST__setUpDataCubeBuilder(
      mockedLegendDataCubeBuilderStore,
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Verify grid renders
    await screen.findByText(
      'test-data-cube-id-query-name',
      {},
      { timeout: 30000 },
    );
    expect(
      (await screen.findAllByText('Id', {}, { timeout: 30000 })).length,
    ).toBeGreaterThanOrEqual(1);
    await screen.findByText('Case Type', {}, { timeout: 30000 });
    await screen.findByText('1', {}, { timeout: 30000 });
    await screen.findByText('Active', {}, { timeout: 30000 });
    await screen.findByText('2', {}, { timeout: 30000 });
    await screen.findByText('Confirmed', {}, { timeout: 30000 });

    // Verify runQuery was called with correct lambda
    const runQueryCall = guaranteeNonNullable(
      (
        mockedLegendDataCubeBuilderStore.engineServerClient
          .runQuery as unknown as jest.SpiedFunction<
          typeof mockedLegendDataCubeBuilderStore.engineServerClient.runQuery
        >
      ).mock.lastCall,
    );
    const lambdaGrammar = await ENGINE_TEST_SUPPORT__JSONToGrammar_lambda(
      runQueryCall[0].function as PlainObject<V1_Lambda>,
    );
    expect(lambdaGrammar).toBe(
      "{|\nlet date = now();\ndomain::COVIDData.all()->project(~[Id:x|$x.id, 'Case Type':x|$x.caseType])->select(~[Id, 'Case Type'])->slice(0, 500)->meta::pure::mapping::from(mapping::CovidDataMapping, runtime::H2Runtime);\n}",
    );
  },
  100000,
);

test(
  integrationTest(
    'Automatically converts TDS query to Relation query when loading DataCube from Legend Query',
  ),
  async () => {
    MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);

    const mockDataCubeId = 'test-data-cube-id';
    const mockDataCube: PersistentDataCube =
      PersistentDataCube.serialization.fromJson({
        id: mockDataCubeId,
        name: `${mockDataCubeId}-name`,
        description: undefined,
        content: {
          query: `select(~[Id, 'Case Type'])`,
          source: {
            queryId: `${mockDataCubeId}-query-id`,
            _type: 'legendQuery',
          },
          configuration: {
            name: `${mockDataCubeId}-query-name`,
            columns: [
              { name: 'Id', type: 'Integer' },
              { name: 'Case Type', type: 'String' },
            ],
          },
        },
      });
    const mockQuery: V1_Query = V1_Query.serialization.fromJson({
      name: `${mockDataCubeId}-query-name`,
      id: `${mockDataCubeId}-query-id`,
      versionId: 'latest',
      groupId: 'com.legend',
      artifactId: 'test-project',
      content: `|domain::COVIDData.all()->project([x|$x.id,x|$x.caseType],['Id','Case Type'])`,
      executionContext: {
        dataSpacePath: 'domain::COVIDDatapace',
        executionKey: 'dummyContext',
        _type: 'dataSpaceExecutionContext',
      },
    });
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();

    await TEST__setUpDataCubeBuilder(
      mockedLegendDataCubeBuilderStore,
      mockDataCube,
      mockQuery,
      depotEntities,
    );

    // Verify grid renders
    await screen.findByText(
      'test-data-cube-id-query-name',
      {},
      { timeout: 30000 },
    );
    expect(
      (await screen.findAllByText('Id', {}, { timeout: 30000 })).length,
    ).toBeGreaterThanOrEqual(1);
    await screen.findByText('Case Type', {}, { timeout: 30000 });
    await screen.findByText('1', {}, { timeout: 30000 });
    await screen.findByText('Active', {}, { timeout: 30000 });
    await screen.findByText('2', {}, { timeout: 30000 });
    await screen.findByText('Confirmed', {}, { timeout: 30000 });

    // Verify runQuery was called with correct lambda
    const runQueryCall = guaranteeNonNullable(
      (
        mockedLegendDataCubeBuilderStore.engineServerClient
          .runQuery as unknown as jest.SpiedFunction<
          typeof mockedLegendDataCubeBuilderStore.engineServerClient.runQuery
        >
      ).mock.lastCall,
    );
    const lambdaGrammar = await ENGINE_TEST_SUPPORT__JSONToGrammar_lambda(
      runQueryCall[0].function as PlainObject<V1_Lambda>,
    );
    expect(lambdaGrammar).toBe(
      "|domain::COVIDData.all()->project(~[Id:x: domain::COVIDData[1]|$x.id, 'Case Type':x: domain::COVIDData[1]|$x.caseType])->select(~[Id, 'Case Type'])->slice(0, 500)->meta::pure::mapping::from(mapping::CovidDataMapping, runtime::H2Runtime)",
    );
  },
  100000,
);

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
    'Legend DataCube shows Release Updates from last viewed version',
  ),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('1.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    const windowHeader = guaranteeNonNullable(
      (await screen.findByText('Release Notes')).parentElement,
    );
    const releaseDialog = guaranteeNonNullable(windowHeader.parentElement);
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

    fireEvent.click(getByRole(windowHeader, 'button'));
    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);

test(
  integrationTest('Legend DataCube does not show viewed release notes'),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('2.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    const windowHeader = guaranteeNonNullable(
      (await screen.findByText('Release Notes')).parentElement,
    );
    const releaseDialog = guaranteeNonNullable(windowHeader.parentElement);
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

    fireEvent.click(getByRole(windowHeader, 'button'));
    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);

test(
  integrationTest(
    'Legend DataCube does not render release updates if latest version has been viewed',
  ),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    const MOCK__lastOpenedVersion = createMock();
    appStore.releaseNotesService.getViewedVersion = MOCK__lastOpenedVersion;
    MOCK__lastOpenedVersion.mockReturnValue('3.0.0');
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);

test(
  integrationTest(
    'Legend DataCube does not render release updates for new users',
  ),
  async () => {
    const pluginManager = LegendDataCubePluginManager.create();
    const appStore = new ApplicationStore(
      TEST__getTestLegendDataCubeApplicationConfig(),
      pluginManager,
    );
    appStore.releaseNotesService.configure(releaseLog as VersionReleaseNotes[]);
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore({
        applicationStore: appStore,
      });
    await TEST__setUpDataCubeBuilder(mockedLegendDataCubeBuilderStore);

    expect(screen.queryByText('Release Notes')).toBeNull();
  },
);
