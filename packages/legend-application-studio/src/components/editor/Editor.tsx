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
import { AuxiliaryPanel } from './aux-panel/AuxiliaryPanel.js';
import { SideBar } from './side-bar/SideBar.js';
import { EditPanel, EditPanelSplashScreen } from './edit-panel/EditPanel.js';
import { GrammarTextEditor } from './edit-panel/GrammarTextEditor.js';
import { StatusBar } from './StatusBar.js';
import { ActivityBar } from './ActivityBar.js';
import type { WorkspaceEditorPathParams } from '../../stores/LegendStudioRouter.js';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand.js';
import { guaranteeNonNullable, isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEditorStore, withEditorStore } from './EditorStoreProvider.js';
import {
  useApplicationStore,
  useApplicationNavigationContext,
  useParams,
  ActionAlertType,
  ActionAlertActionType,
  useCommands,
} from '@finos/legend-application';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { WorkspaceSyncConflictResolver } from './side-bar/WorkspaceSyncConflictResolver.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../stores/LegendStudioApplicationNavigationContext.js';
import { EmbeddedQueryBuilder } from '../EmbeddedQueryBuilder.js';
import { GrammarEditPanel } from './GrammarEditPanel.js';

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
    const resizeAuxPanel = (handleProps: ResizablePanelHandlerProps): void =>
      editorStore.auxPanelDisplayState.setSize(
        (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
          .height,
      );
    const sideBarCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      editorStore.sideBarDisplayState.size === 0,
      {
        onStopResize: resizeSideBar,
        size: editorStore.sideBarDisplayState.size,
      },
    );
    const auxCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
      editorStore.auxPanelDisplayState.size === 0,
      {
        onStopResize: resizeAuxPanel,
        size: editorStore.auxPanelDisplayState.size,
      },
    );
    const maximizedAuxCollapsiblePanelGroupProps =
      getCollapsiblePanelGroupProps(
        editorStore.auxPanelDisplayState.isMaximized,
      );

    useEffect(() => {
      if (ref.current) {
        editorStore.auxPanelDisplayState.setMaxSize(ref.current.offsetHeight);
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
      applicationStore.navigator.blockNavigation(
        [
          (): boolean =>
            editorStore.isInConflictResolutionMode ||
            editorStore.localChangesState.hasUnpushedChanges,
        ],
        (onProceed: () => void): void => {
          applicationStore.setActionAlertInfo({
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
          applicationStore.notifyWarning(
            `Navigation from the editor is blocked`,
          ),
      );
      return (): void => {
        applicationStore.navigator.unblockNavigation();
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
                    {...sideBarCollapsiblePanelGroupProps.collapsiblePanel}
                    direction={1}
                  >
                    <SideBar />
                  </ResizablePanel>
                  <ResizablePanelSplitter />
                  <ResizablePanel
                    {...sideBarCollapsiblePanelGroupProps.remainingPanel}
                    minSize={300}
                  >
                    <ResizablePanelGroup orientation="horizontal">
                      <ResizablePanel
                        {...maximizedAuxCollapsiblePanelGroupProps.collapsiblePanel}
                        {...(editorStore.auxPanelDisplayState.size === 0
                          ? auxCollapsiblePanelGroupProps.remainingPanel
                          : {})}
                      >
                        {(isResolvingConflicts || editable) &&
                          editorStore.isInFormMode && <EditPanel />}
                        {editable &&
                          editorStore.isInGrammarTextMode &&
                          editorStore.grammarModeManagerState
                            .isInDefaultTextMode && (
                            <GrammarTextEditor
                              grammarTextEditorState={
                                editorStore.grammarModeManagerState
                                  .grammarTextEditorState
                              }
                            />
                          )}
                        {editable &&
                          editorStore.isInGrammarTextMode &&
                          !editorStore.grammarModeManagerState
                            .isInDefaultTextMode && <GrammarEditPanel />}
                        {!editable && <EditPanelSplashScreen />}
                      </ResizablePanel>
                      <ResizablePanelSplitter>
                        <ResizablePanelSplitterLine
                          color={
                            editorStore.auxPanelDisplayState.isMaximized
                              ? 'transparent'
                              : 'var(--color-dark-grey-250)'
                          }
                        />
                      </ResizablePanelSplitter>
                      <ResizablePanel
                        {...auxCollapsiblePanelGroupProps.collapsiblePanel}
                        {...(editorStore.auxPanelDisplayState.isMaximized
                          ? maximizedAuxCollapsiblePanelGroupProps.remainingPanel
                          : {})}
                        direction={-1}
                      >
                        <AuxiliaryPanel />
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
