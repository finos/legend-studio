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
import type { LegendREPLGridClientPluginManager } from '../application/LegendREPLGridClientPluginManager.js';
import type { LegendREPLGridClientApplicationConfig } from '../application/LegendREPLGridClientApplicationConfig.js';
import {
  type LegendREPLGridClientApplicationStore,
  LegendREPLGridClientBaseStore,
} from '../stores/LegendREPLGridClientBaseStore.js';

export const useLegendREPLGridClientApplicationStore =
  (): LegendREPLGridClientApplicationStore =>
    useApplicationStore<
      LegendREPLGridClientApplicationConfig,
      LegendREPLGridClientPluginManager
    >();

const LegendREPLGridClientBaseStoreContext = createContext<
  LegendREPLGridClientBaseStore | undefined
>(undefined);

const LegendREPLGridClientBaseStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendREPLGridClientApplicationStore();
  const store = useLocalObservable(
    () => new LegendREPLGridClientBaseStore(applicationStore),
  );
  return (
    <LegendREPLGridClientBaseStoreContext.Provider value={store}>
      {children}
    </LegendREPLGridClientBaseStoreContext.Provider>
  );
};

export const LegendREPLGridClientFrameworkProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <ApplicationFrameworkProvider>
    <LegendREPLGridClientBaseStoreProvider>
      {children}
    </LegendREPLGridClientBaseStoreProvider>
  </ApplicationFrameworkProvider>
);
