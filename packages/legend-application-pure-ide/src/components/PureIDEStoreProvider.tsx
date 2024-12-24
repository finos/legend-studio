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
import { PureIDEStore } from '../stores/PureIDEStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendPureIDEApplicationConfig } from '../application/LegendPureIDEApplicationConfig.js';
import type { LegendPureIDEPluginManager } from '../application/LegendPureIDEPluginManager.js';

const PureIDEStoreContext = createContext<PureIDEStore | undefined>(undefined);

export const PureIDEStoreProvider = (props: { children: React.ReactNode }) => {
  const { children } = props;
  const applicationStore = useApplicationStore<
    LegendPureIDEApplicationConfig,
    LegendPureIDEPluginManager
  >();
  const store = useLocalObservable(() => new PureIDEStore(applicationStore));
  return (
    <PureIDEStoreContext.Provider value={store}>
      {children}
    </PureIDEStoreContext.Provider>
  );
};

export const usePureIDEStore = (): PureIDEStore =>
  guaranteeNonNullable(
    useContext(PureIDEStoreContext),
    `Can't find editor store in context`,
  );

export const withEditorStore = (WrappedComponent: React.FC): React.FC =>
  function WithEditorStore() {
    return (
      <PureIDEStoreProvider>
        <WrappedComponent />
      </PureIDEStoreProvider>
    );
  };
