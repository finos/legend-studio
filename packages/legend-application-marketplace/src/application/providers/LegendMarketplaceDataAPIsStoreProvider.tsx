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
import { useLegendMarketplaceBaseStore } from './LegendMarketplaceFrameworkProvider.js';
import { LegendMarketplaceDataAPIsStore } from '../../stores/dataAPIs/LegendMarketplaceDataAPIsStore.js';

const LegendMarketplaceDataAPIsStoreContext = createContext<
  LegendMarketplaceDataAPIsStore | undefined
>(undefined);

export const LegendMarketplaceDataAPIsStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const dataAPIsStore = useLocalObservable(
    () => new LegendMarketplaceDataAPIsStore(legendMarketplaceBaseStore),
  );

  return (
    <LegendMarketplaceDataAPIsStoreContext.Provider value={dataAPIsStore}>
      {children}
    </LegendMarketplaceDataAPIsStoreContext.Provider>
  );
};

export const useLegendMarketplaceDataAPIsStore =
  (): LegendMarketplaceDataAPIsStore =>
    guaranteeNonNullable(
      useContext(LegendMarketplaceDataAPIsStoreContext),
      `Can't find Data APIs store in context`,
    );

export const withLegendMarketplaceDataAPIsStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLegendMarketplaceDataAPIsStore() {
    return (
      <LegendMarketplaceDataAPIsStoreProvider>
        <WrappedComponent />
      </LegendMarketplaceDataAPIsStoreProvider>
    );
  };
