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

import { useLocalObservable } from 'mobx-react-lite';
import { BrowserPlatform } from '../../stores/platform/BrowserPlatform.js';
import { ApplicationPlatformContext } from '../ApplicationPlatformProvider.js';
import { type GenericLegendApplicationStore } from '../../stores/ApplicationStore.js';
import { useApplicationStore } from '../ApplicationStoreProvider.js';
import { createMock } from '@finos/legend-shared/test';
import { MemoryRouter } from 'react-router';
import { BrowserNavigator } from '../../browser.js';

const TEST__APPLICATION_BASE_URL = '/test';

class TEST__BrowserNavigator extends BrowserNavigator {
  override getCurrentLocation(): string {
    return TEST__APPLICATION_BASE_URL;
  }
}

class TEST__BrowserPlatorm extends BrowserPlatform {
  override getNavigator(): TEST__BrowserNavigator {
    return new TEST__BrowserNavigator(() => {}, TEST__APPLICATION_BASE_URL);
  }
}

export const TEST__BrowserEnvironmentProvider: React.FC<{
  children: React.ReactNode;
  initialEntries: string[];
}> = ({ children, initialEntries }) => {
  const applicationStore = useApplicationStore();
  const platform = useLocalObservable(
    () =>
      new TEST__BrowserPlatorm(applicationStore, {
        navigate: () => {},
        baseUrl: TEST__APPLICATION_BASE_URL,
      }),
  );

  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ApplicationPlatformContext.Provider value={platform}>
        {children}
      </ApplicationPlatformContext.Provider>
    </MemoryRouter>
  );
};

export const TEST__provideMockedBrowserPlatform = (
  applicationStore: GenericLegendApplicationStore,
  customization?: {
    mock?: BrowserPlatform;
  },
): BrowserPlatform => {
  const value =
    customization?.mock ??
    new TEST__BrowserPlatorm(applicationStore, {
      navigate: () => {},
      baseUrl: TEST__APPLICATION_BASE_URL,
    });
  const MOCK__BrowserPlatform = require('../ApplicationPlatformProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  MOCK__BrowserPlatform.useApplicationPlatform = createMock();
  MOCK__BrowserPlatform.useApplicationPlatform.mockReturnValue(value);
  return value;
};
