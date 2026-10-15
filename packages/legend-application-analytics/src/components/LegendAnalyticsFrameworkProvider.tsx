/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { createContext, useContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type ApplicationStore,
  ApplicationFrameworkProvider,
  useApplicationStore,
} from '@finos/legend-application';
import type { LegendAnalyticsApplicationConfig } from '../application/LegendAnalyticsApplicationConfig.js';
import type { LegendAnalyticsPluginManager } from '../application/LegendAnalyticsPluginManager.js';
import { LegendAnalyticsBaseStore } from '../stores/LegendAnalyticsBaseStore.js';

export const useLegendAnalyticsApplicationStore = (): ApplicationStore<
  LegendAnalyticsApplicationConfig,
  LegendAnalyticsPluginManager
> =>
  useApplicationStore<
    LegendAnalyticsApplicationConfig,
    LegendAnalyticsPluginManager
  >();

const LegendAnalyticsBaseStoreContext = createContext<
  LegendAnalyticsBaseStore | undefined
>(undefined);

const LegendAnalyticsBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendAnalyticsApplicationStore();
  const store = useLocalObservable(
    () => new LegendAnalyticsBaseStore(applicationStore),
  );
  return (
    <LegendAnalyticsBaseStoreContext.Provider value={store}>
      {children}
    </LegendAnalyticsBaseStoreContext.Provider>
  );
};

export const useLegendAnalyticsBaseStore = (): LegendAnalyticsBaseStore =>
  guaranteeNonNullable(
    useContext(LegendAnalyticsBaseStoreContext),
    `Can't find Legend Analytics base store in context`,
  );

/** The application's services, as Legend Query gives the Cube page them */
export const LegendAnalyticsFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider>
    <LegendAnalyticsBaseStoreProvider>
      {children}
    </LegendAnalyticsBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
