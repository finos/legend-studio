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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useLocalObservable } from 'mobx-react-lite';
import {
  ApplicationFrameworkProvider,
  useApplicationStore,
} from '@finos/legend-application';
import {
  type LegendCatalogApplicationStore,
  LegendCatalogBaseStore,
} from '../stores/LegendCatalogBaseStore.js';
import type { LegendCatalogApplicationConfig } from '../application/LegendCatalogApplicationConfig.js';
import type { LegendCatalogPluginManager } from '../application/LegendCatalogPluginManager.js';

export const useLegendCatalogApplicationStore =
  (): LegendCatalogApplicationStore =>
    useApplicationStore<
      LegendCatalogApplicationConfig,
      LegendCatalogPluginManager
    >();

const LegendCatalogBaseStoreContext = createContext<
  LegendCatalogBaseStore | undefined
>(undefined);

const LegendCatalogBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendCatalogApplicationStore();
  const baseStore = useLocalObservable(
    () => new LegendCatalogBaseStore(applicationStore),
  );
  return (
    <LegendCatalogBaseStoreContext.Provider value={baseStore}>
      {children}
    </LegendCatalogBaseStoreContext.Provider>
  );
};

export const useLegendCatalogBaseStore = (): LegendCatalogBaseStore =>
  guaranteeNonNullable(
    useContext(LegendCatalogBaseStoreContext),
    `Can't find Legend Marketplace base store in context`,
  );

export const LegendCatalogFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider>
    <LegendCatalogBaseStoreProvider>{children}</LegendCatalogBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
