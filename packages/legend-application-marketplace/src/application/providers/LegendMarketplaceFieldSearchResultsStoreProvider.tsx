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
import { LegendMarketplaceFieldSearchResultsStore } from '../../stores/lakehouse/LegendMarketplaceFieldSearchResultsStore.js';

const LegendMarketplaceFieldSearchResultsStoreContext = createContext<
  LegendMarketplaceFieldSearchResultsStore | undefined
>(undefined);

export const LegendMarketplaceFieldSearchResultsStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const fieldSearchResultsStore = useLocalObservable(
    () =>
      new LegendMarketplaceFieldSearchResultsStore(legendMarketplaceBaseStore),
  );

  useEffect(() => {
    return () => {
      fieldSearchResultsStore.dispose();
    };
  }, [fieldSearchResultsStore]);

  return (
    <LegendMarketplaceFieldSearchResultsStoreContext.Provider
      value={fieldSearchResultsStore}
    >
      {children}
    </LegendMarketplaceFieldSearchResultsStoreContext.Provider>
  );
};

export const useLegendMarketplaceFieldSearchResultsStore =
  (): LegendMarketplaceFieldSearchResultsStore =>
    guaranteeNonNullable(
      useContext(LegendMarketplaceFieldSearchResultsStoreContext),
      `Can't find field search results store in context`,
    );

export const withLegendMarketplaceFieldSearchResultsStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLegendMarketplaceFieldSearchResultsStore() {
    return (
      <LegendMarketplaceFieldSearchResultsStoreProvider>
        <WrappedComponent />
      </LegendMarketplaceFieldSearchResultsStoreProvider>
    );
  };
