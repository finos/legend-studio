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
  const syncWithWorkspace = applicationStore.guaranteeSafeAction(() =>
    flowResult(editorStore.localChangesState.syncWithWorkspace()),
  );
  const syncStatusText =
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
  const handleTextModeClick = applicationStore.guaranteeSafeAction(() =>
    flowResult(editorStore.toggleTextMode()),
  );
  const compile = applicationStore.guaranteeSafeAction(
    editorStore.isInGrammarTextMode
      ? (): Promise<void> =>
          flowResult(editorStore.graphState.globalCompileInTextMode())
      : (): Promise<void> =>
          flowResult(editorStore.graphState.globalCompileInFormMode()),
  );
  const generate = applicationStore.guaranteeSafeAction(() =>
    flowResult(editorStore.graphState.graphGenerationState.globalGenerate()),
  );
  const emptyGenerationEntities = applicationStore.guaranteeSafeAction(() =>
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
            <Link
              to={generateSetupRoute(
                applicationStore.config.currentSDLCServerOption,
                projectId,
              )}
            >
              {currentProject?.name ?? 'unknown'}
            </Link>
          </div>
          /
          <div className="editor__status-bar__workspace__workspace">
            <Link
              to={generateSetupRoute(
                applicationStore.config.currentSDLCServerOption,
                projectId,
                workspaceId,
                workspaceType,
              )}
            >
              {workspaceId}
            </Link>
          </div>
          {editorStore.sdlcState.isWorkspaceOutOfSync && (
            <button
              className="editor__status-bar__workspace__status"
              tabIndex={-1}
              onClick={goToLocalChanges}
              title={
                'Local workspace out of sync. Click to see incoming changes to your workspace.'
              }
            >
              OUT-OF-SYNC
            </button>
          )}
          {editorStore.sdlcState.isWorkspaceOutdated &&
            !editorStore.sdlcState.isWorkspaceOutOfSync && (
              <button
                className="editor__status-bar__workspace__status"
                tabIndex={-1}
                onClick={goToWorkspaceUpdater}
                title={
                  'Workspace is outdated. Click to see latest changes of the project'
                }
              >
                WORKSPACE OUTDATED
              </button>
            )}
        </div>
      </div>
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.EDITOR__STATUS_BAR__RIGHT}
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
              <SyncIcon />
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
                editorStore.changeDetectionState
                  .workspaceLocalLatestRevisionState
                  .isBuildingEntityHashesIndex ||
                actionsDisabled
              }
              tabIndex={-1}
              title={'Sync with workspace (Ctrl + S)'}
            >
              <SyncIcon />
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
