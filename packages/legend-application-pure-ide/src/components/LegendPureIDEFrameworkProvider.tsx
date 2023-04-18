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

import { createContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import {
  ApplicationFrameworkProvider,
  useApplicationStore,
} from '@finos/legend-application';
import type { LegendPureIDEPluginManager } from '../application/LegendPureIDEPluginManager.js';
import type { LegendPureIDEApplicationConfig } from '../application/LegendPureIDEApplicationConfig.js';
import {
  type LegendPureIDEApplicationStore,
  LegendPureIDEBaseStore,
} from '../stores/LegendPureIDEBaseStore.js';

export const useLegendPureIDEApplicationStore =
  (): LegendPureIDEApplicationStore =>
    useApplicationStore<
      LegendPureIDEApplicationConfig,
      LegendPureIDEPluginManager
    >();

const LegendPureIDEBaseStoreContext = createContext<
  LegendPureIDEBaseStore | undefined
>(undefined);

const LegendPureIDEBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendPureIDEApplicationStore();
  const store = useLocalObservable(
    () => new LegendPureIDEBaseStore(applicationStore),
  );
  return (
    <LegendPureIDEBaseStoreContext.Provider value={store}>
      {children}
    </LegendPureIDEBaseStoreContext.Provider>
  );
};

export const LegendPureIDEFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider>
    <LegendPureIDEBaseStoreProvider>{children}</LegendPureIDEBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
