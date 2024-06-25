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
  useEditorStore,
  withEditorStore,
} from '../editor/EditorStoreProvider.js';
import {
  useShowcaseViewerStore,
  withShowcaseViewerStore,
} from './ShowcaseViewerStoreProvider.js';
import { useParams } from '@finos/legend-application/browser';
import type { ShowcaseViewerPathParams } from '../../__lib__/LegendStudioNavigation.js';
import { isNonNullable } from '@finos/legend-shared';
import { Fragment, useEffect } from 'react';
import {
  getCollapsiblePanelGroupProps,
  useResizeDetector,
  type ResizablePanelHandlerProps,
  ResizablePanel,
  ResizablePanelSplitter,
  ResizablePanelGroup,
  FileTrayIcon,
  clsx,
  HackerIcon,
  AssistantIcon,
  ReadMeIcon,
  FireIcon,
  HammerIcon,
  TerminalIcon,
  TrashIcon,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { useApplicationStore, useCommands } from '@finos/legend-application';
import { flowResult } from 'mobx';
import { EditorGroup } from '../editor/editor-group/EditorGroup.js';
import { GrammarTextEditor } from '../editor/editor-group/GrammarTextEditor.js';
import { ProjectSearchCommand } from '../editor/command-center/ProjectSearchCommand.js';
import { EmbeddedQueryBuilder } from '../editor/EmbeddedQueryBuilder.js';
import {
  ACTIVITY_MODE,
  GRAPH_EDITOR_MODE,
} from '../../stores/editor/EditorConfig.js';
import { ActivityBarMenu } from '../editor/ActivityBar.js';
import type { ActivityBarItemConfig } from '@finos/legend-lego/application';
import { useLegendStudioApplicationStore } from '../LegendStudioFrameworkProvider.js';
import { LEGEND_STUDIO_TEST_ID } from '../../__lib__/LegendStudioTesting.js';
import { Explorer } from '../editor/side-bar/Explorer.js';
import { PanelGroup } from '../editor/panel-group/PanelGroup.js';

const ShowcaseViewerStatusBar = observer(() => {
  const editorStore = useEditorStore();
  const showcaseStore = useShowcaseViewerStore();
  const showcase = showcaseStore._showcase;
  const applicationStore = useLegendStudioApplicationStore();
  const handleTextModeClick = applicationStore.guardUnhandledError(() =>
    flowResult(editorStore.toggleTextMode()),
  );
  const editable =
    editorStore.graphManagerState.graphBuildState.hasCompleted &&
    editorStore.isInitialized;
  const togglePanel = (): void => editorStore.panelGroupDisplayState.toggle();

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
      className="editor__status-bar project-view__status-bar"
    >
      <div className="editor__status-bar__left">
        {showcase && (
          <div className="editor__status-bar__workspace">
            <div className="editor__status-bar__workspace__icon">
              <ReadMeIcon />
            </div>
            <div className="editor__status-bar__workspace__project">
              <button
                className="editor__status-bar__workspace__project"
                tabIndex={-1}
              >
                {`Showcase : ${showcase.title}`}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="editor__status-bar__right">
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
            !editable
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
            !editable
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
                editorStore.graphEditorMode.mode ===
                GRAPH_EDITOR_MODE.GRAMMAR_TEXT,
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

const ShowcaseViewerActivityBar = observer(() => {
  const editorStore = useEditorStore();

  const changeActivity =
    (activity: string): (() => void) =>
    (): void =>
      editorStore.setActiveActivity(activity);
  // tabs
  const activities: ActivityBarItemConfig[] = (
    [
      {
        mode: ACTIVITY_MODE.EXPLORER,
        title: 'Explorer (Ctrl + Shift + X)',
        icon: <FileTrayIcon />,
      },
    ] as (ActivityBarItemConfig | boolean)[]
  ).filter((activity): activity is ActivityBarItemConfig => Boolean(activity));

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
            title={activity.title}
          >
            {activity.icon}
          </button>
        ))}
      </div>
    </div>
  );
});

const ShowcaseViewerSideBar = observer(() => {
  const editorStore = useEditorStore();
  const renderSideBar = (): React.ReactNode => {
    switch (editorStore.activeActivity) {
      case ACTIVITY_MODE.EXPLORER:
        return <Explorer />;
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

export const ShowcaseViewer = withEditorStore(
  withShowcaseViewerStore(
    observer(() => {
      const params = useParams<ShowcaseViewerPathParams>();
      const showcaseStore = useShowcaseViewerStore();
      const applicationStore = useApplicationStore();
      const editorStore = useEditorStore();

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
      const resizeSideBar = (handleProps: ResizablePanelHandlerProps): void =>
        editorStore.sideBarDisplayState.setSize(
          (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
            .width,
        );
      const sideBarCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
        editorStore.sideBarDisplayState.size === 0,
        {
          onStopResize: resizeSideBar,
          size: editorStore.sideBarDisplayState.size,
        },
      );
      const resizePanel = (handleProps: ResizablePanelHandlerProps): void =>
        editorStore.panelGroupDisplayState.setSize(
          (handleProps.domElement as HTMLDivElement).getBoundingClientRect()
            .height,
        );
      const collapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
        editorStore.panelGroupDisplayState.size === 0,
        {
          onStopResize: resizePanel,
          size: editorStore.panelGroupDisplayState.size,
        },
      );
      const collapsibleSideBarGroupProps = getCollapsiblePanelGroupProps(
        editorStore.sideBarDisplayState.size === 0,
        {
          onStopResize: resizeSideBar,
          size: editorStore.sideBarDisplayState.size,
        },
      );
      const maximizedCollapsiblePanelGroupProps = getCollapsiblePanelGroupProps(
        editorStore.panelGroupDisplayState.isMaximized,
      );
      const { ref, width, height } = useResizeDetector<HTMLDivElement>();
      useEffect(() => {
        if (ref.current) {
          editorStore.panelGroupDisplayState.setMaxSize(
            ref.current.offsetHeight,
          );
        }
      }, [ref, editorStore, width, height]);

      // initialize
      useEffect(() => {
        flowResult(showcaseStore.initialize(params)).catch(
          applicationStore.alertUnhandledError,
        );
      }, [applicationStore, showcaseStore, params]);

      useCommands(editorStore);

      return (
        <div className="app__page">
          <div className="editor viewer">
            <div className="editor__body">
              <ShowcaseViewerActivityBar />
              <div ref={ref} className="editor__content-container">
                <div className="editor__content">
                  <ResizablePanelGroup orientation="vertical">
                    <ResizablePanel
                      {...sideBarCollapsiblePanelGroupProps.collapsiblePanel}
                      direction={1}
                    >
                      <ShowcaseViewerSideBar />
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
                          {editorStore.graphEditorMode.mode ===
                            GRAPH_EDITOR_MODE.FORM && <EditorGroup />}
                          {editorStore.graphEditorMode.mode ===
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
            {editorStore.graphManagerState.graphBuildState.hasSucceeded && (
              <ProjectSearchCommand />
            )}
            <ShowcaseViewerStatusBar />
            <EmbeddedQueryBuilder />
            {extraEditorExtensionComponents}
          </div>
        </div>
      );
    }),
  ),
);
