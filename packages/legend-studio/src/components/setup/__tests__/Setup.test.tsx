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

import { waitFor } from '@testing-library/dom';
import { Setup } from '../../setup/Setup';
import {
  integrationTest,
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
} from '@finos/legend-shared';
import {
  getMockedApplicationStore,
  SDLC_TestData,
  TEST__ApplicationStoreProvider,
} from '../../ComponentTestUtils';
import type { ApplicationStore } from '../../../stores/ApplicationStore';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

let applicationStore: ApplicationStore;
beforeEach(() => {
  applicationStore = getMockedApplicationStore();
});

test(
  integrationTest(
    'Shows project selector properly when there are at least 1 project',
  ),
  async () => {
    MOBX__enableSpyOrMock();
    jest
      .spyOn(applicationStore.networkClientManager.sdlcClient, 'getProjects')
      .mockResolvedValueOnce([SDLC_TestData.project])
      .mockResolvedValueOnce([]);
    MOBX__disableSpyOrMock();

    const { queryByText } = render(
      <MemoryRouter>
        <TEST__ApplicationStoreProvider>
          <Setup />
        </TEST__ApplicationStoreProvider>
      </MemoryRouter>,
    );

    // NOTE: react-select is not like a normal input box where we could set the placeholder, so we just
    // cannot use `queryByPlaceholderText` but have to use `queryByText`
    await waitFor(() =>
      expect(queryByText('Choose an existing project')).not.toBeNull(),
    );
  },
);

test(
  integrationTest('Disable project selector when there is no projects'),
  async () => {
    MOBX__enableSpyOrMock();
    jest
      .spyOn(applicationStore.networkClientManager.sdlcClient, 'getProjects')
      .mockResolvedValue([]);
    MOBX__disableSpyOrMock();

    const { queryByText } = render(
      <MemoryRouter>
        <TEST__ApplicationStoreProvider>
          <Setup />
        </TEST__ApplicationStoreProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        queryByText(
          'You have no projects, please create or acquire access for at least one',
        ),
      ).not.toBeNull(),
    );
  },
);
