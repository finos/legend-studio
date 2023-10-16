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
import { ShowcaseViewerStore } from '../../stores/showcase/ShowcaseViewerStore.js';
import { useEditorStore } from '../editor/EditorStoreProvider.js';
import { useLocalObservable } from 'mobx-react-lite';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { EDITOR_MODE } from '../../stores/editor/EditorConfig.js';
import { ShowcaseViewerEditorMode } from '../../stores/showcase/ShowcaseViewerEditorMode.js';

const ShowcaseViewerStoreContext = createContext<
  ShowcaseViewerStore | undefined
>(undefined);

export const ShowcaseViewerStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const editorStore = useEditorStore();
  editorStore.setMode(EDITOR_MODE.VIEWER);
  const store = useLocalObservable(() => new ShowcaseViewerStore(editorStore));
  editorStore.setEditorMode(new ShowcaseViewerEditorMode(store));
  return (
    <ShowcaseViewerStoreContext.Provider value={store}>
      {children}
    </ShowcaseViewerStoreContext.Provider>
  );
};

export const useShowcaseViewerStore = (): ShowcaseViewerStore =>
  guaranteeNonNullable(
    useContext(ShowcaseViewerStoreContext),
    `Can't find showcase viewer store in context`,
  );

export const withShowcaseViewerStore = (WrapperComponent: React.FC): React.FC =>
  function WithShowcaseViewerStore() {
    return (
      <ShowcaseViewerStoreProvider>
        <WrapperComponent />
      </ShowcaseViewerStoreProvider>
    );
  };
