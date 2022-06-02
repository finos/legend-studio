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
import { LegendQueryStore } from '../stores/LegendQueryStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useDepotServerClient } from '@finos/legend-server-depot';
import { useGraphManagerState } from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendQueryPluginManager } from '../application/LegendQueryPluginManager.js';
import type { LegendQueryConfig } from '../application/LegendQueryConfig.js';

const LegendQueryStoreContext = createContext<LegendQueryStore | undefined>(
  undefined,
);

export const LegendQueryStoreProvider: React.FC<{
  children: React.ReactNode;
  pluginManager: LegendQueryPluginManager;
}> = ({ children, pluginManager }) => {
  const applicationStore = useApplicationStore<LegendQueryConfig>();
  const depotServerClient = useDepotServerClient();
  const graphManagerState = useGraphManagerState();
  const store = useLocalObservable(
    () =>
      new LegendQueryStore(
        applicationStore,
        depotServerClient,
        graphManagerState,
        pluginManager,
      ),
  );
  return (
    <LegendQueryStoreContext.Provider value={store}>
      {children}
    </LegendQueryStoreContext.Provider>
  );
};

export const useLegendQueryStore = (): LegendQueryStore =>
  guaranteeNonNullable(
    useContext(LegendQueryStoreContext),
    `Can't find Legend Query store in context`,
  );
