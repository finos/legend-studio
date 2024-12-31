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
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type ApplicationStore,
  useApplicationStore,
  ApplicationFrameworkProvider,
} from '@finos/legend-application';
import type { LegendDataCubeApplicationConfig } from '../application/LegendDataCubeApplicationConfig.js';
import type { LegendDataCubePluginManager } from '../application/LegendDataCubePluginManager.js';
import { LegendDataCubeBaseStore } from '../stores/LegendDataCubeBaseStore.js';

export const useLegendDataCubeApplicationStore = (): ApplicationStore<
  LegendDataCubeApplicationConfig,
  LegendDataCubePluginManager
> =>
  useApplicationStore<
    LegendDataCubeApplicationConfig,
    LegendDataCubePluginManager
  >();

const LegendDataCubeBaseStoreContext = createContext<
  LegendDataCubeBaseStore | undefined
>(undefined);

const LegendDataCubeBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const application = useLegendDataCubeApplicationStore();
  const store = useLocalObservable(
    () => new LegendDataCubeBaseStore(application),
  );
  return (
    <LegendDataCubeBaseStoreContext.Provider value={store}>
      {children}
    </LegendDataCubeBaseStoreContext.Provider>
  );
};

export const useLegendDataCubeBaseStore = (): LegendDataCubeBaseStore =>
  guaranteeNonNullable(
    useContext(LegendDataCubeBaseStoreContext),
    `Can't find Legend DataCube base store in context`,
  );

export const LegendDataCubeFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider simple={true}>
    <LegendDataCubeBaseStoreProvider>
      {children}
    </LegendDataCubeBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
