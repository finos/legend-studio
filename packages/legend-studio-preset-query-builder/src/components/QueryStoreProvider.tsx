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
import type { StudioPluginManager } from '@finos/legend-studio';
import { EditorStore, useApplicationStore } from '@finos/legend-studio';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useDepotServerClient } from '@finos/legend-server-depot';
import { SDLCServerClient } from '@finos/legend-server-sdlc';
import { useGraphManagerState } from '@finos/legend-graph';

const QueryStoreContext = createContext<QueryStore | undefined>(undefined);

export const QueryStoreProvider = ({
  children,
  pluginManager,
}: {
  children: React.ReactNode;
  pluginManager: StudioPluginManager;
}): React.ReactElement => {
  const applicationStore = useApplicationStore();
  const depotServerClient = useDepotServerClient();
  // TODO: remove SDLC and its `package.json` dependencies when we refactor QueryBuilder to
  // no longer depends on `EditorStore`
  const sdlcServerClient = new SDLCServerClient({ serverUrl: '', env: '' });
  const graphManagerState = useGraphManagerState();
  const store = useLocalObservable(
    () =>
      new QueryStore(
        new EditorStore(
          applicationStore,
          sdlcServerClient,
          depotServerClient,
          graphManagerState,
          pluginManager,
        ),
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
