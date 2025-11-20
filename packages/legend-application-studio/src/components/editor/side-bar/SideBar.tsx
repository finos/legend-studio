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
import {
  ACTIVITY_MODE,
  USER_JOURNEYS,
} from '../../../stores/editor/EditorConfig.js';
import { Explorer } from './Explorer.js';
import { LocalChanges } from './LocalChanges.js';
import { WorkspaceReview } from './WorkspaceReview.js';
import { WorkspaceUpdater } from './WorkspaceUpdater.js';
import { WorkspaceUpdateConflictResolver } from './WorkspaceUpdateConflictResolver.js';
import { ProjectOverview } from './ProjectOverview.js';
import { WorkflowManager } from './WorkflowManager.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { GlobalTestRunner } from './testable/GlobalTestRunner.js';
import { RegisterService } from './RegisterService.js';
import { EndToEndWorkflow } from './end-to-end-workflow/EndToEndWorkflows.js';
import { DevMetadataPanel } from './DevMetadataPanel.js';

/**
 * Wrapper component around different implementations of sidebar, such as to view domain, to manage SDLC, etc.
 */
export const SideBar = observer(() => {
  const editorStore = useEditorStore();

  const renderSideBar = (): React.ReactNode => {
    switch (editorStore.activeActivity) {
      case ACTIVITY_MODE.EXPLORER:
        return <Explorer />;
      case ACTIVITY_MODE.LOCAL_CHANGES:
        return <LocalChanges />;
      case ACTIVITY_MODE.WORKSPACE_REVIEW:
        return <WorkspaceReview />;
      case ACTIVITY_MODE.WORKSPACE_UPDATER:
        return <WorkspaceUpdater />;
      case ACTIVITY_MODE.CONFLICT_RESOLUTION:
        return <WorkspaceUpdateConflictResolver />;
      case ACTIVITY_MODE.PROJECT_OVERVIEW:
        return <ProjectOverview />;
      case ACTIVITY_MODE.WORKFLOW_MANAGER:
        return (
          <WorkflowManager
            workflowManagerState={editorStore.workspaceWorkflowManagerState}
          />
        );
      case ACTIVITY_MODE.TEST_RUNNER:
        return (
          <GlobalTestRunner
            globalTestRunnerState={editorStore.globalTestRunnerState}
          />
        );
      case ACTIVITY_MODE.DEV_MODE:
        return <DevMetadataPanel />;
      case ACTIVITY_MODE.REGISTER_SERVICES:
        return (
          <RegisterService
            globalBulkServiceRegistrationState={
              editorStore.globalBulkServiceRegistrationState
            }
          />
        );
      case USER_JOURNEYS.END_TO_END_WORKFLOWS:
        return (
          <EndToEndWorkflow
            globalEndToEndWorkflowState={
              editorStore.globalEndToEndWorkflowState
            }
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
