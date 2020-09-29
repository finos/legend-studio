/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { waitFor } from '@testing-library/dom';
import { Setup } from 'Components/setup/Setup';
import { testProject } from 'Components/__tests__/SdlcTestData';
import { integration } from 'Utilities/TestUtil';
import { renderWithAppContext } from 'Components/__tests__/ComponentTestUtil';
import { sdlcClient } from 'API/SdlcClient';
import { Project } from 'SDLC/project/Project';
import { noop } from 'Utilities/GeneralUtil';

test(integration('Shows project selector properly when there are at least 1 project'), async () => {
  jest.spyOn(sdlcClient, 'getProjects').mockResolvedValueOnce([testProject as unknown as Project]).mockResolvedValueOnce([]);

  const { queryByText } = renderWithAppContext(<Setup />);
  await waitFor(noop());
  // NOTE: react-select is not like a normal input box where we could set the placeholder, so we just
  // cannot use `queryByPlaceholderText` but have to use `queryByText`
  expect(queryByText('Choose an existing project')).not.toBeNull();
});

test(integration('Disable project selector when there is no projects'), async () => {
  jest.spyOn(sdlcClient, 'getProjects').mockResolvedValue([]);

  const { queryByText } = renderWithAppContext(<Setup />);
  await waitFor(noop());
  expect(queryByText('You have no projects, please create or acquire access for at least one')).not.toBeNull();
});
