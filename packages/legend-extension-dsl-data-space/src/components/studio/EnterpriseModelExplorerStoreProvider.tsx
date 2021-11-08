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
import { useGraphManagerState } from '@finos/legend-graph';
import { EnterpriseModelExplorerStore } from '../../stores/studio/EnterpriseModelExplorerStore';
import type { StudioConfig } from '@finos/legend-studio';
import { useStudioStore } from '@finos/legend-studio';

const EnterpriseModelExplorerStoreContext = createContext<
  EnterpriseModelExplorerStore | undefined
>(undefined);

export const EnterpriseModelExplorerStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const applicationStore = useApplicationStore<StudioConfig>();
  const depotServerClient = useDepotServerClient();
  const graphManagerState = useGraphManagerState();
  const studioStore = useStudioStore();
  const store = useLocalObservable(
    () =>
      new EnterpriseModelExplorerStore(
        applicationStore,
        depotServerClient,
        graphManagerState,
        studioStore.pluginManager,
      ),
  );
  return (
    <EnterpriseModelExplorerStoreContext.Provider value={store}>
      {children}
    </EnterpriseModelExplorerStoreContext.Provider>
  );
};

export const useEnterpriseModelExplorerStore =
  (): EnterpriseModelExplorerStore =>
    guaranteeNonNullable(
      useContext(EnterpriseModelExplorerStoreContext),
      `Can't find enterprise model explorer store in context`,
    );
