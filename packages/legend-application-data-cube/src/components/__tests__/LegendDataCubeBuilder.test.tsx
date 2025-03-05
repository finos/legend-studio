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
import { test } from '@jest/globals';
import { fireEvent } from '@testing-library/dom';
import {
  TEST__provideMockedLegendDataCubeBuilderStore,
  TEST__setUpDataCubeBuilder,
} from '../__test-utils__/LegendDataCubeStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

test(
  integrationTest('Load DataCube window appears on first load'),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    const { renderResult } = await TEST__setUpDataCubeBuilder(
      mockedLegendDataCubeBuilderStore,
    );
    await renderResult.findByPlaceholderText(
      'Search for DataCube(s) by name or ID',
    );
  },
);

test(
  integrationTest('New DataCube window appears on button click'),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendDataCubeBuilderStore();
    const { renderResult } = await TEST__setUpDataCubeBuilder(
      mockedLegendDataCubeBuilderStore,
    );
    await renderResult.findByPlaceholderText(
      'Search for DataCube(s) by name or ID',
    );
    fireEvent.click(
      await renderResult.findByRole('button', { name: 'Cancel' }),
    );
    fireEvent.click(
      guaranteeNonNullable(
        (
          await renderResult.findAllByRole('button', { name: 'New DataCube' })
        )?.[0],
      ),
    );
    await renderResult.findByText('Choose Source Type:');
  },
);

test(integrationTest('Loads DataCube from Legend Query'), async () => {
  const mockedLegendDataCubeBuilderStore =
    await TEST__provideMockedLegendDataCubeBuilderStore();
  const { renderResult } = await TEST__setUpDataCubeBuilder(
    mockedLegendDataCubeBuilderStore,
    'test-data-cube-id',
  );
  await renderResult.findByText('test-data-cube-id');
  // await renderResult.findByPlaceholderText(
  //   'Search for DataCube(s) by name or ID',
  // );
  // fireEvent.click(
  //   await renderResult.findByRole('button', { name: 'Cancel' }),
  // );
  // fireEvent.click(
  //   guaranteeNonNullable(
  //     (
  //       await renderResult.findAllByRole('button', { name: 'New DataCube' })
  //     )?.[0],
  //   ),
  // );
  // await renderResult.findByText('Choose Source Type:');
});
