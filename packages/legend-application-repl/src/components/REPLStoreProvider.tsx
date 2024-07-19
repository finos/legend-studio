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
import { REPLStore } from '../stores/REPLStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendREPLApplicationConfig } from '../application/LegendREPLApplicationConfig.js';
import type { LegendREPLPluginManager } from '../application/LegendREPLPluginManager.js';

const REPLStoreContext = createContext<REPLStore | undefined>(undefined);

export const REPLStoreProvider = observer(
  ({ children }: { children: React.ReactNode }): React.ReactElement => {
    const applicationStore = useApplicationStore<
      LegendREPLApplicationConfig,
      LegendREPLPluginManager
    >();
    const store = useLocalObservable(() => new REPLStore(applicationStore));

    useEffect(() => {
      store.initialize().catch(applicationStore.logUnhandledError);
    }, [store, applicationStore]);

    if (!store.initState.hasSucceeded) {
      return <></>;
    }
    return (
      <REPLStoreContext.Provider value={store}>
        {children}
      </REPLStoreContext.Provider>
    );
  },
);

export const useREPLStore = (): REPLStore =>
  guaranteeNonNullable(
    useContext(REPLStoreContext),
    `Can't find REPL store in context`,
  );

export const withREPLStore = (WrappedComponent: React.FC): React.FC =>
  function WithREPLStore() {
    return (
      <REPLStoreProvider>
        <WrappedComponent />
      </REPLStoreProvider>
    );
  };
