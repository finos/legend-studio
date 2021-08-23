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

import { createMemoryHistory } from 'history';
import { ApplicationStore } from '../stores/ApplicationStore';
import { TEST__getTestApplicationConfig } from '../stores/ApplicationStoreTestUtils';
import { WebApplicationNavigator } from '../stores/WebApplicationNavigator';
import type { ApplicationConfig } from '../stores/ApplicationConfig';
import { ApplicationStoreProvider } from './ApplicationStoreProvider';
import { Log } from '@finos/legend-shared';

export const TEST__ApplicationStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => (
  <ApplicationStoreProvider
    config={TEST__getTestApplicationConfig()}
    navigator={new WebApplicationNavigator(createMemoryHistory())}
    log={new Log()}
  >
    {children}
  </ApplicationStoreProvider>
);

export const TEST__provideMockedApplicationStore = (customization?: {
  mock?: ApplicationStore;
  config?: ApplicationConfig;
  navigator?: WebApplicationNavigator;
}): ApplicationStore => {
  const value =
    customization?.mock ??
    new ApplicationStore(
      customization?.config ?? TEST__getTestApplicationConfig(),
      customization?.navigator ??
        new WebApplicationNavigator(createMemoryHistory()),
      new Log(),
    );
  const MockedApplicationStoreProvider = require('./ApplicationStoreProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedApplicationStoreProvider.useApplicationStore = jest.fn();
  MockedApplicationStoreProvider.useApplicationStore.mockReturnValue(value);
  return value;
};
