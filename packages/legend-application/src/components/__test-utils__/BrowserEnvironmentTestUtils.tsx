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

import { createMemoryHistory, type History } from 'history';
import { useLocalObservable } from 'mobx-react-lite';
import { Router } from 'react-router';
import { BrowserPlatform } from '../../stores/platform/BrowserPlatform.js';
import { ApplicationPlatformContext } from '../ApplicationPlatformProvider.js';
import { type GenericLegendApplicationStore } from '../../stores/ApplicationStore.js';
import { useApplicationStore } from '../ApplicationStoreProvider.js';
import { createMock } from '@finos/legend-shared/test';

export { createMemoryHistory };

export const TEST__BrowserEnvironmentProvider: React.FC<{
  children: React.ReactNode;
  historyAPI?: History | undefined;
}> = ({ children, historyAPI }) => {
  const applicationStore = useApplicationStore();
  const history = historyAPI ?? createMemoryHistory();
  const platform = useLocalObservable(
    () => new BrowserPlatform(applicationStore, { historyAPI: history }),
  );

  return (
    <Router history={history}>
      <ApplicationPlatformContext.Provider value={platform}>
        {children}
      </ApplicationPlatformContext.Provider>
    </Router>
  );
};

export const TEST__provideMockedBrowserPlatform = (
  applicationStore: GenericLegendApplicationStore,
  customization?: {
    mock?: BrowserPlatform;
    historyAPI?: History;
  },
): BrowserPlatform => {
  const value =
    customization?.mock ??
    new BrowserPlatform(applicationStore, {
      historyAPI: customization?.historyAPI ?? createMemoryHistory(),
    });
  const MOCK__BrowserPlatform = require('../ApplicationPlatformProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
  MOCK__BrowserPlatform.useApplicationPlatform = createMock();
  MOCK__BrowserPlatform.useApplicationPlatform.mockReturnValue(value);
  return value;
};
