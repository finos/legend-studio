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
import { guaranteeNonNullable } from '@finos/legend-shared';
import { MarketplaceLakehouseStore } from '../../stores/lakehouse/MarketplaceLakehouseStore.js';
import { useLegendMarketplaceBaseStore } from '../../application/LegendMarketplaceFrameworkProvider.js';

const MarketplaceLakehouseStoreContext = createContext<
  MarketplaceLakehouseStore | undefined
>(undefined);

export const MarketplaceLakehouseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const baseStore = useLegendMarketplaceBaseStore();
  const lakehouseServerClient = guaranteeNonNullable(
    baseStore.lakehouseServerClient,
    'lakehouse server client required to render',
  );
  const lakehousePlatformServerClient = guaranteeNonNullable(
    baseStore.lakehousePlatformServerClient,
    'lakehouse platform server client required to render',
  );
  const lakehosueIngestServerClient = guaranteeNonNullable(
    baseStore.lakehouseIngestServerClient,
    'lakehouse ingest server client required to render',
  );
  const store = useLocalObservable(
    () =>
      new MarketplaceLakehouseStore(
        baseStore,
        lakehouseServerClient,
        lakehousePlatformServerClient,
        lakehosueIngestServerClient,
        baseStore.depotServerClient,
      ),
  );
  return (
    <MarketplaceLakehouseStoreContext.Provider value={store}>
      {children}
    </MarketplaceLakehouseStoreContext.Provider>
  );
};

export const useMarketplaceLakehouseStore = (): MarketplaceLakehouseStore =>
  guaranteeNonNullable(
    useContext(MarketplaceLakehouseStoreContext),
    `Can't find editor store in context`,
  );

export const withMarketplaceLakehouseStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithMarketplaceLakehouseStore() {
    return (
      <MarketplaceLakehouseStoreProvider>
        <WrappedComponent />
      </MarketplaceLakehouseStoreProvider>
    );
  };
