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
import { EditPanel } from '../editor/edit-panel/EditPanel.js';
import { GrammarTextEditor } from '../editor/edit-panel/GrammarTextEditor.js';
import { LEGEND_STUDIO_TEST_ID } from '../LegendStudioTestID.js';
import { ACTIVITY_MODE } from '../../stores/EditorConfig.js';
import {
  type ResizablePanelHandlerProps,
  clsx,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  getCollapsiblePanelGroupProps,
  RepoIcon,
  CodeBranchIcon,
  HackerIcon,
  WrenchIcon,
  FileTrayIcon,
  AssistantIcon,
  useResizeDetector,
} from '@finos/legend-art';
import { isNonNullable } from '@finos/legend-shared';
import {
  useProjectViewerStore,
  withProjectViewerStore,
} from './ProjectViewerStoreProvider.js';
import {
  type ViewerPathParams,
  generateSetupRoute,
} from '../../stores/LegendStudioRouter.js';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand.js';
import { flowResult } from 'mobx';
import {
  useEditorStore,
  withEditorStore,
} from '../editor/EditorStoreProvider.js';
import {
  useApplicationStore,
  useCommands,
  useParams,
} from '@finos/legend-application';
import {
  ActivityBarMenu,
  type ActivityDisplay,
} from '../editor/ActivityBar.js';
import { Explorer } from '../editor/side-bar/Explorer.js';
import { ProjectOverview } from '../editor/side-bar/ProjectOverview.js';
import { WorkflowManager } from '../editor/side-bar/WorkflowManager.js';
import { useLegendStudioApplicationStore } from '../LegendStudioBaseStoreProvider.js';
import { EmbeddedQueryBuilder } from '../EmbeddedQueryBuilder.js';

const ProjectViewerStatusBar = observer(() => {
  const params = useParams<ViewerPathParams>();
  const viewerStore = useProjectViewerStore();
  const editorStore = useEditorStore();
  const applicationStore = useLegendStudioApplicationStore();
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
  const handleTextModeClick = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.toggleTextMode()),
  );
  const toggleAssistant = (): void =>
    applicationStore.assistantService.toggleAssistant();

  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.STATUS_BAR}
      className="editor__status-bar project-viewer__status-bar"
    >
      <div className="editor__status-bar__left">
        {currentProject && (
          <div className="editor__status-bar__workspace">
            <div className="editor__status-bar__workspace__icon">
              <CodeBranchIcon />
            </div>
            <div className="editor__status-bar__workspace__project">
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
                {currentProject.name}
              </button>
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
                editorStore.isInGrammarTextMode,
            },
          )}
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

const ProjectViewerSideBar = observer(() => {
  const viewerStore = useProjectViewerStore();
  const editorStore = viewerStore.editorStore;
  const renderSideBar = (): React.ReactNode => {
    switch (editorStore.activeActivity) {
      case ACTIVITY_MODE.EXPLORER:
        return <Explorer />;
      case ACTIVITY_MODE.PROJECT_OVERVIEW:
        return <ProjectOverview />;
      case ACTIVITY_MODE.WORKFLOW_MANAGER:
        return viewerStore.workflowManagerState ? (
          <WorkflowManager
            workflowManagerState={viewerStore.workflowManagerState}
          />
        ) : null;
      default:
        return null;
    }
  };
  return (
    <div className="side-bar">
      <div className="side-bar__view">{renderSideBar()}</div>
    </div>
  );
});

const ProjectViewerActivityBar = observer(() => {
  const viewerStore = useProjectViewerStore();
  const editorStore = viewerStore.editorStore;
  const changeActivity =
    (activity: ACTIVITY_MODE): (() => void) =>
    (): void =>
      editorStore.setActiveActivity(activity);
  // tabs
  const activities: ActivityDisplay[] = [
    {
      mode: ACTIVITY_MODE.EXPLORER,
      title: 'Explorer (Ctrl + Shift + X)',
      icon: <FileTrayIcon />,
    },
    !editorStore.isInConflictResolutionMode && {
      mode: ACTIVITY_MODE.PROJECT_OVERVIEW,
      title: 'Project',
      icon: (
        <div className="activity-bar__project-overview-icon">
          <RepoIcon />
        </div>
      ),
    },
    viewerStore.workflowManagerState && {
      mode: ACTIVITY_MODE.WORKFLOW_MANAGER,
      title: 'WORKFLOW MANAGER',
      icon: <WrenchIcon />,
    },
  ].filter((activity): activity is ActivityDisplay => Boolean(activity));

  return (
    <div className="activity-bar">
      <ActivityBarMenu />
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

export const ProjectViewer = withEditorStore(
  withProjectViewerStore(
    observer(() => {
      const params = useParams<ViewerPathParams>();
      const viewerStore = useProjectViewerStore();
      const editorStore = useEditorStore();
      const applicationStore = useApplicationStore();
      const allowOpeningElement =
        editorStore.sdlcState.currentProject &&
        editorStore.graphManagerState.graphBuildState.hasSucceeded;
      const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
        editorStore.sideBarDisplayState.setSize(
          (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
            .width,
        );

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
      const sideBarCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
        editorStore.sideBarDisplayState.size === 0,
        {
          onStopResize: resizeSideBar,
          size: editorStore.sideBarDisplayState.size,
        },
      );
      const { ref, width, height } = useResizeDetector<HTMLDivElement>();
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
          applicationStore.alertUnhandledError,
        );
      }, [applicationStore, viewerStore, params]);

      useCommands(editorStore);

      return (
        <div className="app__page">
          <div className="editor viewer">
            <div className="editor__body">
              <ProjectViewerActivityBar />
              <div ref={ref} className="editor__content-container">
                <div className="editor__content">
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel
                      {...sideBarCollapsiblePanelGroupProps.collapsiblePanel}
                      direction={1}
                    >
                      <ProjectViewerSideBar />
                    </ResizablePanel>
                    <ResizablePanelSplitter />
                    <ResizablePanel
                      {...sideBarCollapsiblePanelGroupProps.remainingPanel}
                      minSize={300}
                    >
                      {editorStore.isInFormMode && <EditPanel />}
                      {editorStore.isInGrammarTextMode && <GrammarTextEditor />}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>
            </div>
            {allowOpeningElement && <ProjectSearchCommand />}
            <ProjectViewerStatusBar />
            <EmbeddedQueryBuilder />
            {extraEditorExtensionComponents}
          </div>
        </div>
      );
    }),
  ),
);
