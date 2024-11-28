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
import { useNavigate } from 'react-router';
import { BrowserRouter } from 'react-router-dom';
import { BrowserPlatform } from '../stores/platform/BrowserPlatform.js';
import { ApplicationPlatformContext } from './ApplicationPlatformProvider.js';
import { useApplicationStore } from './ApplicationStoreProvider.js';
import { stripTrailingSlash } from '../stores/navigation/BrowserNavigator.js';

const BrowserPlatformProvider: React.FC<{
  children: React.ReactNode;
  baseUrl: string;
}> = ({ children, baseUrl }) => {
  const applicationStore = useApplicationStore();
  const navigate = useNavigate();
  const platform = useLocalObservable(
    () =>
      new BrowserPlatform(applicationStore, {
        navigate,
        baseUrl: stripTrailingSlash(baseUrl),
      }),
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
  <BrowserRouter
    basename={stripTrailingSlash(baseUrl)}
    future={{
      // See https://reactrouter.com/en/6.28.0/upgrading/future#v7_relativesplatpath
      v7_relativeSplatPath: true,
      // See https://reactrouter.com/en/6.28.0/upgrading/future#v7_starttransition
      v7_startTransition: true,
    }}
  >
    <BrowserPlatformProvider baseUrl={baseUrl}>
      {children}
    </BrowserPlatformProvider>
  </BrowserRouter>
);
