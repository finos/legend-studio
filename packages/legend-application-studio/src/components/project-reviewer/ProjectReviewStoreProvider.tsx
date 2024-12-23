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
import { ProjectReviewerStore } from '../../stores/project-reviewer/ProjectReviewerStore.js';
import { EDITOR_MODE } from '../../stores/editor/EditorConfig.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { useEditorStore } from '../editor/EditorStoreProvider.js';

const ProjectReviewerStoreContext = createContext<
  ProjectReviewerStore | undefined
>(undefined);

export const ProjectReviewerStoreProvider = (props: {
  children: React.ReactNode;
}) => {
  const { children } = props;
  const editorStore = useEditorStore();
  editorStore.setMode(EDITOR_MODE.REVIEW);
  const store = useLocalObservable(() => new ProjectReviewerStore(editorStore));
  return (
    <ProjectReviewerStoreContext.Provider value={store}>
      {children}
    </ProjectReviewerStoreContext.Provider>
  );
};

export const useProjectReviewerStore = (): ProjectReviewerStore =>
  guaranteeNonNullable(
    useContext(ProjectReviewerStoreContext),
    `Can't find workspace review store in context`,
  );

export const withProjectReviewerStore = (
  WrappedComponent: React.FC,
): React.FC =>
  function WithProjecteReviewerStore() {
    return (
      <ProjectReviewerStoreProvider>
        <WrappedComponent />
      </ProjectReviewerStoreProvider>
    );
  };
