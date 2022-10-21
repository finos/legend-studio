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
  BrushIcon,
  CloudUploadIcon,
  AssistantIcon,
  WarningOutlineIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID.js';
import { ACTIVITY_MODE, AUX_PANEL_MODE } from '../../stores/EditorConfig.js';
import {
  generateSetupRoute,
  type WorkspaceEditorPathParams,
} from '../../stores/LegendStudioRouter.js';
import { flowResult } from 'mobx';
import { useEditorStore } from './EditorStoreProvider.js';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { useLegendStudioApplicationStore } from '../LegendStudioBaseStoreProvider.js';
import { useParams } from '@finos/legend-application';
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
      : configurationState.isUpdatingConfiguration
      ? 'updating configuration...'
      : changes
      ? `${changes} unpushed changes`
      : 'no changes detected';
  const workspaceOutOfSync =
    !actionsDisabled && editorStore.sdlcState.isWorkspaceOutOfSync;

  // Warnings
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
  const toggleAuxPanel = (): void => editorStore.auxPanelDisplayState.toggle();

  const showCompilationWarnings = (): void => {
    editorStore.auxPanelDisplayState.open();
    editorStore.setActiveAuxPanelMode(AUX_PANEL_MODE.PROBLEMS);
  };

  const handleTextModeClick = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.toggleTextMode()),
  );
  const compile = applicationStore.guardUnhandledError(
    editorStore.isInGrammarTextMode
      ? () => flowResult(editorStore.graphState.globalCompileInTextMode())
      : async () => {
          await flowResult(editorStore.graphState.globalCompileInFormMode());
        },
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
              applicationStore.navigator.visitAddress(
                applicationStore.navigator.generateAddress(
                  generateSetupRoute(projectId),
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
              applicationStore.navigator.visitAddress(
                applicationStore.navigator.generateAddress(
                  generateSetupRoute(projectId, workspaceId, workspaceType),
                ),
              )
            }
          >
            {workspaceId}
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
            className="editor__status-bar__workspace__warning__btn"
            tabIndex={-1}
            onClick={showCompilationWarnings}
            title={`Warnings: ${warnings ? warnings.length : 0}`}
          >
            <div className="editor__status-bar__workspace__icon">
              <WarningOutlineIcon />
            </div>
            <div className="editor__status-bar__workspace__warning__btn__label">
              {warnings ? warnings.length : 0}
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
            editorStore.graphState.isApplicationUpdateOperationIsRunning ||
            actionsDisabled ||
            !editorStore.graphManagerState.graph.ownGenerationSpecifications
              .length
          }
          onClick={generate}
          tabIndex={-1}
          title="Generate (F10)"
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
          title="Clear generation entities"
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
                editorStore.auxPanelDisplayState.isOpen,
            },
          )}
          onClick={toggleAuxPanel}
          tabIndex={-1}
          title="Toggle auxiliary panel (Ctrl + `)"
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
          title="Toggle assistant"
        >
          <AssistantIcon />
        </button>
      </div>
    </div>
  );
});
