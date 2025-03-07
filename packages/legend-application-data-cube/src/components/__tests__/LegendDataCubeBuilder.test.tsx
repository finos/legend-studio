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

import { integrationTest } from '@finos/legend-shared/test';
import { expect, jest, test } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/dom';
import {
  TEST__provideMockedLegendDataCubeBuilderStore,
  TEST__setUpDataCubeBuilder,
} from '../__test-utils__/LegendDataCubeStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { MockedMonacoEditorAPI } from '@finos/legend-lego/code-editor/test';
import { PersistentDataCube, V1_Query } from '@finos/legend-graph';
import depotEntities from './TEST_DATA__DSL_DataSpace_Entities.json' with { type: 'json' };

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
  await screen.findByText('test-data-cube-id-query-name');
  expect((await screen.findAllByText('Id')).length).toBeGreaterThanOrEqual(1);
  await screen.findAllByText('Case Type');
  await screen.findByText('1', {}, { timeout: 5000 });
  await screen.findByText('Active');
  await screen.findByText('2');
  await screen.findByText('Confirmed');
});
