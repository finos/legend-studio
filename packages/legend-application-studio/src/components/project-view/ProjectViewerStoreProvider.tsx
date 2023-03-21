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
import { ProjectViewerStore } from '../../stores/project-view/ProjectViewerStore.js';
import { EDITOR_MODE } from '../../stores/editor/EditorConfig.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useEditorStore } from '../editor/EditorStoreProvider.js';
import { ProjectViewerEditorMode } from '../../stores/project-view/ProjectViewerEditorMode.js';

const ProjectViewerStoreContext = createContext<ProjectViewerStore | undefined>(
  undefined,
);

export const ProjectViewerStoreProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const editorStore = useEditorStore();
  editorStore.setMode(EDITOR_MODE.VIEWER);
  const store = useLocalObservable(() => new ProjectViewerStore(editorStore));
  editorStore.setEditorMode(new ProjectViewerEditorMode(store));
  return (
    <ProjectViewerStoreContext.Provider value={store}>
      {children}
    </ProjectViewerStoreContext.Provider>
  );
};

export const useProjectViewerStore = (): ProjectViewerStore =>
  guaranteeNonNullable(
    useContext(ProjectViewerStoreContext),
    `Can't find project viewer store in context`,
  );

export const withProjectViewerStore = (WrappedComponent: React.FC): React.FC =>
  function WithProjectViewerStore() {
    return (
      <ProjectViewerStoreProvider>
        <WrappedComponent />
      </ProjectViewerStoreProvider>
    );
  };
