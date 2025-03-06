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
import { jest, test } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/dom';
import {
  TEST__provideMockedLegendDataCubeBuilderStore,
  TEST__setUpDataCubeBuilder,
} from '../__test-utils__/LegendDataCubeStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { MockedMonacoEditorAPI } from '@finos/legend-lego/code-editor/test';

// Mock the LegendDataCubeDuckDBEngine module because it causes
// problems when running in the jest environment.
jest.mock('../../stores/LegendDataCubeDuckDBEngine', () => {
  return {
    LegendDataCubeDuckDBEngine: jest.fn(),
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
        (await screen.findAllByRole('button', { name: 'New DataCube' }))?.[0],
      ),
    );
    await screen.findByText('Choose Source Type:');
  },
);

test(integrationTest('Loads DataCube from Legend Query'), async () => {
  MockedMonacoEditorAPI.remeasureFonts.mockReturnValue(undefined);
  const mockedLegendDataCubeBuilderStore =
    await TEST__provideMockedLegendDataCubeBuilderStore();
  await TEST__setUpDataCubeBuilder(
    guaranteeNonNullable(mockedLegendDataCubeBuilderStore),
    'test-data-cube-id',
  );
  screen.findByText('test-data-cube-id-query-name');
  screen.findByText('Id');
  screen.findByText('Case Type');
  screen.findByText('1');
  screen.findByText('Active');
  screen.findByText('2');
  screen.findByText('Confirmed');
});
