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
import { LegendREPLBaseStore } from '../stores/LegendREPLBaseStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { type LegendREPLApplicationConfig } from '../application/LegendREPLApplicationConfig.js';
import {
  useApplicationStore,
  ApplicationFrameworkProvider,
  type LegendApplicationPluginManager,
  type LegendApplicationPlugin,
} from '@finos/legend-application';

const LegendREPLBaseStoreContext = createContext<
  LegendREPLBaseStore | undefined
>(undefined);

const LegendREPLBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const application = useApplicationStore<
    LegendREPLApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >();
  const store = useLocalObservable(() => new LegendREPLBaseStore(application));
  return (
    <LegendREPLBaseStoreContext.Provider value={store}>
      {children}
    </LegendREPLBaseStoreContext.Provider>
  );
};

export const useLegendREPLBaseStore = (): LegendREPLBaseStore =>
  guaranteeNonNullable(
    useContext(LegendREPLBaseStoreContext),
    `Can't find Legend REPL base store in context`,
  );

export const LegendREPLFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider simple={true}>
    <LegendREPLBaseStoreProvider>{children}</LegendREPLBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
