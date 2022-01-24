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

import { useEffect, Fragment } from 'react';
import { observer } from 'mobx-react-lite';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useResizeDetector } from 'react-resize-detector';
import { SideBar } from '../editor/side-bar/SideBar';
import { EditPanel } from '../editor/edit-panel/EditPanel';
import { GrammarTextEditor } from '../editor/edit-panel/GrammarTextEditor';
import { useParams, Link } from 'react-router-dom';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID';
import {
  ACTIVITY_MODE,
  LEGEND_STUDIO_HOTKEY,
  LEGEND_STUDIO_HOTKEY_MAP,
} from '../../stores/EditorConfig';
import {
  type ResizablePanelHandlerProps,
  clsx,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  getControlledResizablePanelProps,
  EyeIcon,
  ListIcon,
  CodeBranchIcon,
  WindowMaximizeIcon,
  HackerIcon,
} from '@finos/legend-art';
import { isNonNullable } from '@finos/legend-shared';
import { GlobalHotKeys } from 'react-hotkeys';
import { useViewerStore, ViewerStoreProvider } from './ViewerStoreProvider';
import {
  type ViewerPathParams,
  generateSetupRoute,
} from '../../stores/LegendStudioRouter';
import { LegendStudioAppHeaderMenu } from '../editor/header/LegendStudioAppHeaderMenu';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand';
import { flowResult } from 'mobx';
import {
  EditorStoreProvider,
  useEditorStore,
} from '../editor/EditorStoreProvider';
import { AppHeader, useApplicationStore } from '@finos/legend-application';
import type { LegendStudioConfig } from '../../application/LegendStudioConfig';
import type { ActivityDisplay } from '../editor/ActivityBar';

const ViewerStatusBar = observer(() => {
  const params = useParams<ViewerPathParams>();
  const viewerStore = useViewerStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore<LegendStudioConfig>();
  const latestVersion = viewerStore.onLatestVersion;
  const currentRevision = viewerStore.onCurrentRevision;
  const extraSDLCInfo = params.revisionId ?? params.versionId ?? 'HEAD';
  const projectId = params.projectId;
  const currentProject = editorStore.sdlcState.currentProject;
  const versionBehindProjectHead =
    viewerStore.currentRevision &&
    viewerStore.version &&
    params.versionId &&
    viewerStore.currentRevision.id !== viewerStore.version.revisionId;
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
  const handleTextModeClick = applicationStore.guaranteeSafeAction(() =>
    flowResult(editorStore.toggleTextMode()),
  );

  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
      className="editor__status-bar viewer__status-bar"
    >
      <div className="editor__status-bar__left">
        {currentProject && (
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
                {currentProject.name}
              </Link>
            </div>
            /
            <div className="editor__status-bar__workspace__workspace">
              {extraSDLCInfo}
            </div>
            {description && (
              <div className="editor__status-bar__workspace__workspace">
                ({description})
              </div>
            )}
          </div>
        )}
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
          <WindowMaximizeIcon />
        </button>
        <button
          className={clsx(
            'editor__status-bar__action editor__status-bar__action__toggler',
            {
              'editor__status-bar__action editor__status-bar__action__toggler--active':
                editorStore.isInGrammarTextMode,
            },
          )}
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

const ViewerActivityBar = observer(() => {
  const editorStore = useEditorStore();
  const changeActivity =
    (activity: ACTIVITY_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveActivity(activity);
  // tabs
  const activities: ActivityDisplay[] = [
    {
      mode: ACTIVITY_MODE.EXPLORER,
      title: 'Explorer (Ctrl + Shift + X)',
      icon: <ListIcon />,
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.PROJECT_OVERVIEW,
      title: 'Project',
      icon: (
        <div className="activity-bar__project-overview-icon">
          <EyeIcon />
        </div>
      ),
    },
  ].filter((activity): activity is ActivityDisplay => Boolean(activity));

  return (
    <div className="activity-bar">
      <div className="activity-bar__items">
        {activities.map((activity) => (
          <button
            key={activity.mode}
            className={clsx('activity-bar__item', {
              'activity-bar__item--active':
                editorStore.sideBarDisplayState.isOpen &&
                editorStore.activeActivity === activity.mode,
            })}
            onClick={changeActivity(activity.mode)}
            tabIndex={-1}
            title={`${activity.title}${
              activity.info ? ` - ${activity.info}` : ''
            }`}
          >
            {activity.icon}
          </button>
        ))}
      </div>
    </div>
  );
});

export const ViewerInner = observer(() => {
  const params = useParams<ViewerPathParams>();
  const viewerStore = useViewerStore();
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const allowOpeningElement =
    editorStore.sdlcState.currentProject &&
    editorStore.graphManagerState.graph.buildState.hasSucceeded;
  const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
    editorStore.sideBarDisplayState.setSize(
      (handleProps.domElement as HTMLDivElement).getBoundingClientRect().width,
    );
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
  // Hotkeys
  const keyMap = {
    [LEGEND_STUDIO_HOTKEY.OPEN_ELEMENT]: [
      LEGEND_STUDIO_HOTKEY_MAP.OPEN_ELEMENT,
    ],
    [LEGEND_STUDIO_HOTKEY.TOGGLE_TEXT_MODE]: [
      LEGEND_STUDIO_HOTKEY_MAP.TOGGLE_TEXT_MODE,
    ],
  };
  const handlers = {
    [LEGEND_STUDIO_HOTKEY.OPEN_ELEMENT]: editorStore.createGlobalHotKeyAction(
      () => editorStore.searchElementCommandState.open(),
    ),
    [LEGEND_STUDIO_HOTKEY.TOGGLE_TEXT_MODE]:
      editorStore.createGlobalHotKeyAction(() => {
        flowResult(editorStore.toggleTextMode()).catch(
          applicationStore.alertIllegalUnhandledError,
        );
      }),
  };

  useEffect(() => {
    if (ref.current) {
      editorStore.auxPanelDisplayState.setMaxSize(ref.current.offsetHeight);
    }
  }, [ref, editorStore, width, height]);

  useEffect(() => {
    viewerStore.internalizeEntityPath(params);
  }, [viewerStore, params]);

  // NOTE: since we internalize the entity path in the route, we should not re-initialize the graph
  // on the second call when we remove entity path from the route
  useEffect(() => {
    flowResult(viewerStore.initialize(params)).catch(
      applicationStore.alertIllegalUnhandledError,
    );
  }, [applicationStore, viewerStore, params]);

  return (
    <div className="app__page">
      <AppHeader>
        <LegendStudioAppHeaderMenu />
      </AppHeader>
      <div className="app__content">
        <div className="editor viewer">
          <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
            <div className="editor__body">
              <ViewerActivityBar />
              <div ref={ref} className="editor__content-container">
                <div
                  className={clsx('editor__content', {
                    'editor__content--expanded': editorStore.isInExpandedMode,
                  })}
                >
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel
                      {...getControlledResizablePanelProps(
                        editorStore.sideBarDisplayState.size === 0,
                        {
                          onStopResize: resizeSideBar,
                        },
                      )}
                      direction={1}
                      size={editorStore.sideBarDisplayState.size}
                    >
                      <SideBar />
                    </ResizablePanel>
                    <ResizablePanelSplitter />
                    <ResizablePanel minSize={300}>
                      {editorStore.isInFormMode && <EditPanel />}
                      {editorStore.isInGrammarTextMode && <GrammarTextEditor />}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </div>
            <ViewerStatusBar />
            {extraEditorExtensionComponents}
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
