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
import { QueryStore } from '../stores/QueryStore';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useDepotServerClient } from '@finos/legend-server-depot';
import { useGraphManagerState } from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import type { QueryPluginManager } from '../application/QueryPluginManager';
import type { QueryConfig } from '../application/QueryConfig';

const QueryStoreContext = createContext<QueryStore | undefined>(undefined);

export const QueryStoreProvider = ({
  children,
  pluginManager,
}: {
  children: React.ReactNode;
  pluginManager: QueryPluginManager;
}): React.ReactElement => {
  const applicationStore = useApplicationStore<QueryConfig>();
  const depotServerClient = useDepotServerClient();
  const graphManagerState = useGraphManagerState();
  const store = useLocalObservable(
    () =>
      new QueryStore(
        applicationStore,
        depotServerClient,
        graphManagerState,
        pluginManager,
      ),
  );
  return (
    <QueryStoreContext.Provider value={store}>
      {children}
    </QueryStoreContext.Provider>
  );
};

export const useQueryStore = (): QueryStore =>
  guaranteeNonNullable(
    useContext(QueryStoreContext),
    `Can't find Query store in context`,
  );
