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

import { createContext, useContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { LegendQueryBaseStore } from '../stores/LegendQueryBaseStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryApplicationConfig } from '../application/LegendQueryApplicationConfig.js';
import {
  type ApplicationStore,
  useApplicationStore,
  ApplicationFrameworkProvider,
} from '@finos/legend-application';

export const useLegendQueryApplicationStore = (): ApplicationStore<
  LegendQueryApplicationConfig,
  LegendQueryPluginManager
> =>
  useApplicationStore<LegendQueryApplicationConfig, LegendQueryPluginManager>();

const LegendQueryBaseStoreContext = createContext<
  LegendQueryBaseStore | undefined
>(undefined);

const LegendQueryBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendQueryApplicationStore();
  const store = useLocalObservable(
    () => new LegendQueryBaseStore(applicationStore),
  );
  return (
    <LegendQueryBaseStoreContext.Provider value={store}>
      {children}
    </LegendQueryBaseStoreContext.Provider>
  );
};

export const useLegendQueryBaseStore = (): LegendQueryBaseStore =>
  guaranteeNonNullable(
    useContext(LegendQueryBaseStoreContext),
    `Can't find Legend Query base store in context`,
  );

export const LegendQueryFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider>
    <LegendQueryBaseStoreProvider>{children}</LegendQueryBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
