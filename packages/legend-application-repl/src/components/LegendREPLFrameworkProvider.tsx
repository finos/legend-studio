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
import type { LegendREPLPluginManager } from '../application/LegendREPLPluginManager.js';
import type { LegendREPLApplicationConfig } from '../application/LegendREPLApplicationConfig.js';
import {
  type LegendREPLApplicationStore,
  LegendREPLBaseStore,
} from '../stores/LegendREPLBaseStore.js';

export const useLegendREPLApplicationStore = (): LegendREPLApplicationStore =>
  useApplicationStore<LegendREPLApplicationConfig, LegendREPLPluginManager>();

const LegendREPLBaseStoreContext = createContext<
  LegendREPLBaseStore | undefined
>(undefined);

const LegendREPLBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const application = useLegendREPLApplicationStore();
  const store = useLocalObservable(() => new LegendREPLBaseStore(application));
  return (
    <LegendREPLBaseStoreContext.Provider value={store}>
      {children}
    </LegendREPLBaseStoreContext.Provider>
  );
};

export const LegendREPLFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider simple={true}>
    <LegendREPLBaseStoreProvider>{children}</LegendREPLBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
