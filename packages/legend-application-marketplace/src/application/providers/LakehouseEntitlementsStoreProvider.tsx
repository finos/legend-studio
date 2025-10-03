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
import { LakehouseEntitlementsStore } from '../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';
import { useLegendMarketplaceBaseStore } from './LegendMarketplaceFrameworkProvider.js';

const LakehouseEntitlementsStoreContext = createContext<
  LakehouseEntitlementsStore | undefined
>(undefined);

export const LakehouseEntitlementsStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const baseStore = useLegendMarketplaceBaseStore();
  const store = useLocalObservable(
    () => new LakehouseEntitlementsStore(baseStore),
  );
  return (
    <LakehouseEntitlementsStoreContext.Provider value={store}>
      {children}
    </LakehouseEntitlementsStoreContext.Provider>
  );
};

export const useLakehouseEntitlementsStore = (): LakehouseEntitlementsStore =>
  guaranteeNonNullable(
    useContext(LakehouseEntitlementsStoreContext),
    `Can't find editor store in context`,
  );

export const withLakehouseEntitlementsStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLakehouseEntitlementsStore() {
    return (
      <LakehouseEntitlementsStoreProvider>
        <WrappedComponent />
      </LakehouseEntitlementsStoreProvider>
    );
  };
