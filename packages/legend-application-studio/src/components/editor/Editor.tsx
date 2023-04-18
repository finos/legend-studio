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

import { Fragment, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  type ResizablePanelHandlerProps,
  getCollapsiblePanelGroupProps,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  useResizeDetector,
} from '@finos/legend-art';
import { PanelGroup } from './panel-group/PanelGroup.js';
import { SideBar } from './side-bar/SideBar.js';
import {
  EditorGroup,
  EditorGroupSplashScreen,
} from './editor-group/EditorGroup.js';
import { GrammarTextEditor } from './editor-group/GrammarTextEditor.js';
import { StatusBar } from './StatusBar.js';
import { ActivityBar } from './ActivityBar.js';
import type { WorkspaceEditorPathParams } from '../../__lib__/LegendStudioNavigation.js';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand.js';
import { guaranteeNonNullable, isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEditorStore, withEditorStore } from './EditorStoreProvider.js';
import {
  useApplicationStore,
  useApplicationNavigationContext,
  ActionAlertType,
  ActionAlertActionType,
  useCommands,
} from '@finos/legend-application';
import { useParams } from '@finos/legend-application/browser';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { WorkspaceSyncConflictResolver } from './side-bar/WorkspaceSyncConflictResolver.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../__lib__/LegendStudioApplicationNavigationContext.js';
import { EmbeddedQueryBuilder } from '../EmbeddedQueryBuilder.js';
import { GRAPH_EDITOR_MODE } from '../../stores/editor/EditorConfig.js';

export const Editor = withEditorStore(
  observer(() => {
    const params = useParams<WorkspaceEditorPathParams>();
    const projectId = params.projectId;
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
    const isResolvingConflicts =
      editorStore.isInConflictResolutionMode &&
      !editorStore.conflictResolutionState.hasResolvedAllConflicts;

    // Extensions
    const extraEditorExtensionComponents = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraEditorExtensionComponentRendererConfigurations?.() ??
          [],
      )
      .filter(isNonNullable)
      .map((config) => (
        <Fragment key={config.key}>{config.renderer(editorStore)}</Fragment>
      ));

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

    useEffect(() => {
      if (ref.current) {
        editorStore.panelGroupDisplayState.setMaxSize(ref.current.offsetHeight);
      }
    }, [editorStore, ref, height, width]);

    // initialize
    useEffect(() => {
      editorStore.internalizeEntityPath(params);
    }, [editorStore, params]);
    useEffect(() => {
      flowResult(
        editorStore.initialize(projectId, workspaceId, workspaceType),
      ).catch(applicationStore.alertUnhandledError);
    }, [editorStore, applicationStore, projectId, workspaceId, workspaceType]);

    useEffect(() => {
      applicationStore.navigationService.navigator.blockNavigation(
        [
          (): boolean =>
            editorStore.isInConflictResolutionMode ||
            editorStore.localChangesState.hasUnpushedChanges,
        ],
        (onProceed: () => void): void => {
          applicationStore.alertService.setActionAlertInfo({
            // TODO?: should we make this message generic like the `BeforeUnloadEvent` message?
            message: editorStore.isInConflictResolutionMode
              ? 'You have not accepted the conflict resolution, the current resolution will be discarded. Leave anyway?'
              : 'You have unpushed changes. Leave anyway?',
            type: ActionAlertType.CAUTION,
            actions: [
              {
                label: 'Leave this page',
                type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                handler: (): void => onProceed(),
              },
              {
                label: 'Stay on this page',
                type: ActionAlertActionType.PROCEED,
                default: true,
              },
            ],
          });
        },
        () =>
          applicationStore.notificationService.notifyWarning(
            `Navigation from the editor is blocked`,
          ),
      );
      return (): void => {
        applicationStore.navigationService.navigator.unblockNavigation();
      };
    }, [editorStore, applicationStore]);

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
                        {(isResolvingConflicts || editable) &&
                          editorStore.graphEditorMode.mode ===
                            GRAPH_EDITOR_MODE.FORM && <EditorGroup />}
                        {editable &&
                          editorStore.graphEditorMode.mode ===
                            GRAPH_EDITOR_MODE.GRAMMAR_TEXT && (
                            <GrammarTextEditor />
                          )}
                        {!editable && <EditorGroupSplashScreen />}
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
          <StatusBar actionsDisabled={!editable} />
          {editable && <ProjectSearchCommand />}
          {editorStore.localChangesState.workspaceSyncState
            .workspaceSyncConflictResolutionState.showModal && (
            <WorkspaceSyncConflictResolver />
          )}
          <EmbeddedQueryBuilder />
          {extraEditorExtensionComponents}
        </div>
      </div>
    );
  }),
);
