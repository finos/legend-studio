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
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type LegendStudioApplicationStore,
  LegendStudioBaseStore,
} from '../stores/LegendStudioBaseStore.js';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import { useLocalObservable } from 'mobx-react-lite';
import {
  ApplicationFrameworkProvider,
  useApplicationStore,
} from '@finos/legend-application';
import type { LegendStudioApplicationConfig } from '../application/LegendStudioApplicationConfig.js';

export const useLegendStudioApplicationStore =
  (): LegendStudioApplicationStore =>
    useApplicationStore<
      LegendStudioApplicationConfig,
      LegendStudioPluginManager
    >();

const LegendStudioBaseStoreContext = createContext<
  LegendStudioBaseStore | undefined
>(undefined);

const LegendStudioBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const baseStore = useLocalObservable(
    () => new LegendStudioBaseStore(applicationStore),
  );
  return (
    <LegendStudioBaseStoreContext.Provider value={baseStore}>
      {children}
    </LegendStudioBaseStoreContext.Provider>
  );
};

export const useLegendStudioBaseStore = (): LegendStudioBaseStore =>
  guaranteeNonNullable(
    useContext(LegendStudioBaseStoreContext),
    `Can't find Legend Studio base store in context`,
  );

export const LegendStudioFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider>
    <LegendStudioBaseStoreProvider>{children}</LegendStudioBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
