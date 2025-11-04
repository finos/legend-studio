/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { DepotDashboardStore } from '../stores/DepotDashboardStore.js';
import {
  useLegendStudioApplicationStore,
  useLegendStudioBaseStore,
} from '@finos/legend-application-studio';
import { useLocalObservable } from 'mobx-react-lite';
import { guaranteeNonNullable } from '@finos/legend-shared';

const DepotSetupStoreContext = createContext<DepotDashboardStore | undefined>(
  undefined,
);
const DepotSetupStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLegendStudioBaseStore();

  const store = useLocalObservable(
    () =>
      new DepotDashboardStore(applicationStore, baseStore.depotServerClient),
  );

  return (
    <DepotSetupStoreContext.Provider value={store}>
      {children}
    </DepotSetupStoreContext.Provider>
  );
};

export const useDepotSetupStore = (): DepotDashboardStore =>
  guaranteeNonNullable(
    useContext(DepotSetupStoreContext),
    `Can't find depot setup store in context`,
  );

export const withDepotSetupStore = (WrappedComponent: React.FC): React.FC =>
  function WithDdepotSetupStore() {
    return (
      <DepotSetupStoreProvider>
        <WrappedComponent />
      </DepotSetupStoreProvider>
    );
  };
