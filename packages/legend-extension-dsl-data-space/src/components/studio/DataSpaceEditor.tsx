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

import { useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { useEditorStore } from '@finos/legend-studio';
import { useResizeDetector } from 'react-resize-detector';
import {
  BlankPanelContent,
  ShapesIcon,
  PlayIcon,
  UserIcon,
  QuestionCircleIcon,
  clsx,
  EnvelopIcon,
  MappingIcon,
  RuntimeIcon,
  CustomSelectorInput,
} from '@finos/legend-art';
import {
  DataSpaceEditorState,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
} from '../../stores/studio/DataSpaceEditorState';
import type { Diagram } from '@finos/legend-extension-dsl-diagram';
import { DiagramRenderer } from '@finos/legend-extension-dsl-diagram';

interface DataSpaceViewerActivityConfig {
  mode: DATA_SPACE_VIEWER_ACTIVITY_MODE;
  title: string;
  icon: React.ReactElement;
}

const DataSpaceDiagramCanvas = observer(
  (
    props: {
      dataSpaceEditorState: DataSpaceEditorState;
      diagram: Diagram;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { dataSpaceEditorState, diagram } = props;
    const diagramCanvasRef =
      ref as React.MutableRefObject<HTMLDivElement | null>;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    useEffect(() => {
      if (diagramCanvasRef.current) {
        const renderer = new DiagramRenderer(diagramCanvasRef.current, diagram);
        dataSpaceEditorState.setRenderer(renderer);
        renderer.render();
        renderer.autoRecenter();
      }
    }, [diagramCanvasRef, dataSpaceEditorState, diagram]);

    useEffect(() => {
      if (dataSpaceEditorState.isDiagramRendererInitialized) {
        dataSpaceEditorState.renderer.refresh();
      }
    }, [dataSpaceEditorState, width, height]);

    return (
      <div
        ref={diagramCanvasRef}
        className="diagram-canvas"
        tabIndex={0}
        onContextMenu={(event): void => event.preventDefault()}
      />
    );
  },
  { forwardRef: true },
);

type DiagramOption = { label: string; value: Diagram };
const buildDiagramOption = (diagram: Diagram): DiagramOption => ({
  label: diagram.name,
  value: diagram,
});

const DataSpaceModelsOverview = observer(
  (props: { dataSpaceEditorState: DataSpaceEditorState }) => {
    const { dataSpaceEditorState } = props;
    const diagramCanvasRef = useRef<HTMLDivElement>(null);
    const diagramOptions =
      dataSpaceEditorState.diagrams.map(buildDiagramOption);
    const selectedDiagramOption = dataSpaceEditorState.currentDiagram
      ? buildDiagramOption(dataSpaceEditorState.currentDiagram)
      : null;
    const onDiagramOptionChange = (option: DiagramOption): void => {
      if (option.value !== dataSpaceEditorState.currentDiagram) {
        dataSpaceEditorState.setCurrentDiagram(option.value);
      }
    };

    return (
      <>
        {dataSpaceEditorState.diagrams.length !== 0 && (
          <div className="data-space-viewer__main-panel__content data-space-viewer__overview-panel">
            <div className="data-space-viewer__overview-panel__header">
              <CustomSelectorInput
                className="data-space-viewer__overview-panel__diagram-selector"
                options={diagramOptions}
                onChange={onDiagramOptionChange}
                value={selectedDiagramOption}
                placeholder="Search for a diagram"
                darkMode={true}
              />
            </div>
            <div className="data-space-viewer__overview-panel__content">
              {dataSpaceEditorState.currentDiagram && (
                <DataSpaceDiagramCanvas
                  dataSpaceEditorState={dataSpaceEditorState}
                  diagram={dataSpaceEditorState.currentDiagram}
                  ref={diagramCanvasRef}
                />
              )}
            </div>
          </div>
        )}
        {dataSpaceEditorState.diagrams.length === 0 && (
          <BlankPanelContent>No diagrams available</BlankPanelContent>
        )}
      </>
    );
  },
);

export const DataSpaceViewer = observer(() => {
  const editorStore = useEditorStore();
  const dataSpaceEditorState =
    editorStore.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceEditorState.dataSpace;
  const changeActivity =
    (activity: DATA_SPACE_VIEWER_ACTIVITY_MODE): (() => void) =>
    (): void =>
      dataSpaceEditorState.setCurrentActivity(activity);

  const activities: DataSpaceViewerActivityConfig[] = [
    {
      mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS,
      title: 'Models Overview',
      icon: <ShapesIcon />,
    },
    {
      mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION,
      title: 'Execution Context',
      icon: <PlayIcon />,
    },
    {
      mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.ENTITLEMENT,
      title: 'Entitlement',
      icon: <UserIcon />,
    },
    {
      mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT,
      title: 'Support',
      icon: <QuestionCircleIcon />,
    },
  ];

  return (
    <div className="data-space-viewer">
      <div className="data-space-viewer__header">
        <div className="data-space-viewer__path">{dataSpace.path}</div>
        <div className="data-space-viewer__gav">
          <div className="data-space-viewer__gav__group-id">
            {dataSpace.groupId}
          </div>
          <div className="data-space-viewer__gav__separator">:</div>
          <div className="data-space-viewer__gav__artifact-id">
            {dataSpace.artifactId}
          </div>
          <div className="data-space-viewer__gav__separator">:</div>
          <div className="data-space-viewer__gav__version-id">
            {dataSpace.versionId}
          </div>
        </div>
        <div className="data-space-viewer__description">
          {dataSpace.description ? (
            dataSpace.description
          ) : (
            <div className="data-space-viewer__description--empty">
              No description
            </div>
          )}
        </div>
      </div>
      <div className="data-space-viewer__content">
        <div className="data-space-viewer__body">
          <div className="data-space-viewer__activity-bar">
            <div className="data-space-viewer__activity-bar__items">
              {activities.map((activity) => (
                <button
                  key={activity.mode}
                  className={clsx('data-space-viewer__activity-bar__item', {
                    'data-space-viewer__activity-bar__item--active':
                      dataSpaceEditorState.currentActivity === activity.mode,
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
          <div className="data-space-viewer__main-panel">
            {dataSpaceEditorState.currentActivity ===
              DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS && (
              <DataSpaceModelsOverview
                dataSpaceEditorState={dataSpaceEditorState}
              />
            )}
            {dataSpaceEditorState.currentActivity ===
              DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION && (
              <div className="data-space-viewer__main-panel__content data-space-viewer__execution-panel">
                <div className="data-space-viewer__panel__info-entry">
                  <div className="data-space-viewer__panel__info-entry__icon">
                    <MappingIcon />
                  </div>
                  <div className="data-space-viewer__panel__info-entry__content">
                    {dataSpace.mapping}
                  </div>
                </div>
                <div className="data-space-viewer__panel__info-entry">
                  <div className="data-space-viewer__panel__info-entry__icon">
                    <RuntimeIcon />
                  </div>
                  <div className="data-space-viewer__panel__info-entry__content">
                    {dataSpace.runtime}
                  </div>
                </div>
              </div>
            )}
            {dataSpaceEditorState.currentActivity ===
              DATA_SPACE_VIEWER_ACTIVITY_MODE.ENTITLEMENT && (
              <BlankPanelContent>(WIP)</BlankPanelContent>
            )}
            {dataSpaceEditorState.currentActivity ===
              DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT && (
              <div className="data-space-viewer__main-panel__content data-space-viewer__support-panel">
                <div className="data-space-viewer__panel__info-entry">
                  <div className="data-space-viewer__panel__info-entry__icon">
                    <EnvelopIcon />
                  </div>
                  <div className="data-space-viewer__panel__info-entry__content">
                    {dataSpace.supportEmail ?? '(no support contact available)'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
