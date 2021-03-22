/**
 * Copyright Goldman Sachs
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
  FaFire,
  FaCodeBranch,
  FaRegWindowMaximize,
  FaTerminal,
  FaUserSecret,
  FaHammer,
  FaBrush,
} from 'react-icons/fa';
import { Link, useParams } from 'react-router-dom';
import { useEditorStore } from '../../stores/EditorStore';
import { clsx } from '@finos/legend-studio-components';
import { GoSync } from 'react-icons/go';
import { CORE_TEST_ID } from '../../const';
import { ACTIVITY_MODE } from '../../stores/EditorConfig';
import type { EditorRouteParams } from '../../stores/RouterConfig';
import { getSetupRoute } from '../../stores/RouterConfig';
import { useApplicationStore } from '../../stores/ApplicationStore';
import { flowResult } from 'mobx';

export const StatusBar = observer((props: { actionsDisabled: boolean }) => {
  const { actionsDisabled } = props;
  const params = useParams<EditorRouteParams>();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const isInConflictResolutionMode = editorStore.isInConflictResolutionMode;
  // SDLC
  const projectId = params.projectId;
  const workspaceId = params.workspaceId;
  const currentProject = editorStore.sdlcState.currentProject;
  const goToWorkspaceUpdater = (): void =>
    editorStore.setActiveActivity(
      isInConflictResolutionMode
        ? ACTIVITY_MODE.CONFLICT_RESOLUTION
        : ACTIVITY_MODE.WORKSPACE_UPDATER,
    );
  // Change Detection
  const changes =
    editorStore.changeDetectionState.workspaceLatestRevisionState.changes
      .length;
  const configurationState = editorStore.projectConfigurationEditorState;
  const syncWithWorkspace = applicationStore.guaranteeSafeAction(() =>
    editorStore.localChangesState.syncWithWorkspace(),
  );
  const syncStatusText =
    editorStore.graphState.graph.failedToBuild ||
    editorStore.changeDetectionState.forcedStop
      ? 'change detection halted'
      : !editorStore.changeDetectionState.isChangeDetectionRunning
      ? !editorStore.changeDetectionState.hasChangeDetectionStarted
        ? 'starting change detection...'
        : 'restarting change detection...'
      : editorStore.changeDetectionState.workspaceLatestRevisionState
          .isBuildingEntityHashesIndex
      ? 'building indexes...'
      : editorStore.localChangesState.isSyncingWithWorkspace
      ? 'syncing with workspace...'
      : configurationState.isUpdatingConfiguration
      ? 'updating configuration...'
      : changes
      ? `${changes} unsynced changes`
      : 'synced with workspace';
  // Conflict resolution
  const conflicts = editorStore.conflictResolutionState.conflicts.length;
  const acceptConflictResolution = applicationStore.guaranteeSafeAction(() =>
    editorStore.conflictResolutionState.acceptConflictResolution(),
  );
  const conflictResolutionStatusText =
    editorStore.graphState.graph.failedToBuild ||
    editorStore.changeDetectionState.forcedStop
      ? 'change detection halted'
      : !editorStore.changeDetectionState.isChangeDetectionRunning
      ? !editorStore.changeDetectionState.hasChangeDetectionStarted
        ? 'starting change detection...'
        : 'restarting change detection...'
      : editorStore.changeDetectionState.workspaceLatestRevisionState
          .isBuildingEntityHashesIndex
      ? 'building indexes...'
      : editorStore.conflictResolutionState.isAcceptingConflictResolution
      ? 'submitting conflict resolution...'
      : conflicts
      ? `has unresolved merge conflicts`
      : editorStore.conflictResolutionState.hasResolvedAllConflicts
      ? 'conflict resolution not accepted'
      : 'all conflicts resolved';

  // Other actions
  const toggleAuxPanel = (): void => editorStore.toggleAuxPanel();
  const toggleExpandMode = (): void =>
    editorStore.setExpandedMode(!editorStore.isInExpandedMode);
  const handleTextModeClick = applicationStore.guaranteeSafeAction(() =>
    editorStore.toggleTextMode(),
  );
  const compile = applicationStore.guaranteeSafeAction(
    editorStore.isInGrammarTextMode
      ? (): Promise<void> => editorStore.graphState.globalCompileInTextMode()
      : (): Promise<void> =>
          flowResult(editorStore.graphState.globalCompileInFormMode()),
  );
  const generate = applicationStore.guaranteeSafeAction(() =>
    editorStore.graphState.graphGenerationState.globalGenerate(),
  );
  const emptyGenerationEntities = applicationStore.guaranteeSafeAction(() =>
    editorStore.graphState.graphGenerationState.clearGenerations(),
  );

  return (
    <div
      data-testid={CORE_TEST_ID.STATUS_BAR}
      className={clsx('editor__status-bar', {
        'editor__status-bar--conflict-resolution': isInConflictResolutionMode,
      })}
    >
      <div className="editor__status-bar__left">
        <div className="editor__status-bar__workspace">
          <div className="editor__status-bar__workspace__icon">
            <FaCodeBranch />
          </div>
          <div className="editor__status-bar__workspace__project">
            <Link to={getSetupRoute(projectId)}>
              {currentProject?.name ?? 'unknown'}
            </Link>
          </div>
          /
          <div className="editor__status-bar__workspace__workspace">
            <Link to={getSetupRoute(projectId, workspaceId)}>
              {workspaceId}
            </Link>
          </div>
          {editorStore.sdlcState.isWorkspaceOutdated && (
            <button
              className="editor__status-bar__workspace__status"
              tabIndex={-1}
              onClick={goToWorkspaceUpdater}
              title={
                'Workspace is outdated. Click to see project latest changes'
              }
            >
              OUTDATED
            </button>
          )}
        </div>
      </div>
      <div
        data-testid={CORE_TEST_ID.EDITOR__STATUS_BAR__RIGHT}
        className="editor__status-bar__right"
      >
        {isInConflictResolutionMode && (
          <div className="editor__status-bar__sync">
            <div className="editor__status-bar__sync__status">
              {conflictResolutionStatusText}
            </div>
            <button
              className={clsx('editor__status-bar__sync__btn', {
                'editor__status-bar__sync__btn--spinning':
                  editorStore.conflictResolutionState
                    .isAcceptingConflictResolution,
              })}
              onClick={acceptConflictResolution}
              disabled={
                Boolean(conflicts) ||
                !editorStore.conflictResolutionState.hasResolvedAllConflicts ||
                editorStore.localChangesState.isSyncingWithWorkspace ||
                editorStore.workspaceUpdaterState.isUpdatingWorkspace ||
                editorStore.conflictResolutionState
                  .isInitializingConflictResolution ||
                editorStore.conflictResolutionState
                  .isAcceptingConflictResolution ||
                editorStore.conflictResolutionState
                  .isDiscardingConflictResolutionChanges ||
                editorStore.conflictResolutionState.isAbortingConflictResolution
              }
              tabIndex={-1}
              title={'Accept conflict resolution'}
            >
              <GoSync />
            </button>
          </div>
        )}
        {!isInConflictResolutionMode && (
          <div className="editor__status-bar__sync">
            <div className="editor__status-bar__sync__status">
              {syncStatusText}
            </div>
            <button
              className={clsx('editor__status-bar__sync__btn', {
                'editor__status-bar__sync__btn--spinning':
                  editorStore.localChangesState.isSyncingWithWorkspace ||
                  configurationState.isUpdatingConfiguration,
              })}
              onClick={syncWithWorkspace}
              disabled={
                !changes ||
                configurationState.isUpdatingConfiguration ||
                editorStore.localChangesState.isSyncingWithWorkspace ||
                editorStore.changeDetectionState.workspaceLatestRevisionState
                  .isBuildingEntityHashesIndex ||
                actionsDisabled
              }
              tabIndex={-1}
              title={'Sync with workspace (Ctrl + S)'}
            >
              <GoSync />
            </button>
          </div>
        )}
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__generate-btn',
            {
              'editor__status-bar__generate-btn--wiggling':
                editorStore.graphState.graphGenerationState
                  .isRunningGlobalGenerate,
            },
          )}
          disabled={
            editorStore.graphState.isApplicationUpdateOperationIsRunning ||
            actionsDisabled ||
            !editorStore.graphState.graph.generationSpecifications.length
          }
          onClick={generate}
          tabIndex={-1}
          title={'Generate (F10)'}
        >
          <FaFire />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__clear__generation-btn ',
            {
              'editor__status-bar__action editor__status-bar__clear__generation-btn--wiggling':
                editorStore.graphState.graphGenerationState
                  .isClearingGenerationEntities,
            },
          )}
          disabled={
            editorStore.graphState.isApplicationUpdateOperationIsRunning ||
            actionsDisabled
          }
          onClick={emptyGenerationEntities}
          tabIndex={-1}
          title={'Clear generation entities'}
        >
          <FaBrush />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__compile-btn',
            {
              'editor__status-bar__compile-btn--wiggling':
                editorStore.graphState.isRunningGlobalCompile,
            },
          )}
          disabled={
            editorStore.graphState.isApplicationUpdateOperationIsRunning ||
            actionsDisabled
          }
          onClick={compile}
          tabIndex={-1}
          title={'Compile (F9)'}
        >
          <FaHammer />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action__toggler--active':
                editorStore.isInExpandedMode,
            },
          )}
          onClick={toggleExpandMode}
          tabIndex={-1}
          title={'Maximize/Minimize'}
        >
          <FaRegWindowMaximize />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action__toggler--active': Boolean(
                editorStore.auxPanelSize,
              ),
            },
          )}
          onClick={toggleAuxPanel}
          tabIndex={-1}
          title={'Toggle auxiliary panel (Ctrl + `)'}
        >
          <FaTerminal />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action editor__status-bar__action__toggler--active':
                editorStore.isInGrammarTextMode,
            },
          )}
          disabled={actionsDisabled}
          onClick={handleTextModeClick}
          tabIndex={-1}
          title={'Toggle text mode (F8)'}
        >
          <FaUserSecret />
        </button>
      </div>
    </div>
  );
});
