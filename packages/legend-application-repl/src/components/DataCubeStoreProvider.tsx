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

import { createContext, useContext, useEffect } from 'react';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { guaranteeNonNullable, NetworkClient } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendREPLApplicationConfig } from '../application/LegendREPLApplicationConfig.js';
import type { LegendREPLPluginManager } from '../application/LegendREPLPluginManager.js';
import { DataCubeState } from '../stores/dataCube/DataCubeState.js';
import { REPLServerClient } from '../server/REPLServerClient.js';
import { REPLDataCubeEngine } from '../stores/REPLDataCubeEngine.js';

const DataCubeStoreContext = createContext<DataCubeState | undefined>(
  undefined,
);

export const DataCubeStoreProvider = observer(
  ({ children }: { children: React.ReactNode }): React.ReactElement => {
    const application = useApplicationStore<
      LegendREPLApplicationConfig,
      LegendREPLPluginManager
    >();
    const baseAddress = guaranteeNonNullable(application.config.baseAddress);
    const client = new REPLServerClient(
      new NetworkClient({
        baseUrl: application.config.useDynamicREPLServer
          ? window.location.origin + baseAddress.replace('/repl/', '')
          : application.config.replUrl,
      }),
    );
    const store = useLocalObservable(
      () =>
        new DataCubeState(
          application,
          (dataCubeStore) => new REPLDataCubeEngine(dataCubeStore, client),
        ),
    );

    useEffect(() => {
      store.initialize().catch(application.logUnhandledError);
    }, [store, application]);

    if (!store.initState.hasSucceeded) {
      return <></>;
    }
    return (
      <DataCubeStoreContext.Provider value={store}>
        {children}
      </DataCubeStoreContext.Provider>
    );
  },
);

export const useDataCubeStore = () =>
  guaranteeNonNullable(
    useContext(DataCubeStoreContext),
    `Can't find REPL store in context`,
  );

export const withDataCubeStore = (WrappedComponent: React.FC): React.FC =>
  function WithDATACUBEStore() {
    return (
      <DataCubeStoreProvider>
        <WrappedComponent />
      </DataCubeStoreProvider>
    );
  };
