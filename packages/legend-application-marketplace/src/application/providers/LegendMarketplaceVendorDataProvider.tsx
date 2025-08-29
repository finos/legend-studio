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
import { LegendMarketPlaceVendorDataStore } from '../../stores/LegendMarketPlaceVendorDataStore.js';
import React, { createContext, useContext } from 'react';
import { guaranteeType } from '@finos/legend-shared';
import {
  useLegendMarketplaceApplicationStore,
  useLegendMarketplaceBaseStore,
} from './LegendMarketplaceFrameworkProvider.js';

const LegendMarketPlaceVendorDataStoreContext = createContext<
  LegendMarketPlaceVendorDataStore | undefined
>(undefined);

export const LegendMarketplaceVendorDataStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendMarketplaceApplicationStore();
  const baseStore = useLegendMarketplaceBaseStore();
  const store = useLocalObservable(
    () => new LegendMarketPlaceVendorDataStore(applicationStore, baseStore),
  );
  return (
    <LegendMarketPlaceVendorDataStoreContext.Provider value={store}>
      {children}
    </LegendMarketPlaceVendorDataStoreContext.Provider>
  );
};

export const useLegendMarketPlaceVendorDataStore =
  (): LegendMarketPlaceVendorDataStore =>
    guaranteeType(
      useContext(LegendMarketPlaceVendorDataStoreContext),
      LegendMarketPlaceVendorDataStore,
      `Can't find vendor data store in context`,
    );

export const withLegendMarketplaceVendorDataStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLegendMarketplaceVendorDataStore() {
    return (
      <LegendMarketplaceVendorDataStoreProvider>
        <WrappedComponent />
      </LegendMarketplaceVendorDataStoreProvider>
    );
  };
