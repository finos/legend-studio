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
import { Link, useParams } from 'react-router-dom';
import {
  clsx,
  HammerIcon,
  SyncIcon,
  FireIcon,
  CodeBranchIcon,
  WindowMaximizeIcon,
  TerminalIcon,
  HackerIcon,
  BrushIcon,
  CloudUploadIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID';
import { ACTIVITY_MODE } from '../../stores/EditorConfig';
import {
  generateSetupRoute,
  type EditorPathParams,
  type GroupEditorPathParams,
} from '../../stores/LegendStudioRouter';
import { flowResult } from 'mobx';
import { useEditorStore } from './EditorStoreProvider';
import { useApplicationStore } from '@finos/legend-application';
import type { LegendStudioConfig } from '../../application/LegendStudioConfig';
import { WorkspaceType } from '@finos/legend-server-sdlc';

export const StatusBar = observer((props: { actionsDisabled: boolean }) => {
  const { actionsDisabled } = props;
  const params = useParams<EditorPathParams | GroupEditorPathParams>();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore<LegendStudioConfig>();
  const isInConflictResolutionMode = editorStore.isInConflictResolutionMode;
  // SDLC
  const projectId = params.projectId;
  const workspaceType = (params as { groupWorkspaceId: string | undefined })
    .groupWorkspaceId
    ? WorkspaceType.GROUP
    : WorkspaceType.USER;
  const workspaceId =
    workspaceType === WorkspaceType.GROUP
      ? (params as GroupEditorPathParams).groupWorkspaceId
      : (params as EditorPathParams).workspaceId;
  const currentProject = editorStore.sdlcState.currentProject;
  const goToWorkspaceUpdater = (): void =>
    editorStore.setActiveActivity(
      isInConflictResolutionMode
        ? ACTIVITY_MODE.CONFLICT_RESOLUTION
        : ACTIVITY_MODE.WORKSPACE_UPDATER,
    );
  const goToLocalChanges = (): void =>
    editorStore.setActiveActivity(ACTIVITY_MODE.LOCAL_CHANGES);
  // Change Detection
  const changes =
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length;
  const configurationState = editorStore.projectConfigurationEditorState;
  const pushLocalChanges = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.localChangesState.pushLocalChanges()),
  );
  const pushStatusText =
    editorStore.graphManagerState.graph.buildState.hasFailed ||
    editorStore.changeDetectionState.forcedStop
      ? 'change detection halted'
      : !editorStore.changeDetectionState.isChangeDetectionRunning
      ? !editorStore.changeDetectionState.hasChangeDetectionStarted
        ? 'starting change detection...'
        : 'restarting change detection...'
      : editorStore.changeDetectionState.workspaceLocalLatestRevisionState
          .isBuildingEntityHashesIndex
      ? 'building indexes...'
      : editorStore.localChangesState.pushChangesState.isInProgress
      ? 'pushing local changes...'
      : configurationState.isUpdatingConfiguration
      ? 'updating configuration...'
      : changes
      ? `${changes} unpushed changes`
      : 'no changes detected';
  const workspaceOutOfSync =
    !actionsDisabled && editorStore.sdlcState.isWorkspaceOutOfSync;
  // Conflict resolution
  const conflicts = editorStore.conflictResolutionState.conflicts.length;
  const acceptConflictResolution = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.conflictResolutionState.acceptConflictResolution()),
  );
  const conflictResolutionStatusText =
    editorStore.graphManagerState.graph.buildState.hasFailed ||
    editorStore.changeDetectionState.forcedStop
      ? 'change detection halted'
      : !editorStore.changeDetectionState.isChangeDetectionRunning
      ? !editorStore.changeDetectionState.hasChangeDetectionStarted
        ? 'starting change detection...'
        : 'restarting change detection...'
      : editorStore.changeDetectionState.workspaceLocalLatestRevisionState
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
  const toggleAuxPanel = (): void => editorStore.auxPanelDisplayState.toggle();
  const toggleExpandMode = (): void =>
    editorStore.setExpandedMode(!editorStore.isInExpandedMode);
  const handleTextModeClick = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.toggleTextMode()),
  );
  const compile = applicationStore.guardUnhandledError(() =>
    editorStore.isInGrammarTextMode
      ? flowResult(editorStore.graphState.globalCompileInTextMode())
      : flowResult(editorStore.graphState.globalCompileInFormMode()),
  );
  const generate = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.graphState.graphGenerationState.globalGenerate()),
  );
  const emptyGenerationEntities = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.graphState.graphGenerationState.clearGenerations()),
  );

  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
      className={clsx('editor__status-bar', {
        'editor__status-bar--conflict-resolution': isInConflictResolutionMode,
      })}
    >
      <div className="editor__status-bar__left">
        <div className="editor__status-bar__workspace">
          <div className="editor__status-bar__workspace__icon">
            <CodeBranchIcon />
          </div>
          <div className="editor__status-bar__workspace__project">
            <Link to={generateSetupRoute(projectId)}>
              {currentProject?.name ?? 'unknown'}
            </Link>
          </div>
          /
          <div className="editor__status-bar__workspace__workspace">
            <Link
              to={generateSetupRoute(projectId, workspaceId, workspaceType)}
            >
              {workspaceId}
            </Link>
          </div>
          {workspaceOutOfSync && (
            <button
              className="editor__status-bar__workspace__status"
              tabIndex={-1}
              onClick={goToLocalChanges}
              title={
                'Local workspace is out-of-sync. Click to see incoming changes to your workspace.'
              }
            >
              OUT-OF-SYNC
            </button>
          )}
          {editorStore.sdlcState.isWorkspaceOutdated && !workspaceOutOfSync && (
            <button
              className="editor__status-bar__workspace__status"
              tabIndex={-1}
              onClick={goToWorkspaceUpdater}
              title={
                'Workspace is outdated. Click to see latest changes of the project'
              }
            >
              OUTDATED
            </button>
          )}
        </div>
      </div>
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.EDITOR__STATUS_BAR__RIGHT}
        className="editor__status-bar__right"
      >
        {isInConflictResolutionMode && (
          <div className="editor__status-bar__workspace-sync">
            <div className="editor__status-bar__workspace-sync__status">
              {conflictResolutionStatusText}
            </div>
            <button
              className={clsx('editor__status-bar__push-changes__btn', {
                'editor__status-bar__push-changes__btn--loading':
                  editorStore.conflictResolutionState
                    .isAcceptingConflictResolution,
              })}
              onClick={acceptConflictResolution}
              disabled={
                Boolean(conflicts) ||
                !editorStore.conflictResolutionState.hasResolvedAllConflicts ||
                editorStore.localChangesState.pushChangesState.isInProgress ||
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
              <SyncIcon />
            </button>
          </div>
        )}
        {!isInConflictResolutionMode && (
          <div className="editor__status-bar__workspace-sync">
            <div className="editor__status-bar__workspace-sync__status">
              {pushStatusText}
            </div>
            <button
              className={clsx('editor__status-bar__push-changes__btn', {
                'editor__status-bar__push-changes__btn--loading':
                  editorStore.localChangesState.pushChangesState.isInProgress ||
                  configurationState.isUpdatingConfiguration,
              })}
              onClick={pushLocalChanges}
              disabled={
                !changes ||
                configurationState.isUpdatingConfiguration ||
                editorStore.localChangesState.pushChangesState.isInProgress ||
                editorStore.changeDetectionState
                  .workspaceLocalLatestRevisionState
                  .isBuildingEntityHashesIndex ||
                actionsDisabled
              }
              tabIndex={-1}
              title={'Push local changes (Ctrl + S)'}
            >
              <CloudUploadIcon />
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
            !editorStore.graphManagerState.graph.ownGenerationSpecifications
              .length
          }
          onClick={generate}
          tabIndex={-1}
          title={'Generate (F10)'}
        >
          <FireIcon />
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
          <BrushIcon />
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
          title="Compile (F9)"
        >
          <HammerIcon />
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
          <WindowMaximizeIcon />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action__toggler--active':
                editorStore.auxPanelDisplayState.isOpen,
            },
          )}
          onClick={toggleAuxPanel}
          tabIndex={-1}
          title={'Toggle auxiliary panel (Ctrl + `)'}
        >
          <TerminalIcon />
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
          <HackerIcon />
        </button>
      </div>
    </div>
  );
});
