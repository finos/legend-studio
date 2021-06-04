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
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useResizeDetector } from 'react-resize-detector';
import SplitPane from 'react-split-pane';
import { FaList, FaCodeBranch, FaRegWindowMaximize } from 'react-icons/fa';
import { SideBar } from '../editor/side-bar/SideBar';
import { EditPanel } from '../editor/edit-panel/EditPanel';
import { useParams, Link } from 'react-router-dom';
import { CORE_TEST_ID } from '../../const';
import {
  ACTIVITY_MODE,
  HOTKEY,
  HOTKEY_MAP,
  SIDE_BAR_RESIZE_SNAP_THRESHOLD,
  DEFAULT_SIDE_BAR_SIZE,
} from '../../stores/EditorConfig';
import { EditorStoreProvider, useEditorStore } from '../../stores/EditorStore';
import { clsx } from '@finos/legend-studio-components';
import { NotificationSnackbar } from '../shared/NotificationSnackbar';
import { GlobalHotKeys } from 'react-hotkeys';
import { useViewerStore, ViewerStoreProvider } from '../../stores/ViewerStore';
import type { ViewerRouteParams } from '../../stores/Router';
import { generateSetupRoute } from '../../stores/Router';
import { AppHeader } from '../shared/AppHeader';
import { AppHeaderMenu } from '../editor/header/AppHeaderMenu';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand';
import { useApplicationStore } from '../../stores/ApplicationStore';

const ViewerStatusBar = observer(() => {
  const params = useParams<ViewerRouteParams>();
  const viewerState = useViewerStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const latestVersion = viewerState.onLatestVersion;
  const currentRevision = viewerState.onCurrentRevision;
  const statusBarInfo = params.revisionId ?? params.versionId ?? 'HEAD';
  const projectId = params.projectId;
  const currentProject = editorStore.sdlcState.currentProject;
  const versionBehindProjectHead =
    viewerState.currentRevision &&
    viewerState.version &&
    params.versionId &&
    viewerState.currentRevision.id !== viewerState.version.revisionId;
  const description = `${
    latestVersion
      ? versionBehindProjectHead
        ? 'latest behind project'
        : 'latest'
      : currentRevision
      ? 'current'
      : ''
  }`;
  const toggleExpandMode = (): void =>
    editorStore.setExpandedMode(!editorStore.isInExpandedMode);

  return (
    <div
      data-testid={CORE_TEST_ID.STATUS_BAR}
      className="editor__status-bar viewer__status-bar"
    >
      <div className="editor__status-bar__left">
        <div className="editor__status-bar__workspace">
          <div className="editor__status-bar__workspace__icon">
            <FaCodeBranch />
          </div>
          <div className="editor__status-bar__workspace__project">
            <Link
              to={generateSetupRoute(
                applicationStore.config.sdlcServerKey,
                projectId,
              )}
            >
              {currentProject?.name ?? 'unknown'}
            </Link>
          </div>
          /
          <div className="editor__status-bar__workspace__workspace">
            {statusBarInfo}
          </div>
          {description && (
            <div className="editor__status-bar__workspace__workspace">
              ({description})
            </div>
          )}
        </div>
      </div>
      <div className="editor__status-bar__right">
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
      </div>
    </div>
  );
});

const ViewerActivityBar = observer(() => {
  const editorStore = useEditorStore();
  const changeActivity =
    (activity: ACTIVITY_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveActivity(activity);

  return (
    <div className="activity-bar">
      <div className="activity-bar__items">
        <button
          className={clsx('activity-bar__item', 'activity-bar__item--active')}
          tabIndex={-1}
          title="Explorer"
          onClick={changeActivity(ACTIVITY_MODE.EXPLORER)}
        >
          <FaList />
        </button>
      </div>
    </div>
  );
});

export const ViewerInner = observer(() => {
  const params = useParams<ViewerRouteParams>();
  const projectId = params.projectId;
  const versionId = params.versionId;
  const revisionId = params.revisionId;
  const viewerState = useViewerStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const allowOpeningElement =
    editorStore.sdlcState.currentProject &&
    !editorStore.graphState.graph.failedToBuild &&
    editorStore.graphState.graph.isBuilt;
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
  // Resize
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();
  // Hotkeys
  const keyMap = {
    [HOTKEY.OPEN_ELEMENT]: [HOTKEY_MAP.OPEN_ELEMENT],
  };
  const handlers = {
    [HOTKEY.OPEN_ELEMENT]: editorStore.createGlobalHotKeyAction(() =>
      editorStore.searchElementCommandState.open(),
    ),
  };

  useEffect(() => {
    if (ref.current) {
      editorStore.setMaxAuxPanelSize(ref.current.offsetHeight);
    }
  }, [ref, editorStore, width, height]);

  useEffect(() => {
    viewerState.internalizeEntityPath(params);
  }, [viewerState, params]);
  // NOTE: since we internalize the entity path in the route, we should not re-initialize the graph
  // on the second call when we remove entity path from the route
  useEffect(() => {
    viewerState
      .init(projectId, versionId, revisionId)
      .catch(applicationStore.alertIllegalUnhandledError);
  }, [applicationStore, viewerState, projectId, versionId, revisionId]);

  return (
    <div className="app__page">
      <AppHeader>
        <AppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="editor viewer">
          <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
            <div className="editor__body">
              <ViewerActivityBar />
              <NotificationSnackbar />
              <div ref={ref} className="editor__content-container">
                <div
                  className={clsx('editor__content', {
                    'editor__content--expanded': editorStore.isInExpandedMode,
                  })}
                >
                  <SplitPane
                    split="vertical"
                    onDragFinished={snapSideBar}
                    size={editorStore.sideBarSize}
                    minSize={0}
                    maxSize={-600}
                  >
                    <SideBar />
                    <EditPanel />
                    <div />
                    <div />
                  </SplitPane>
                </div>
              </div>
            </div>
            <ViewerStatusBar />
            {allowOpeningElement && <ProjectSearchCommand />}
          </GlobalHotKeys>
        </div>
      </div>
    </div>
  );
});

export const Viewer: React.FC = () => (
  <EditorStoreProvider>
    <ViewerStoreProvider>
      <DndProvider backend={HTML5Backend}>
        <ViewerInner />
      </DndProvider>
    </ViewerStoreProvider>
  </EditorStoreProvider>
);
