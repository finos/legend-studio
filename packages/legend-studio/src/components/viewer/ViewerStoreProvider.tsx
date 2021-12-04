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

import { useContext, createContext } from 'react';
import { useLocalObservable } from 'mobx-react-lite';
import { ViewerStore } from '../../stores/ViewerStore';
import { EDITOR_MODE } from '../../stores/EditorConfig';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useEditorStore } from '../editor/EditorStoreProvider';
import { ViewerEditorMode } from '../../stores/viewer/ViewerEditorMode';

const ViewerStoreContext = createContext<ViewerStore | undefined>(undefined);

export const ViewerStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const editorStore = useEditorStore();
  editorStore.setMode(EDITOR_MODE.VIEWER);
  const store = useLocalObservable(() => new ViewerStore(editorStore));
  editorStore.setEditorMode(new ViewerEditorMode(store));
  return (
    <ViewerStoreContext.Provider value={store}>
      {children}
    </ViewerStoreContext.Provider>
  );
};

export const useViewerStore = (): ViewerStore =>
  guaranteeNonNullable(
    useContext(ViewerStoreContext),
    `Can't find viewer store in context`,
  );
