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
import { useLegendMarketplaceBaseStore } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import { LegendMarketplaceSearchResultsStore } from '../../stores/lakehouse/LegendMarketplaceSearchResultsStore.js';

const LegendMarketplaceSearchResultsStoreContext = createContext<
  LegendMarketplaceSearchResultsStore | undefined
>(undefined);

export const LegendMarketplaceSearchResultsStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const legendMarketplaceSearchResultsStore = useLocalObservable(
    () => new LegendMarketplaceSearchResultsStore(legendMarketplaceBaseStore),
  );

  return (
    <LegendMarketplaceSearchResultsStoreContext.Provider
      value={legendMarketplaceSearchResultsStore}
    >
      {children}
    </LegendMarketplaceSearchResultsStoreContext.Provider>
  );
};

export const useLegendMarketplaceSearchResultsStore =
  (): LegendMarketplaceSearchResultsStore =>
    guaranteeNonNullable(
      useContext(LegendMarketplaceSearchResultsStoreContext),
      `Can't find search results store in context`,
    );

export const withLegendMarketplaceSearchResultsStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLegendMarketplaceSearchResultsStore() {
    return (
      <LegendMarketplaceSearchResultsStoreProvider>
        <WrappedComponent />
      </LegendMarketplaceSearchResultsStoreProvider>
    );
  };
