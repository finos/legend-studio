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
import { useApplicationStore } from '@finos/legend-application';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useDepotServerClient } from '@finos/legend-server-depot';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager.js';
import type { LegendTaxonomyApplicationConfig } from '../application/LegendTaxonomyApplicationConfig.js';
import { TaxonomyServerClient } from '../stores/TaxonomyServerClient.js';
import {
  type LegendTaxonomyApplicationStore,
  LegendTaxonomyBaseStore,
} from '../stores/LegendTaxonomyBaseStore.js';

export const useLegendTaxonomyApplicationStore =
  (): LegendTaxonomyApplicationStore =>
    useApplicationStore<
      LegendTaxonomyApplicationConfig,
      LegendTaxonomyPluginManager
    >();

const LegendTaxonomyBaseStoreContext = createContext<
  LegendTaxonomyBaseStore | undefined
>(undefined);

export const LegendTaxonomyBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendTaxonomyApplicationStore();
  const taxonomyServerClient = new TaxonomyServerClient(
    applicationStore.config.currentTaxonomyTreeOption.url,
  );
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () =>
      new LegendTaxonomyBaseStore(
        applicationStore,
        taxonomyServerClient,
        depotServerClient,
      ),
  );
  return (
    <LegendTaxonomyBaseStoreContext.Provider value={store}>
      {children}
    </LegendTaxonomyBaseStoreContext.Provider>
  );
};

export const useLegendTaxonomyBaseStore = (): LegendTaxonomyBaseStore =>
  guaranteeNonNullable(
    useContext(LegendTaxonomyBaseStoreContext),
    `Can't find Legend Taxonomy base store in context`,
  );
