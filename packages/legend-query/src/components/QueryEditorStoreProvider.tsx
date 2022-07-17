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
import { useLegendQueryStore } from './LegendQueryStoreProvider.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { QueryEditorStore } from '../stores/QueryEditorStore.js';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendQueryConfig } from '../application/LegendQueryConfig.js';
import { useDepotServerClient } from '@finos/legend-server-depot';

const QueryEditorStoreContext = createContext<QueryEditorStore | undefined>(
  undefined,
);

export const QueryEditorStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useApplicationStore<LegendQueryConfig>();
  const depotServerClient = useDepotServerClient();
  const queryStore = useLegendQueryStore();
  const store = useLocalObservable(
    () =>
      new QueryEditorStore(
        applicationStore,
        depotServerClient,
        queryStore.pluginManager,
      ),
  );
  return (
    <QueryEditorStoreContext.Provider value={store}>
      {children}
    </QueryEditorStoreContext.Provider>
  );
};

export const useQueryEditorStore = (): QueryEditorStore =>
  guaranteeNonNullable(
    useContext(QueryEditorStoreContext),
    `Can't find query editor store in context`,
  );
