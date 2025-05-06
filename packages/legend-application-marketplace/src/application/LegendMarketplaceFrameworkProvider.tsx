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
  BlockingAlert,
  useApplicationStore,
  NotificationManager,
} from '@finos/legend-application';
import {
  type LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from '../stores/LegendMarketplaceBaseStore.js';
import type { LegendMarketplaceApplicationConfig } from '../application/LegendMarketplaceApplicationConfig.js';
import type { LegendMarketplacePluginManager } from '../application/LegendMarketplacePluginManager.js';

export const useLegendMarketplaceApplicationStore =
  (): LegendMarketplaceApplicationStore =>
    useApplicationStore<
      LegendMarketplaceApplicationConfig,
      LegendMarketplacePluginManager
    >();

const LegendMarketplaceBaseStoreContext = createContext<
  LegendMarketplaceBaseStore | undefined
>(undefined);

const LegendMarketplaceBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendMarketplaceApplicationStore();
  const baseStore = useLocalObservable(
    () => new LegendMarketplaceBaseStore(applicationStore),
  );
  return (
    <LegendMarketplaceBaseStoreContext.Provider value={baseStore}>
      {children}
    </LegendMarketplaceBaseStoreContext.Provider>
  );
};

export const useLegendMarketplaceBaseStore = (): LegendMarketplaceBaseStore =>
  guaranteeNonNullable(
    useContext(LegendMarketplaceBaseStoreContext),
    `Can't find Legend Marketplace base store in context`,
  );

export const LegendMarketplaceFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider simple={true} enableTransitions={true}>
    <BlockingAlert />
    <NotificationManager />
    <LegendMarketplaceBaseStoreProvider>
      {children}
    </LegendMarketplaceBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
