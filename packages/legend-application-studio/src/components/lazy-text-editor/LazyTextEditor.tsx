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

import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type ResizablePanelHandlerProps,
  getCollapsiblePanelGroupProps,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  useResizeDetector,
  ResizablePanelSplitterLine,
  clsx,
  CodeBranchIcon,
  ErrorIcon,
  WarningIcon,
  CloudUploadIcon,
  TerminalIcon,
  AssistantIcon,
  HammerIcon,
} from '@finos/legend-art';
import {
  generateSetupRoute,
  type WorkspaceEditorPathParams,
} from '../../__lib__/LegendStudioNavigation.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import {
  useApplicationStore,
  useApplicationNavigationContext,
  useCommands,
} from '@finos/legend-application';
import { useParams } from '@finos/legend-application/browser';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  useEditorStore,
  withEditorStore,
} from '../editor/EditorStoreProvider.js';
import { ActivityBar } from '../editor/ActivityBar.js';
import { SideBar } from '../editor/side-bar/SideBar.js';
import { GrammarTextEditor } from '../editor/editor-group/GrammarTextEditor.js';
import { PanelGroup } from '../editor/panel-group/PanelGroup.js';
import {
  ACTIVITY_MODE,
  GRAPH_EDITOR_MODE,
  PANEL_MODE,
} from '../../stores/editor/EditorConfig.js';
import { QuickInput } from '../editor/QuickInput.js';
import { useLegendStudioApplicationStore } from '../LegendStudioFrameworkProvider.js';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';

const LazyStatusBar = observer((props: { actionsDisabled: boolean }) => {
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

  // Other actions
  const togglePanel = (): void => editorStore.panelGroupDisplayState.toggle();

  const showCompilationWarnings = (): void => {
    editorStore.panelGroupDisplayState.open();
    editorStore.setActivePanelMode(PANEL_MODE.PROBLEMS);
  };
  const compile = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.graphEditorMode.globalCompile()),
  );
  const toggleAssistant = (): void =>
    applicationStore.assistantService.toggleAssistant();

  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
      className={clsx('editor__status-bar', 'lazy-text-editor__status-bar')}
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

export const LazyTextEditor = withEditorStore(
  observer(() => {
    const params = useParams<WorkspaceEditorPathParams>();
    const projectId = guaranteeNonNullable(params.projectId);
    const patchReleaseVersionId = params.patchReleaseVersionId;
    const workspaceType = params.groupWorkspaceId
      ? WorkspaceType.GROUP
      : WorkspaceType.USER;
    const workspaceId = guaranteeNonNullable(
      params.groupWorkspaceId ?? params.workspaceId,
      `Workspace/group workspace ID is not provided`,
    );
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const editable =
      editorStore.graphManagerState.graphBuildState.hasCompleted &&
      editorStore.isInitialized;

    // layout
    const { ref, width, height } = useResizeDetector<HTMLDivElement>();
    // These create snapping effect on panel resizing
    const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
      editorStore.sideBarDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .width,
      );
    const resizePanel = (handleProps: ResizablePanelHandlerProps): void =>
      editorStore.panelGroupDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .height,
      );
    const collapsibleSideBarGroupProps = getCollapsiblePanelGroupProps(
      editorStore.sideBarDisplayState.size === 0,
      {
        onStopResize: resizeSideBar,
        size: editorStore.sideBarDisplayState.size,
      },
    );
    const collapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      editorStore.panelGroupDisplayState.size === 0,
      {
        onStopResize: resizePanel,
        size: editorStore.panelGroupDisplayState.size,
      },
    );
    const maximizedCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      editorStore.panelGroupDisplayState.isMaximized,
    );
    // Extensions
    useEffect(() => {
      if (ref.current) {
        editorStore.panelGroupDisplayState.setMaxSize(ref.current.offsetHeight);
      }
    }, [editorStore, ref, height, width]);

    // initialize
    useEffect(() => {
      editorStore.internalizeEntityPath(params, undefined);
    }, [editorStore, params]);

    useEffect(() => {
      flowResult(
        editorStore.lazyTextEditorStore.init(
          projectId,
          patchReleaseVersionId,
          workspaceId,
          workspaceType,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }, [
      editorStore,
      patchReleaseVersionId,
      applicationStore,
      projectId,
      workspaceId,
      workspaceType,
    ]);

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EDITOR,
    );

    useCommands(editorStore);

    // Cleanup the editor
    useEffect(() => (): void => editorStore.cleanUp(), [editorStore]);
    return (
      <div className="app__page">
        <div className="editor">
          <div className="editor__body">
            <ActivityBar />
            <div ref={ref} className="editor__content-container">
              <div className="editor__content">
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel
                    {...collapsibleSideBarGroupProps.collapsiblePanel}
                    direction={1}
                  >
                    <SideBar />
                  </ResizablePanel>
                  <ResizablePanelSplitter />
                  <ResizablePanel
                    {...collapsibleSideBarGroupProps.remainingPanel}
                    minSize={300}
                  >
                    <ResizablePanelGroup orientation="horizontal">
                      <ResizablePanel
                        {...maximizedCollapsiblePanelGroupProps.collapsiblePanel}
                        {...(editorStore.panelGroupDisplayState.size === 0
                          ? collapsiblePanelGroupProps.remainingPanel
                          : {})}
                      >
                        {editable &&
                          editorStore.graphEditorMode.mode ===
                            GRAPH_EDITOR_MODE.GRAMMAR_TEXT && (
                            <GrammarTextEditor />
                          )}
                      </ResizablePanel>
                      <ResizablePanelSplitter>
                        <ResizablePanelSplitterLine
                          color={
                            editorStore.panelGroupDisplayState.isMaximized
                              ? 'transparent'
                              : 'var(--color-dark-grey-250)'
                          }
                        />
                      </ResizablePanelSplitter>
                      <ResizablePanel
                        {...collapsiblePanelGroupProps.collapsiblePanel}
                        {...(editorStore.panelGroupDisplayState.isMaximized
                          ? maximizedCollapsiblePanelGroupProps.remainingPanel
                          : {})}
                        direction={-1}
                      >
                        <PanelGroup />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </div>
          </div>
          <QuickInput />
          <LazyStatusBar actionsDisabled={!editable} />
        </div>
      </div>
    );
  }),
);
