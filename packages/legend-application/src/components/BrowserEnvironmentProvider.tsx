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

import { type History } from 'history';
import { useLocalObservable } from 'mobx-react-lite';
import { useHistory } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { BrowserPlatform } from '../stores/platform/BrowserPlatform.js';
import { ApplicationPlatformContext } from './ApplicationPlatformProvider.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';

const BrowserPlatformProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useApplicationStore();
  const historyAPI = useHistory() as History; // TODO: this is a temporary hack until we upgrade react-router
  const platform = useLocalObservable(
    () => new BrowserPlatform(applicationStore, { historyAPI }),
  );

  return (
    <ApplicationPlatformContext.Provider value={platform}>
      {children}
    </ApplicationPlatformContext.Provider>
  );
};

export const BrowserEnvironmentProvider: React.FC<{
  children: React.ReactNode;
  baseUrl: string;
}> = ({ children, baseUrl }) => (
  <BrowserRouter basename={baseUrl}>
    <BrowserPlatformProvider>{children}</BrowserPlatformProvider>
  </BrowserRouter>
);
