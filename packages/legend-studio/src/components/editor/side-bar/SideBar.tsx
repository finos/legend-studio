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

import { observer } from 'mobx-react-lite';
import { ACTIVITY_MODE } from '../../../stores/EditorConfig';
import { Explorer } from './Explorer';
import { LocalChanges } from './LocalChanges';
import { WorkspaceReview } from './WorkspaceReview';
import { WorkspaceUpdater } from './WorkspaceUpdater';
import { ConflictResolution } from './ConflictResolution';
import { ProjectOverview } from './ProjectOverview';
import { WorkflowManager } from './WorkflowManager';
import { useEditorStore } from '../EditorStoreProvider';

/**
 * Wrapper component around different implementations of sidebar, such as to view domain, to manage SDLC, etc.
 */
export const SideBar = observer(() => {
  const editorStore = useEditorStore();

  const renderSideBar = (): React.ReactNode => {
    switch (editorStore.activeActivity) {
      case ACTIVITY_MODE.EXPLORER:
        return <Explorer />;
      case ACTIVITY_MODE.CHANGES:
        return <LocalChanges />;
      case ACTIVITY_MODE.WORKSPACE_REVIEW:
        return <WorkspaceReview />;
      case ACTIVITY_MODE.WORKSPACE_UPDATER:
        return <WorkspaceUpdater />;
      case ACTIVITY_MODE.CONFLICT_RESOLUTION:
        return <ConflictResolution />;
      case ACTIVITY_MODE.PROJECT_OVERVIEW:
        return <ProjectOverview />;
      case ACTIVITY_MODE.WORKFLOW_MANAGER:
        return (
          <WorkflowManager
            workflowManagerState={editorStore.workspaceWorkflowManagerState}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="side-bar">
      <div className="side-bar__view">{renderSideBar()}</div>
    </div>
  );
});
