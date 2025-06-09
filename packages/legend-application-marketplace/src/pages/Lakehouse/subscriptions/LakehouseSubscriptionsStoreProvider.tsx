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
import {
  useLegendMarketplaceApplicationStore,
  useLegendMarketplaceBaseStore,
} from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { LakehouseSubscriptionsStore } from '../../../stores/lakehouse/subscriptions/LakehouseSubscriptionsStore.js';

const LakehouseSubscriptionsStoreContext = createContext<
  LakehouseSubscriptionsStore | undefined
>(undefined);

export const LakehouseSubscriptionsStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendMarketplaceApplicationStore();
  const baseStore = useLegendMarketplaceBaseStore();
  const lakehouseServerClient = guaranteeNonNullable(
    baseStore.lakehouseContractServerClient,
    'lakehouse server client required to render',
  );
  const store = useLocalObservable(
    () =>
      new LakehouseSubscriptionsStore(applicationStore, lakehouseServerClient),
  );
  return (
    <LakehouseSubscriptionsStoreContext.Provider value={store}>
      {children}
    </LakehouseSubscriptionsStoreContext.Provider>
  );
};

export const useLakehouseSubscriptionsStore = (): LakehouseSubscriptionsStore =>
  guaranteeNonNullable(
    useContext(LakehouseSubscriptionsStoreContext),
    `Can't find lakehouse subscriptions store in context`,
  );

export const withLakehouseSubscriptionsStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithLakehouseSubscriptionsStore() {
    return (
      <LakehouseSubscriptionsStoreProvider>
        <WrappedComponent />
      </LakehouseSubscriptionsStoreProvider>
    );
  };
