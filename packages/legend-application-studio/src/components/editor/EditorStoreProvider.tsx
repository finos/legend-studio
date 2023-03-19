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
import { EditorStore } from '../../stores/EditorStore.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useSDLCServerClient } from '@finos/legend-server-sdlc';
import { useDepotServerClient } from '@finos/legend-server-depot';
import { useLegendStudioApplicationStore } from '../LegendStudioBaseStoreProvider.js';

const EditorStoreContext = createContext<EditorStore | undefined>(undefined);

export const EditorStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const applicationStore = useLegendStudioApplicationStore();
  const sdlcServerClient = useSDLCServerClient();
  const depotServerClient = useDepotServerClient();
  const store = useLocalObservable(
    () =>
      new EditorStore(applicationStore, sdlcServerClient, depotServerClient),
  );
  return (
    <EditorStoreContext.Provider value={store}>
      {children}
    </EditorStoreContext.Provider>
  );
};

export const useEditorStore = (): EditorStore =>
  guaranteeNonNullable(
    useContext(EditorStoreContext),
    `Can't find editor store in context`,
  );

export const withEditorStore = (WrappedComponent: React.FC): React.FC =>
  function WithEditorStore() {
    return (
      <EditorStoreProvider>
        <WrappedComponent />
      </EditorStoreProvider>
    );
  };
