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
import { TaxonomyExplorerStore } from '../stores/TaxonomyExplorerStore.js';
import {
  useLegendTaxonomyApplicationStore,
  useLegendTaxonomyBaseStore,
} from './LegendTaxonomyFrameworkProvider.js';

const TaxonomyExplorerStoreContext = createContext<
  TaxonomyExplorerStore | undefined
>(undefined);

const TaxonomyExplorerStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendTaxonomyApplicationStore();
  const baseStore = useLegendTaxonomyBaseStore();
  const store = useLocalObservable(
    () =>
      new TaxonomyExplorerStore(
        applicationStore,
        baseStore.taxonomyServerClient,
        baseStore.depotServerClient,
      ),
  );
  return (
    <TaxonomyExplorerStoreContext.Provider value={store}>
      {children}
    </TaxonomyExplorerStoreContext.Provider>
  );
};

export const withTaxonomyExplorerStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithTaxonomyExplorerStore() {
    return (
      <TaxonomyExplorerStoreProvider>
        <WrappedComponent />
      </TaxonomyExplorerStoreProvider>
    );
  };

export const useTaxonomyExplorerStore = (): TaxonomyExplorerStore =>
  guaranteeNonNullable(
    useContext(TaxonomyExplorerStoreContext),
    `Can't find taxonomy explorer store in context`,
  );
