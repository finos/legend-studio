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

import { Fragment, useState, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useResizeDetector } from 'react-resize-detector';
import type { Location } from 'history';
import {
  type ResizablePanelHandlerProps,
  Backdrop,
  buildReactHotkeysConfiguration,
  getControlledResizablePanelProps,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  useStateWithCallback,
} from '@finos/legend-art';
import { AuxiliaryPanel } from './aux-panel/AuxiliaryPanel.js';
import { SideBar } from './side-bar/SideBar.js';
import { EditPanel, EditPanelSplashScreen } from './edit-panel/EditPanel.js';
import { GlobalHotKeys } from 'react-hotkeys';
import { GrammarTextEditor } from './edit-panel/GrammarTextEditor.js';
import { StatusBar } from './StatusBar.js';
import { ActivityBar } from './ActivityBar.js';
import { useParams, Prompt } from 'react-router-dom';
import type {
  EditorPathParams,
  GroupEditorPathParams,
} from '../../stores/LegendStudioRouter.js';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand.js';
import { isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { EditorStoreProvider, useEditorStore } from './EditorStoreProvider.js';
import {
  ActionAlertType,
  ActionAlertActionType,
  useApplicationStore,
  useApplicationNavigationContext,
} from '@finos/legend-application';
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { WorkspaceSyncConflictResolver } from './side-bar/WorkspaceSyncConflictResolver.js';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../stores/LegendStudioApplicationNavigationContext.js';

export const EditorInner = observer(() => {
  const params = useParams<EditorPathParams | GroupEditorPathParams>();
  const projectId = params.projectId;
  const workspaceType = (params as { groupWorkspaceId: string | undefined })
    .groupWorkspaceId
    ? WorkspaceType.GROUP
    : WorkspaceType.USER;
  const workspaceId =
    workspaceType === WorkspaceType.GROUP
      ? (params as GroupEditorPathParams).groupWorkspaceId
      : (params as EditorPathParams).workspaceId;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();

  // Extensions
  const extraEditorExtensionComponents = editorStore.pluginManager
    .getStudioPlugins()
    .flatMap(
      (plugin) =>
        plugin.getExtraEditorExtensionComponentRendererConfigurations?.() ?? [],
    )
    .filter(isNonNullable)
    .map((config) => (
      <Fragment key={config.key}>{config.renderer(editorStore)}</Fragment>
    ));

  // Resize
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();
  // These create snapping effect on panel resizing
  const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
    editorStore.sideBarDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().width,
    );

  const resizeAuxPanel = (handleProps: ResizablePanelHandlerProps): void =>
    editorStore.auxPanelDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().height,
    );

  useEffect(() => {
    if (ref.current) {
      editorStore.auxPanelDisplayState.setMaxSize(ref.current.offsetHeight);
    }
  }, [editorStore, ref, height, width]);

  // Hotkeys
  const [hotkeyMapping, hotkeyHandlers] = buildReactHotkeysConfiguration(
    editorStore.hotkeys,
  );

  // Cleanup the editor
  useEffect(() => (): void => editorStore.cleanUp(), [editorStore]);

  // Initialize the app
  useEffect(() => {
    flowResult(
      editorStore.initialize(projectId, workspaceId, workspaceType),
    ).catch(applicationStore.alertUnhandledError);
  }, [editorStore, applicationStore, projectId, workspaceId, workspaceType]);

  // Browser Navigation Blocking (reload, close tab, go to another URL)
  // NOTE: there is no way to customize the alert message for now since Chrome removed support for it
  // See https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload#Browser_compatibility
  // There is also no way to customize this modal style-wise so we would only be able to do so for route navigation blocking
  // See https://medium.com/@jozollo/blocking-navigation-with-react-router-v4-a3f2e359d096
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent): void => {
      /**
       * NOTE: one subtle trick here. Since we have to use `useEffect` to set the event listener for `beforeunload` event,
       * we have to be be careful, if we extract `editorStore.ignoreNavigationBlock` out to a variable such as `ignoreNavigationBlock`
       * and then make this `useEffect` be called in response to that, there is a chance that if we set `editorStore.ignoreNavigationBlock`
       * to `true` and then go on to call systematic refresh (i.e. `window.location.reload()`) immediately, the event listener on window will
       * become stale and still show the blocking popup.
       *
       * This is almost guaranteed to happen as `useEffect` occurs after rendering, and thus will defnitely be called after the immediate
       * `window.location.reload()`. As such, the best way is instead of expecting `useEffect` to watch out for the change in `ignoreNavigationBlock`
       * we will access the value of `ignoreNavigationBlock` in the body of the `onUnload` function to make it more dynamic. This ensures the
       * event listener will never go stale
       */
      const showAlert =
        editorStore.isInConflictResolutionMode ||
        editorStore.hasUnpushedChanges;
      if (!editorStore.ignoreNavigationBlocking && showAlert) {
        event.returnValue = '';
      }
    };
    window.removeEventListener('beforeunload', onUnload);
    window.addEventListener('beforeunload', onUnload);
    return (): void => window.removeEventListener('beforeunload', onUnload);
  }, [editorStore]);

  // Route Navigation Blocking
  // See https://medium.com/@michaelchan_13570/using-react-router-v4-prompt-with-custom-modal-component-ca839f5faf39
  const [blockedLocation, setBlockedLocation] = useState<
    Location | undefined
  >();
  const retryBlockedLocation = useCallback(
    (allowedNavigation: boolean): void => {
      if (allowedNavigation && blockedLocation) {
        applicationStore.navigator.goTo(blockedLocation.pathname);
      }
    },
    [blockedLocation, applicationStore],
  );
  // NOTE: we have to use `useStateWithCallback` here because we want to guarantee that we call `history.push(blockedLocation.pathname)`
  // after confirmedAllowNavigation is flipped, otherwise we would end up in the `false` case of handleBlockedNavigation again!
  // Another way to go about this is to use `setTimeout(() => history.push(...), 0)` but it can potentially be more error-prone
  // See https://www.robinwieruch.de/react-usestate-callback
  const [confirmedAllowNavigation, setConfirmedAllowNavigation] =
    useStateWithCallback<boolean>(false, retryBlockedLocation);
  const onNavigationChangeIndicator = Boolean(
    editorStore.changeDetectionState.workspaceLocalLatestRevisionState.changes
      .length,
  );
  const handleRouteNavigationBlocking = (nextLocation: Location): boolean => {
    // NOTE: as long as we're in conflict resolution, we want this block to be present
    const showAlert =
      editorStore.isInConflictResolutionMode || editorStore.hasUnpushedChanges;
    if (
      !editorStore.ignoreNavigationBlocking &&
      !confirmedAllowNavigation &&
      showAlert
    ) {
      editorStore.setActionAlertInfo({
        message: editorStore.isInConflictResolutionMode
          ? 'You have not accepted the conflict resolution, the current resolution will be discarded. Leave anyway?'
          : 'You have unpushed changes. Leave anyway?',
        type: ActionAlertType.CAUTION,
        onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
        onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
        actions: [
          {
            label: 'Leave this page',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => setConfirmedAllowNavigation(true),
          },
          {
            label: 'Stay on this page',
            type: ActionAlertActionType.PROCEED,
            default: true,
            handler: (): void => setBlockedLocation(undefined),
          },
        ],
      });
      setBlockedLocation(nextLocation);
      return false;
    }
    // Reset the confirm flag and the blocked location here
    setBlockedLocation(undefined);
    setConfirmedAllowNavigation(false);
    return true;
  };
  const editable =
    editorStore.graphManagerState.graphBuildState.hasCompleted &&
    editorStore.isInitialized;
  const isResolvingConflicts =
    editorStore.isInConflictResolutionMode &&
    !editorStore.conflictResolutionState.hasResolvedAllConflicts;
  const promptComponent = (
    <Prompt
      when={onNavigationChangeIndicator}
      message={handleRouteNavigationBlocking}
    />
  );

  useApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EDITOR,
  );

  return (
    <div className="app__page">
      <div className="editor">
        {promptComponent}
        <GlobalHotKeys
          keyMap={hotkeyMapping}
          handlers={hotkeyHandlers}
          allowChanges={true}
        >
          <div className="editor__body">
            <ActivityBar />
            <Backdrop className="backdrop" open={editorStore.backdrop} />
            <div ref={ref} className="editor__content-container">
              <div className="editor__content">
                <ResizablePanelGroup orientation="vertical">
                  <ResizablePanel
                    {...getControlledResizablePanelProps(
                      editorStore.sideBarDisplayState.size === 0,
                      {
                        onStopResize: resizeSideBar,
                        size: editorStore.sideBarDisplayState.size,
                      },
                    )}
                    direction={1}
                  >
                    <SideBar />
                  </ResizablePanel>
                  <ResizablePanelSplitter />
                  <ResizablePanel minSize={300}>
                    <ResizablePanelGroup orientation="horizontal">
                      <ResizablePanel
                        {...getControlledResizablePanelProps(
                          editorStore.auxPanelDisplayState.isMaximized,
                        )}
                      >
                        {(isResolvingConflicts || editable) &&
                          editorStore.isInFormMode && <EditPanel />}
                        {editable && editorStore.isInGrammarTextMode && (
                          <GrammarTextEditor />
                        )}
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
                        {...getControlledResizablePanelProps(
                          editorStore.auxPanelDisplayState.size === 0,
                          {
                            onStopResize: resizeAuxPanel,
                            size: editorStore.auxPanelDisplayState.size,
                          },
                        )}
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
          {extraEditorExtensionComponents}
          <StatusBar actionsDisabled={!editable} />
          {editable && <ProjectSearchCommand />}
          {editorStore.localChangesState.workspaceSyncState
            .workspaceSyncConflictResolutionState.showModal && (
            <WorkspaceSyncConflictResolver />
          )}
        </GlobalHotKeys>
      </div>
    </div>
  );
});

export const Editor: React.FC = () => (
  <EditorStoreProvider>
    <DndProvider backend={HTML5Backend}>
      <EditorInner />
    </DndProvider>
  </EditorStoreProvider>
);
