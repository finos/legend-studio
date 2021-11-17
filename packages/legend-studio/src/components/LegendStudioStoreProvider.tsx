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
import { LegendStudioStore } from '../stores/StudioStore';
import type { LegendStudioPluginManager } from '../application/LegendStudioPluginManager';
import { useLocalObservable } from 'mobx-react-lite';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendStudioConfig } from '../application/LegendStudioConfig';

const LegendStudioStoreContext = createContext<LegendStudioStore | undefined>(
  undefined,
);

export const LegendStudioStoreProvider = ({
  pluginManager,
  children,
}: {
  pluginManager: LegendStudioPluginManager;
  children: React.ReactNode;
}): React.ReactElement => {
  const applicationStore = useApplicationStore<LegendStudioConfig>();
  const sdlcServerClient = useSDLCServerClient();
  const depotServerClient = useDepotServerClient();
  const studioStore = useLocalObservable(
    () =>
      new LegendStudioStore(
        applicationStore,
        sdlcServerClient,
        depotServerClient,
        pluginManager,
      ),
  );
  return (
    <LegendStudioStoreContext.Provider value={studioStore}>
      {children}
    </LegendStudioStoreContext.Provider>
  );
};

export const useLegendStudioStore = (): LegendStudioStore =>
  guaranteeNonNullable(
    useContext(LegendStudioStoreContext),
    `Can't find Legend Studio store in context`,
  );
