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
import { clsx, useStateWithCallback } from '@finos/legend-studio-components';
import SplitPane from 'react-split-pane';
import { AuxiliaryPanel } from './aux-panel/AuxiliaryPanel';
import { SideBar } from './side-bar/SideBar';
import { EditPanel, EditPanelSplashScreen } from './edit-panel/EditPanel';
import { GlobalHotKeys } from 'react-hotkeys';
import { GrammarTextEditor } from './edit-panel/GrammarTextEditor';
import { StatusBar } from './StatusBar';
import { ActivityBar } from './ActivityBar';
import { useParams, Prompt } from 'react-router-dom';
import {
  SIDE_BAR_RESIZE_SNAP_THRESHOLD,
  DEFAULT_SIDE_BAR_SIZE,
  AUX_PANEL_RESIZE_SNAP_THRESHOLD,
  HOTKEY,
  HOTKEY_MAP,
  ACTIVITY_MODE,
} from '../../stores/EditorConfig';
import { EditorStoreProvider, useEditorStore } from '../../stores/EditorStore';
import Backdrop from '@material-ui/core/Backdrop';
import type { EditorRouteParams } from '../../stores/Router';
import {
  ActionAlertType,
  ActionAlertActionType,
  useApplicationStore,
} from '../../stores/ApplicationStore';
import { AppHeader } from '../shared/AppHeader';
import { AppHeaderMenu } from '../editor/header/AppHeaderMenu';
import { ShareProjectHeaderAction } from '../editor/header/ShareProjectHeaderAction';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand';
import { flowResult } from 'mobx';
import { isNonNullable } from '@finos/legend-studio-shared';

export const EditorInner = observer(() => {
  const params = useParams<EditorRouteParams>();
  const projectId = params.projectId;
  const workspaceId = params.workspaceId;
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();

  // Extensions
  const extraEditorExtensionComponents =
    editorStore.applicationStore.pluginManager
      .getEditorPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraEditorExtensionComponentRendererConfigurations?.() ??
          [],
      )
      .filter(isNonNullable)
      .map((config) => (
        <Fragment key={config.key}>{config.renderer(editorStore)}</Fragment>
      ));

  // Resize
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();
  // These create snapping effect on panel resizing
  const snapSideBar = (newSize: number | undefined): void => {
    if (newSize !== undefined) {
      editorStore.setSideBarSize(
        newSize < SIDE_BAR_RESIZE_SNAP_THRESHOLD
          ? editorStore.sideBarSize > 0
            ? 0
            : DEFAULT_SIDE_BAR_SIZE
          : newSize,
      );
    }
  };
  const snapAuxPanel = (newSize: number | undefined): void => {
    if (ref.current) {
      if (newSize !== undefined) {
        if (
          newSize >=
          ref.current.offsetHeight - AUX_PANEL_RESIZE_SNAP_THRESHOLD
        ) {
          editorStore.setAuxPanelSize(ref.current.offsetHeight);
        } else if (newSize <= AUX_PANEL_RESIZE_SNAP_THRESHOLD) {
          editorStore.setAuxPanelSize(
            editorStore.auxPanelSize > 0 ? 0 : AUX_PANEL_RESIZE_SNAP_THRESHOLD,
          );
        } else {
          editorStore.setAuxPanelSize(newSize);
        }
      }
    }
  };

  useEffect(() => {
    if (ref.current) {
      editorStore.setMaxAuxPanelSize(ref.current.offsetHeight);
    }
  }, [editorStore, ref, height, width]);

  // Hotkeys
  const keyMap = {
    [HOTKEY.COMPILE]: [HOTKEY_MAP.COMPILE],
    [HOTKEY.GENERATE]: [HOTKEY_MAP.GENERATE],
    [HOTKEY.CREATE_ELEMENT]: [HOTKEY_MAP.CREATE_ELEMENT],
    [HOTKEY.OPEN_ELEMENT]: [HOTKEY_MAP.OPEN_ELEMENT],
    [HOTKEY.SYNC_WITH_WORKSPACE]: [HOTKEY_MAP.SYNC_WITH_WORKSPACE],
    [HOTKEY.TOGGLE_TEXT_MODE]: [HOTKEY_MAP.TOGGLE_TEXT_MODE],
    [HOTKEY.TOGGLE_AUX_PANEL]: [HOTKEY_MAP.TOGGLE_AUX_PANEL],
    [HOTKEY.TOGGLE_MODEL_LOADER]: [HOTKEY_MAP.TOGGLE_MODEL_LOADER],
    [HOTKEY.TOGGLE_SIDEBAR_EXPLORER]: [HOTKEY_MAP.TOGGLE_SIDEBAR_EXPLORER],
    [HOTKEY.TOGGLE_SIDEBAR_CHANGES]: [HOTKEY_MAP.TOGGLE_SIDEBAR_CHANGES],
    [HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW]: [
      HOTKEY_MAP.TOGGLE_SIDEBAR_WORKSPACE_REVIEW,
    ],
    [HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER]: [
      HOTKEY_MAP.TOGGLE_SIDEBAR_WORKSPACE_UPDATER,
    ],
  };
  const handlers = {
    // actions that need blocking
    [HOTKEY.COMPILE]: editorStore.createGlobalHotKeyAction(() => {
      flowResult(editorStore.graphState.globalCompileInFormMode()).catch(
        applicationStore.alertIllegalUnhandledError,
      );
    }),
    [HOTKEY.GENERATE]: editorStore.createGlobalHotKeyAction(() => {
      editorStore.graphState.graphGenerationState
        .globalGenerate()
        .catch(applicationStore.alertIllegalUnhandledError);
    }),
    [HOTKEY.CREATE_ELEMENT]: editorStore.createGlobalHotKeyAction(() =>
      editorStore.newElementState.openModal(),
    ),
    [HOTKEY.OPEN_ELEMENT]: editorStore.createGlobalHotKeyAction(() =>
      editorStore.searchElementCommandState.open(),
    ),
    [HOTKEY.TOGGLE_TEXT_MODE]: editorStore.createGlobalHotKeyAction(() => {
      editorStore
        .toggleTextMode()
        .catch(applicationStore.alertIllegalUnhandledError);
    }),
    [HOTKEY.TOGGLE_MODEL_LOADER]: editorStore.createGlobalHotKeyAction(() =>
      editorStore.openState(editorStore.modelLoaderState),
    ),
    [HOTKEY.SYNC_WITH_WORKSPACE]: editorStore.createGlobalHotKeyAction(() => {
      editorStore.localChangesState
        .syncWithWorkspace()
        .catch(applicationStore.alertIllegalUnhandledError);
    }),
    // simple actions (no blocking is needed)
    [HOTKEY.TOGGLE_AUX_PANEL]: editorStore.createGlobalHotKeyAction(() =>
      editorStore.toggleAuxPanel(),
    ),
    [HOTKEY.TOGGLE_SIDEBAR_EXPLORER]: editorStore.createGlobalHotKeyAction(() =>
      editorStore.setActiveActivity(ACTIVITY_MODE.EXPLORER),
    ),
    [HOTKEY.TOGGLE_SIDEBAR_CHANGES]: editorStore.createGlobalHotKeyAction(() =>
      editorStore.setActiveActivity(ACTIVITY_MODE.CHANGES),
    ),
    [HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW]:
      editorStore.createGlobalHotKeyAction(() =>
        editorStore.setActiveActivity(ACTIVITY_MODE.WORKSPACE_REVIEW),
      ),
    [HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER]:
      editorStore.createGlobalHotKeyAction(() =>
        editorStore.setActiveActivity(ACTIVITY_MODE.WORKSPACE_UPDATER),
      ),
  };

  // Cleanup the editor
  useEffect(
    () => (): void => {
      editorStore.cleanUp();
    },
    [editorStore],
  );

  // Initialize the app
  useEffect(() => {
    editorStore
      .init(projectId, workspaceId)
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [editorStore, applicationStore, projectId, workspaceId]);

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
        editorStore.hasUnsyncedChanges;
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
  const [blockedLocation, setBlockedLocation] =
    useState<Location | undefined>();
  const retryBlockedLocation = useCallback(
    (allowedNavigation: boolean): void => {
      if (allowedNavigation && blockedLocation) {
        applicationStore.historyApiClient.push(blockedLocation.pathname);
      }
    },
    [blockedLocation, applicationStore],
  );
  // NOTE: we have to use `useStateWithCallback` here because we want to guarantee that we call `history.push(blockedLocation.pathname)`
  // after confirmedAllowNavigation is flipped, otherwise we would end up in the `false` case of handleBlockedNavigation again!
  // Another way to go about this is to use `setTimeout(() => history.push(...), 0)` but it can potentailly be more error prone
  // See https://www.robinwieruch.de/react-usestate-callback
  const [confirmedAllowNavigation, setConfirmedAllowNavigation] =
    useStateWithCallback<boolean>(false, retryBlockedLocation);
  const onNavigationChangeIndicator = Boolean(
    editorStore.changeDetectionState.workspaceLatestRevisionState.changes
      .length,
  );
  const handleRouteNavigationBlocking = (nextLocation: Location): boolean => {
    // NOTE: as long as we're in conflict resolution, we want this block to be present
    const showAlert =
      editorStore.isInConflictResolutionMode || editorStore.hasUnsyncedChanges;
    if (
      !editorStore.ignoreNavigationBlocking &&
      !confirmedAllowNavigation &&
      showAlert
    ) {
      editorStore.setActionAltertInfo({
        message: editorStore.isInConflictResolutionMode
          ? 'You have not accepted the conflict resolution, the current resolution will be discarded. Leave anyway?'
          : 'You have unsynced changes. Leave anyway?',
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
    (editorStore.graphState.graph.failedToBuild ||
      editorStore.graphState.graph.isBuilt) &&
    editorStore.isInitialized;
  const isResolvingConflicts =
    editorStore.isInConflictResolutionMode &&
    !editorStore.conflictResolutionState.hasResolvedAllConflicts;

  // NOTE: this type any cast is needed to handle the outdated typings of `history` used by `react-router@5`.
  // TODO: We will fix this when we move to `react-router@6`
  const promptComponent = (
    <Prompt
      when={onNavigationChangeIndicator}
      message={handleRouteNavigationBlocking as unknown as any} // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
    />
  );

  return (
    <div className="app__page">
      <AppHeader>
        <ShareProjectHeaderAction />
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="editor">
          {promptComponent}
          <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
            <div className="editor__body">
              <ActivityBar />
              <Backdrop className="backdrop" open={editorStore.backdrop} />
              <div ref={ref} className="editor__content-container">
                <div
                  className={clsx('editor__content', {
                    'editor__content--expanded': editorStore.isInExpandedMode,
                  })}
                >
                  <SplitPane
                    split="vertical"
                    size={editorStore.sideBarSize}
                    onDragFinished={snapSideBar}
                    minSize={0}
                    maxSize={-600}
                  >
                    <SideBar />
                    <SplitPane
                      primary="second"
                      split="horizontal"
                      size={editorStore.auxPanelSize}
                      onDragFinished={snapAuxPanel}
                      minSize={0}
                      maxSize={0}
                    >
                      <>
                        {(isResolvingConflicts || editable) &&
                          editorStore.isInFormMode && <EditPanel />}
                        {editable && editorStore.isInGrammarTextMode && (
                          <GrammarTextEditor />
                        )}
                        {!editable && <EditPanelSplashScreen />}
                      </>
                      <AuxiliaryPanel />
                    </SplitPane>
                  </SplitPane>
                </div>
              </div>
            </div>
            {extraEditorExtensionComponents}
            <StatusBar actionsDisabled={!editable} />
            {editable && <ProjectSearchCommand />}
          </GlobalHotKeys>
        </div>
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
