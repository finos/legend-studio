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
import { REPLGridClientStore } from '../stores/REPLGridClientStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendREPLGridClientApplicationConfig } from '../application/LegendREPLGridClientApplicationConfig.js';
import type { LegendREPLGridClientPluginManager } from '../application/LegendREPLGridClientPluginManager.js';

const EditorStoreContext = createContext<REPLGridClientStore | undefined>(
  undefined,
);

export const REPLGridClientStoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const applicationStore = useApplicationStore<
    LegendREPLGridClientApplicationConfig,
    LegendREPLGridClientPluginManager
  >();
  const store = useLocalObservable(
    () => new REPLGridClientStore(applicationStore),
  );
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  );
};

export const useREPLGridClientStore = (): REPLGridClientStore =>
  guaranteeNonNullable(
    useContext(EditorStoreContext),
    `Can't find editor store in context`,
  );

export const withEditorStore = (WrappedComponent: React.FC): React.FC =>
  function WithEditorStore() {
    return (
      <REPLGridClientStoreProvider>
        <WrappedComponent />
      </REPLGridClientStoreProvider>
    );
  };
