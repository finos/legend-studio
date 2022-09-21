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
import { useSDLCServerClient } from '@finos/legend-server-sdlc';
import { useDepotServerClient } from '@finos/legend-server-depot';
import {
  type LegendStudioApplicationStore,
  LegendStudioBaseStore,
} from '../stores/LegendStudioBaseStore.js';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager.js';
import { useLocalObservable } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
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

export const LegendStudioBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const sdlcServerClient = useSDLCServerClient();
  const depotServerClient = useDepotServerClient();
  const baseStore = useLocalObservable(
    () =>
      new LegendStudioBaseStore(
        applicationStore,
        sdlcServerClient,
        depotServerClient,
      ),
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
