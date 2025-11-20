/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { OrdersStore } from '../../stores/orders/OrderStore.js';

const LegendMarketplaceOrdersStoreContext = createContext<
  OrdersStore | undefined
>(undefined);

export const LegendMarketplaceOrdersStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const ordersStore = useLocalObservable(
    () => new OrdersStore(legendMarketplaceBaseStore),
  );

  return (
    <LegendMarketplaceOrdersStoreContext.Provider value={ordersStore}>
      {children}
    </LegendMarketplaceOrdersStoreContext.Provider>
  );
};

export const useLegendMarketplaceOrdersStore = (): OrdersStore =>
  guaranteeNonNullable(
    useContext(LegendMarketplaceOrdersStoreContext),
    `Can't find orders store in context`,
  );

export const withLegendMarketplaceOrdersStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLegendMarketplaceOrdersStore() {
    return (
      <LegendMarketplaceOrdersStoreProvider>
        <WrappedComponent />
      </LegendMarketplaceOrdersStoreProvider>
    );
  };
