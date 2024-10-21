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
  clsx,
  HammerIcon,
  SyncIcon,
  FireIcon,
  CodeBranchIcon,
  TerminalIcon,
  HackerIcon,
  TrashIcon,
  CloudUploadIcon,
  AssistantIcon,
  ErrorIcon,
  WarningIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import {
  ACTIVITY_MODE,
  PANEL_MODE,
  GRAPH_EDITOR_MODE,
} from '../../stores/editor/EditorConfig.js';
import {
  generateSetupRoute,
  type WorkspaceEditorPathParams,
} from '../../__lib__/LegendStudioNavigation.js';
import { flowResult } from 'mobx';
import { useEditorStore } from './EditorStoreProvider.js';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { useLegendStudioApplicationStore } from '../LegendStudioFrameworkProvider.js';
import { useParams } from '@finos/legend-application/browser';
import { guaranteeNonNullable } from '@finos/legend-shared';

export const StatusBar = observer((props: { actionsDisabled: boolean }) => {
  const { actionsDisabled } = props;
  const params = useParams<WorkspaceEditorPathParams>();
  const editorStore = useEditorStore();
  const applicationStore = useLegendStudioApplicationStore();
  const isInConflictResolutionMode = editorStore.isInConflictResolutionMode;
  // SDLC
  const projectId = params.projectId;
  const workspaceType = params.groupWorkspaceId
    ? WorkspaceType.GROUP
    : WorkspaceType.USER;
  const patchReleaseVersionId = params.patchReleaseVersionId
    ? `patch / ${params.patchReleaseVersionId} / `
    : '';
  const workspaceId = guaranteeNonNullable(
    params.groupWorkspaceId ?? params.workspaceId,
    `Workspace/group workspace ID is not provided`,
  );
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
  // TODO: we probably should refactor this, these messages are not that helpful and
  // meant for different purposes
  const pushStatusText =
    editorStore.graphManagerState.graphBuildState.hasFailed ||
    editorStore.changeDetectionState.initState.hasFailed
      ? 'change detection halted'
      : !editorStore.changeDetectionState.initState.hasSucceeded
        ? editorStore.changeDetectionState.workspaceLocalLatestRevisionState
            .isBuildingEntityHashesIndex
          ? 'building indexes...'
          : 'starting change detection...'
        : editorStore.localChangesState.pushChangesState.isInProgress
          ? 'pushing local changes...'
          : configurationState.updatingConfigurationState.isInProgress
            ? 'updating configuration...'
            : changes
              ? `${changes} unpushed changes`
              : 'no changes detected';
  const workspaceOutOfSync =
    !actionsDisabled && editorStore.sdlcState.isWorkspaceOutOfSync;

  // Problems
  const error = editorStore.graphState.error;
  const warnings = editorStore.graphState.warnings;

  // Conflict resolution
  const conflicts = editorStore.conflictResolutionState.conflicts.length;
  const acceptConflictResolution = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.conflictResolutionState.acceptConflictResolution()),
  );
  // TODO: we probably should refactor this, these messages are not that helpful and
  // meant for different purposes
  const conflictResolutionStatusText =
    editorStore.graphManagerState.graphBuildState.hasFailed ||
    editorStore.changeDetectionState.initState.hasFailed
      ? 'change detection halted'
      : !editorStore.changeDetectionState.initState.hasSucceeded
        ? editorStore.changeDetectionState.workspaceLocalLatestRevisionState
            .isBuildingEntityHashesIndex
          ? 'building indexes...'
          : 'starting change detection...'
        : editorStore.conflictResolutionState.isAcceptingConflictResolution
          ? 'submitting conflict resolution...'
          : conflicts
            ? `has unresolved merge conflicts`
            : editorStore.conflictResolutionState.hasResolvedAllConflicts
              ? 'conflict resolution not accepted'
              : 'all conflicts resolved';

  // Other actions
  const togglePanel = (): void => editorStore.panelGroupDisplayState.toggle();

  const showCompilationWarnings = (): void => {
    editorStore.panelGroupDisplayState.open();
    editorStore.setActivePanelMode(PANEL_MODE.PROBLEMS);
  };

  const handleTextModeClick = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.toggleTextMode()),
  );
  const compile = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.graphEditorMode.globalCompile()),
  );
  const generate = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.graphState.graphGenerationState.globalGenerate()),
  );
  const emptyGenerationEntities = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.graphState.graphGenerationState.clearGenerations()),
  );
  const toggleAssistant = (): void =>
    applicationStore.assistantService.toggleAssistant();

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
          <button
            className="editor__status-bar__workspace__project"
            title="Go back to workspace setup using the specified project"
            tabIndex={-1}
            onClick={(): void =>
              applicationStore.navigationService.navigator.visitAddress(
                applicationStore.navigationService.navigator.generateAddress(
                  generateSetupRoute(projectId, undefined),
                ),
              )
            }
          >
            {currentProject?.name ?? 'unknown'}
          </button>
          /
          <button
            className="editor__status-bar__workspace__workspace"
            title="Go back to workspace setup using the specified workspace"
            tabIndex={-1}
            onClick={(): void =>
              applicationStore.navigationService.navigator.visitAddress(
                applicationStore.navigationService.navigator.generateAddress(
                  generateSetupRoute(projectId, workspaceId, workspaceType),
                ),
              )
            }
          >
            {patchReleaseVersionId}
            {workspaceId}
            {editorStore.localChangesState.hasUnpushedChanges ? '*' : ''}
          </button>
          {workspaceOutOfSync && (
            <button
              className="editor__status-bar__workspace__status__btn"
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
              className="editor__status-bar__workspace__status__btn"
              tabIndex={-1}
              onClick={goToWorkspaceUpdater}
              title={
                'Workspace is outdated. Click to see latest changes of the project'
              }
            >
              OUTDATED
            </button>
          )}
          <button
            className="editor__status-bar__problems"
            tabIndex={-1}
            onClick={showCompilationWarnings}
            title={`${error ? 'Error: 1, ' : ''}Warnings: ${warnings.length}`}
          >
            <div className="editor__status-bar__problems__icon">
              <ErrorIcon />
            </div>
            <div className="editor__status-bar__problems__counter">
              {error ? 1 : 0}
            </div>
            <div className="editor__status-bar__problems__icon">
              <WarningIcon />
            </div>
            <div className="editor__status-bar__problems__counter">
              {warnings.length}
            </div>
          </button>
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
              title="Accept conflict resolution"
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
                  configurationState.updatingConfigurationState.isInProgress,
              })}
              onClick={pushLocalChanges}
              disabled={
                !changes ||
                configurationState.updatingConfigurationState.isInProgress ||
                editorStore.localChangesState.pushChangesState.isInProgress ||
                editorStore.changeDetectionState
                  .workspaceLocalLatestRevisionState
                  .isBuildingEntityHashesIndex ||
                actionsDisabled
              }
              tabIndex={-1}
              title="Push local changes (Ctrl + S)"
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
            editorStore.graphState.isApplicationUpdateOperationIsRunning
          }
          onClick={generate}
          tabIndex={-1}
          title="Generate (F10)"
        >
          <FireIcon />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__clear__generation-btn',
            {
              'editor__status-bar__action editor__status-bar__clear__generation-btn--wiggling':
                editorStore.graphState.graphGenerationState
                  .clearingGenerationEntitiesState.isInProgress,
            },
          )}
          disabled={
            editorStore.graphState.isApplicationUpdateOperationIsRunning ||
            actionsDisabled
          }
          onClick={emptyGenerationEntities}
          tabIndex={-1}
          title="Clear generation entities"
        >
          <TrashIcon />
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
                editorStore.panelGroupDisplayState.isOpen,
            },
          )}
          onClick={togglePanel}
          tabIndex={-1}
          title="Toggle panel (Ctrl + `)"
        >
          <TerminalIcon />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action editor__status-bar__action__toggler--active':
                editorStore.graphEditorMode.mode ===
                GRAPH_EDITOR_MODE.GRAMMAR_TEXT,
            },
          )}
          disabled={actionsDisabled}
          onClick={handleTextModeClick}
          tabIndex={-1}
          title="Toggle text mode (F8)"
        >
          <HackerIcon />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action__toggler--active':
                !applicationStore.assistantService.isHidden,
            },
          )}
          onClick={toggleAssistant}
          tabIndex={-1}
          disabled={applicationStore.config.TEMPORARY__disableVirtualAssistant}
          title={
            applicationStore.config.TEMPORARY__disableVirtualAssistant
              ? 'Virtual Assistant is disabled'
              : 'Toggle assistant'
          }
        >
          <AssistantIcon />
        </button>
      </div>
    </div>
  );
});
