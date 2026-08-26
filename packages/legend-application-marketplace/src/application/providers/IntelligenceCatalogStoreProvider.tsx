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
import { IntelligenceCatalogStore } from '../../stores/intelligence/IntelligenceCatalogStore.js';

const IntelligenceCatalogStoreContext = createContext<
  IntelligenceCatalogStore | undefined
>(undefined);

export const IntelligenceCatalogStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const legendMarketplaceBaseStore = useLegendMarketplaceBaseStore();
  const intelligenceCatalogStore = useLocalObservable(
    () => new IntelligenceCatalogStore(legendMarketplaceBaseStore),
  );

  return (
    <IntelligenceCatalogStoreContext.Provider value={intelligenceCatalogStore}>
      {children}
    </IntelligenceCatalogStoreContext.Provider>
  );
};

export const useIntelligenceCatalogStore = (): IntelligenceCatalogStore =>
  guaranteeNonNullable(
    useContext(IntelligenceCatalogStoreContext),
    `Can't find intelligence catalog store in context`,
  );
