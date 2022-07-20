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
import { LegendTaxonomyStore } from '../stores/LegendTaxonomyStore.js';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager.js';
import type { LegendTaxonomyConfig } from '../application/LegendTaxonomyConfig.js';
import { TaxonomyServerClient } from '../stores/TaxonomyServerClient.js';

const LegendTaxonomyStoreContext = createContext<
  LegendTaxonomyStore | undefined
>(undefined);

export const LegendTaxonomyStoreProvider: React.FC<{
  children: React.ReactNode;
  pluginManager: LegendTaxonomyPluginManager;
}> = ({ children, pluginManager }) => {
  const applicationStore = useApplicationStore<LegendTaxonomyConfig>();
  const taxonomyServerClient = new TaxonomyServerClient(
    applicationStore.config.currentTaxonomyTreeOption.url,
  );
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () =>
      new LegendTaxonomyStore(
        applicationStore,
        taxonomyServerClient,
        depotServerClient,
        pluginManager,
      ),
  );
  return (
    <LegendTaxonomyStoreContext.Provider value={store}>
      {children}
    </LegendTaxonomyStoreContext.Provider>
  );
};

export const useLegendTaxonomyStore = (): LegendTaxonomyStore =>
  guaranteeNonNullable(
    useContext(LegendTaxonomyStoreContext),
    `Can't find Legend Taxonomy store in context`,
  );
