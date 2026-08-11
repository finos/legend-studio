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

import { createContext, useContext, useEffect } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from './LegendMarketplaceFrameworkProvider.js';
import { LegendMarketplaceLakehouseAccessSearchResultsStore } from '../../stores/lakehouse/LegendMarketplaceLakehouseAccessSearchResultsStore.js';

const LegendMarketplaceLakehouseAccessSearchResultsStoreContext = createContext<
  LegendMarketplaceLakehouseAccessSearchResultsStore | undefined
>(undefined);

export const LegendMarketplaceLakehouseAccessSearchResultsStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const lakehouseAccessSearchResultsStore = useLocalObservable(
    () =>
      new LegendMarketplaceLakehouseAccessSearchResultsStore(
        legendMarketplaceBaseStore,
      ),
  );

  useEffect(() => {
    return () => {
      lakehouseAccessSearchResultsStore.dispose();
    };
  }, [lakehouseAccessSearchResultsStore]);

  return (
    <LegendMarketplaceLakehouseAccessSearchResultsStoreContext.Provider
      value={lakehouseAccessSearchResultsStore}
    >
      {children}
    </LegendMarketplaceLakehouseAccessSearchResultsStoreContext.Provider>
  );
};

export const useLegendMarketplaceLakehouseAccessSearchResultsStore =
  (): LegendMarketplaceLakehouseAccessSearchResultsStore =>
    guaranteeNonNullable(
      useContext(LegendMarketplaceLakehouseAccessSearchResultsStoreContext),
      `Can't find lakehouse access search results store in context`,
    );

export const withLegendMarketplaceLakehouseAccessSearchResultsStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLegendMarketplaceLakehouseAccessSearchResultsStore() {
    return (
      <LegendMarketplaceLakehouseAccessSearchResultsStoreProvider>
        <WrappedComponent />
      </LegendMarketplaceLakehouseAccessSearchResultsStoreProvider>
    );
  };
