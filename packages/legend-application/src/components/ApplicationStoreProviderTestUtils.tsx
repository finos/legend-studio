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
import { WebApplicationNavigator } from '../stores/WebApplicationNavigator';
import type { LegendApplicationConfig } from '../stores/ApplicationConfig';
import { ApplicationStoreProvider } from './ApplicationStoreProvider';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager';

export const TEST__ApplicationStoreProvider: React.FC<{
  children: React.ReactNode;
  config: LegendApplicationConfig;
  pluginManager: LegendApplicationPluginManager;
}> = ({ children, config, pluginManager }) => (
  <ApplicationStoreProvider config={config} pluginManager={pluginManager}>
    {children}
  </ApplicationStoreProvider>
);

export const TEST__provideMockedApplicationStore = <
  T extends LegendApplicationConfig,
>(
  config: T,
  pluginManager: LegendApplicationPluginManager,
  customization?: {
    mock?: ApplicationStore<T>;
    navigator?: WebApplicationNavigator;
  },
): ApplicationStore<T> => {
  const value =
    customization?.mock ??
    new ApplicationStore(
      config,
      customization?.navigator ??
        new WebApplicationNavigator(createMemoryHistory()),
      pluginManager,
    );
  const MockedApplicationStoreProvider = require('./ApplicationStoreProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedApplicationStoreProvider.useApplicationStore = jest.fn();
  MockedApplicationStoreProvider.useApplicationStore.mockReturnValue(value);
  return value;
};
