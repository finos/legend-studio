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

import { useRef, useEffect, forwardRef } from 'react';
import { observer } from 'mobx-react-lite';
import { useResizeDetector } from 'react-resize-detector';
import {
  BlankPanelContent,
  ShapesIcon,
  PlayIcon,
  QuestionCircleIcon,
  EnvelopIcon,
  clsx,
  CustomSelectorInput,
  PURE_MappingIcon,
  PURE_RuntimeIcon,
  CogIcon,
  KeyIcon,
  FlaskIcon,
  ExternalLinkSquareIcon,
  ShieldIcon,
  TagsIcon,
  LightBulbIcon,
} from '@finos/legend-art';
import {
  type Diagram,
  DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram';
import {
  DataSpaceSupportEmail,
  type DataSpaceSupportInfo,
} from '../models/metamodels/pure/model/packageableElements/dataSpace/DSLDataSpace_DataSpace.js';
import type { ResolvedDataSpaceExecutionContext } from '../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin.js';
import type { PackageableRuntime } from '@finos/legend-graph';
import {
  type DataSpaceViewerState,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
} from '../stores/DataSpaceViewerState.js';

interface DataSpaceViewerActivityConfig {
  mode: DATA_SPACE_VIEWER_ACTIVITY_MODE;
  title: string;
  icon: React.ReactElement;
}

const DataSpaceDiagramCanvas = observer(
  forwardRef<
    HTMLDivElement,
    {
      dataSpaceViewerState: DataSpaceViewerState;
      diagram: Diagram;
    }
  >(function DataSpaceDiagramCanvas(props, ref) {
    const { dataSpaceViewerState, diagram } = props;
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
        dataSpaceViewerState.setRenderer(renderer);
        dataSpaceViewerState.setupRenderer();
        renderer.render();
        renderer.autoRecenter();
      }
    }, [diagramCanvasRef, dataSpaceViewerState, diagram]);

    useEffect(() => {
      if (dataSpaceViewerState.isDiagramRendererInitialized) {
        dataSpaceViewerState.renderer.refresh();
      }
    }, [dataSpaceViewerState, width, height]);

    return (
      <div
        ref={diagramCanvasRef}
        className={clsx(
          'diagram-canvas ',
          dataSpaceViewerState.diagramCursorClass,
        )}
        tabIndex={0}
        onContextMenu={(event): void => event.preventDefault()}
      />
    );
  }),
);

type DiagramOption = { label: string; value: Diagram };
const buildDiagramOption = (diagram: Diagram): DiagramOption => ({
  label: diagram.name,
  value: diagram,
});

const DataSpaceModelsOverview = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;

    // diagram selector
    const diagramCanvasRef = useRef<HTMLDivElement>(null);
    const diagramOptions = dataSpaceViewerState.featuredDiagrams
      .concat(
        dataSpaceViewerState.diagrams.filter(
          (diagram) => !dataSpaceViewerState.featuredDiagrams.includes(diagram),
        ),
      )
      .map(buildDiagramOption);
    const selectedDiagramOption = dataSpaceViewerState.currentDiagram
      ? buildDiagramOption(dataSpaceViewerState.currentDiagram)
      : null;
    const onDiagramOptionChange = (option: DiagramOption): void => {
      if (option.value !== dataSpaceViewerState.currentDiagram) {
        dataSpaceViewerState.setCurrentDiagram(option.value);
      }
    };
    const formatDiagramOptionLabel = (
      option: DiagramOption,
    ): React.ReactNode => (
      <div className="data-space__viewer__diagrams__dropdown__option">
        <div className="data-space__viewer__diagrams__dropdown__option__label">
          {option.label}
        </div>
        {dataSpaceViewerState.featuredDiagrams.includes(option.value) && (
          <div className="data-space__viewer__diagrams__dropdown__option__tag">
            featured
          </div>
        )}
      </div>
    );

    if (dataSpaceViewerState.diagrams.length === 0) {
      return <BlankPanelContent>No diagrams available</BlankPanelContent>;
    }
    return (
      <div className="data-space__viewer__main-panel__content data-space__viewer__diagrams">
        <div className="data-space__viewer__diagrams__header">
          <CustomSelectorInput
            className="data-space__viewer__diagrams__diagram-selector"
            options={diagramOptions}
            onChange={onDiagramOptionChange}
            value={selectedDiagramOption}
            placeholder="Search for a diagram"
            darkMode={true}
            formatOptionLabel={formatDiagramOptionLabel}
          />
        </div>
        <div className="data-space__viewer__diagrams__content">
          {dataSpaceViewerState.currentDiagram && (
            <DataSpaceDiagramCanvas
              dataSpaceViewerState={dataSpaceViewerState}
              diagram={dataSpaceViewerState.currentDiagram}
              ref={diagramCanvasRef}
            />
          )}
        </div>
        <div className="data-space__viewer__diagrams__footer">
          <div className="data-space__viewer__diagrams__footer__icon">
            <LightBulbIcon />
          </div>
          <div className="data-space__viewer__diagrams__footer__text">
            Double-click a class to start a query for that class
          </div>
        </div>
      </div>
    );
  },
);

type ExecutionContextOption = {
  label: string;
  value: ResolvedDataSpaceExecutionContext;
};
const buildExecutionContextOption = (
  value: ResolvedDataSpaceExecutionContext,
): ExecutionContextOption => ({
  label: value.name,
  value: value,
});

type RuntimeOption = {
  label: string;
  value: PackageableRuntime;
};
const buildRuntimeOption = (value: PackageableRuntime): RuntimeOption => ({
  label: value.name,
  value: value,
});

const DataSpaceExecutionViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;

    // execution
    const executionContextOptions =
      dataSpaceViewerState.dataSpace.executionContexts.map(
        buildExecutionContextOption,
      );
    const selectedExecutionContextOption = buildExecutionContextOption(
      dataSpaceViewerState.currentExecutionContext,
    );
    const onExecutionContextOptionChange = (
      option: ExecutionContextOption,
    ): void => {
      if (option.value !== dataSpaceViewerState.currentExecutionContext) {
        dataSpaceViewerState.setCurrentExecutionContext(option.value);
      }
    };
    const formatExecutionContextOptionLabel = (
      option: ExecutionContextOption,
    ): React.ReactNode => (
      <div className="data-space__viewer__execution__entry__content__dropdown__option">
        <div className="data-space__viewer__execution__entry__content__dropdown__option__label">
          {option.label}
        </div>
        {option.value ===
          dataSpaceViewerState.dataSpace.defaultExecutionContext && (
          <div className="data-space__viewer__execution__entry__content__dropdown__option__tag">
            default
          </div>
        )}
      </div>
    );

    // runtime
    const runtimeOptions =
      dataSpaceViewerState.runtimes.map(buildRuntimeOption);
    const selectedRuntimeOption = buildRuntimeOption(
      dataSpaceViewerState.currentRuntime,
    );
    const onRuntimeOptionChange = (option: RuntimeOption): void => {
      if (option.value !== dataSpaceViewerState.currentRuntime) {
        dataSpaceViewerState.setCurrentRuntime(option.value);
      }
    };
    const formatRuntimeOptionLabel = (
      option: RuntimeOption,
    ): React.ReactNode => (
      <div className="data-space__viewer__execution__entry__content__dropdown__option">
        <div className="data-space__viewer__execution__entry__content__dropdown__option__label">
          {option.label}
        </div>
        {option.value ===
          dataSpaceViewerState.currentExecutionContext.defaultRuntime.value && (
          <div className="data-space__viewer__execution__entry__content__dropdown__option__tag">
            default
          </div>
        )}
      </div>
    );

    return (
      <div className="data-space__viewer__main-panel__content data-space__viewer__execution">
        <div className="data-space__viewer__execution__entry">
          <div className="data-space__viewer__execution__entry__icon">
            <CogIcon className="data-space__viewer__execution__context-icon" />
          </div>
          <div className="data-space__viewer__execution__entry__content data-space__viewer__execution__entry__content__dropdown__container">
            <CustomSelectorInput
              className="data-space__viewer__execution__entry__content__dropdown"
              options={executionContextOptions}
              onChange={onExecutionContextOptionChange}
              value={selectedExecutionContextOption}
              darkMode={true}
              formatOptionLabel={formatExecutionContextOptionLabel}
            />
          </div>
        </div>
        <div
          className={clsx('data-space__viewer__execution__description', {
            'data-space__viewer__execution__description--empty':
              !dataSpaceViewerState.currentExecutionContext.description,
          })}
        >
          {dataSpaceViewerState.currentExecutionContext.description
            ? dataSpaceViewerState.currentExecutionContext.description
            : 'No description'}
        </div>
        <div className="data-space__viewer__execution__entry data-space__viewer__execution__mapping">
          <div className="data-space__viewer__execution__entry__icon">
            <PURE_MappingIcon />
          </div>
          <div className="data-space__viewer__execution__entry__content data-space__viewer__execution__entry__content__text">
            {dataSpaceViewerState.currentExecutionContext.mapping.value.path}
          </div>
        </div>
        <div className="data-space__viewer__execution__entry">
          <div className="data-space__viewer__execution__entry__icon">
            <PURE_RuntimeIcon />
          </div>
          <div className="data-space__viewer__execution__entry__content data-space__viewer__execution__entry__content__dropdown__container">
            <CustomSelectorInput
              className="data-space__viewer__execution__entry__content__dropdown"
              options={runtimeOptions}
              onChange={onRuntimeOptionChange}
              value={selectedRuntimeOption}
              darkMode={true}
              formatOptionLabel={formatRuntimeOptionLabel}
            />
          </div>
        </div>
      </div>
    );
  },
);

const DataSpaceTags = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;

    const dataSpace = dataSpaceViewerState.dataSpace;

    return (
      <div className="data-space__viewer__tags">
        <div className="data-space__viewer__tags__section">
          <div className="data-space__viewer__tags__section__title">
            Tagged Values
          </div>
          {dataSpace.taggedValues.length !== 0 &&
            dataSpace.taggedValues.map((taggedValueData) => (
              <div
                key={taggedValueData.uuid}
                className="data-space__viewer__tags__section__entry"
              >
                <div
                  className="data-space__viewer__tags__tagged-value__tag"
                  title={`${taggedValueData.profile}.${taggedValueData.tag}`}
                >
                  {taggedValueData.tag}
                </div>
                <div className="data-space__viewer__tags__tagged-value__value">
                  {taggedValueData.value}
                </div>
              </div>
            ))}
          {dataSpace.taggedValues.length === 0 && (
            <div className="data-space__viewer__tags__section__placeholder">
              (empty)
            </div>
          )}
        </div>
        <div className="data-space__viewer__tags__section">
          <div className="data-space__viewer__tags__section__title">
            Stereotypes
          </div>
          {dataSpace.stereotypes.length !== 0 &&
            dataSpace.stereotypes.map((stereotypeData) => (
              <div
                key={stereotypeData.uuid}
                className="data-space__viewer__tags__section__entry"
                title={`${stereotypeData.profile}.${stereotypeData.stereotype}`}
              >
                <div className="data-space__viewer__tags__steoreotype">
                  {stereotypeData.stereotype}
                </div>
              </div>
            ))}
          {dataSpace.stereotypes.length === 0 && (
            <div className="data-space__viewer__tags__section__placeholder">
              (empty)
            </div>
          )}
        </div>
      </div>
    );
  },
);

const DataSpaceSupportEmailViewer = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    dataSpaceSupportEmail: DataSpaceSupportEmail;
  }) => {
    const { dataSpaceSupportEmail } = props;

    return (
      <div className="data-space__viewer__support-email">
        <div className="data-space__viewer__support-email__entry">
          <div className="data-space__viewer__support-email__entry__icon">
            <EnvelopIcon />
          </div>
          <a
            href={`mailto:${dataSpaceSupportEmail.address}`}
            className="data-space__viewer__support-email__entry__content"
          >
            {dataSpaceSupportEmail.address}
          </a>
        </div>
      </div>
    );
  },
);

const DataSpaceSupportInfoViewerInner = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    dataSpaceSupportInfo: DataSpaceSupportInfo | undefined;
  }) => {
    const { dataSpaceViewerState, dataSpaceSupportInfo } = props;
    if (dataSpaceSupportInfo === undefined) {
      return <BlankPanelContent>No support info available</BlankPanelContent>;
    } else if (dataSpaceSupportInfo instanceof DataSpaceSupportEmail) {
      return (
        <DataSpaceSupportEmailViewer
          dataSpaceViewerState={dataSpaceViewerState}
          dataSpaceSupportEmail={dataSpaceSupportInfo}
        />
      );
    }
    return (
      <BlankPanelContent>Can&apos;t display support info</BlankPanelContent>
    );
  },
);

export const DataSpaceViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const dataSpace = dataSpaceViewerState.dataSpace;
    const changeActivity =
      (activity: DATA_SPACE_VIEWER_ACTIVITY_MODE): (() => void) =>
      (): void =>
        dataSpaceViewerState.setCurrentActivity(activity);

    const activities: DataSpaceViewerActivityConfig[] = [
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_OVERVIEW,
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
        icon: <KeyIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.TEST_DATA,
        title: 'Test Data',
        icon: <FlaskIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.TEST_COVERAGE,
        title: 'Test Coverage',
        icon: <ShieldIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.TAGS,
        title: 'Tags',
        icon: <TagsIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT,
        title: 'Support',
        icon: <QuestionCircleIcon />,
      },
    ];

    const viewProject = (): void =>
      dataSpaceViewerState.viewProject?.(
        dataSpaceViewerState.groupId,
        dataSpaceViewerState.artifactId,
        dataSpaceViewerState.versionId,
        dataSpace.path,
      );

    return (
      <div className="data-space__viewer">
        <div className="data-space__viewer__header">
          <button
            className="data-space__viewer__path"
            tabIndex={-1}
            title="View Project"
            onClick={viewProject}
          >
            <div className="data-space__viewer__path__label">
              {dataSpace.path}
            </div>
            <div className="data-space__viewer__path__link">
              <ExternalLinkSquareIcon />
            </div>
          </button>
          <div
            className={clsx('data-space__viewer__description', {
              'data-space__viewer__description--empty': !dataSpace.description,
            })}
          >
            {dataSpace.description ? dataSpace.description : 'No description'}
          </div>
        </div>
        <div className="data-space__viewer__content">
          <div className="data-space__viewer__body">
            <div className="data-space__viewer__activity-bar">
              <div className="data-space__viewer__activity-bar__items">
                {activities.map((activity) => (
                  <button
                    key={activity.mode}
                    className={clsx('data-space__viewer__activity-bar__item', {
                      'data-space__viewer__activity-bar__item--active':
                        dataSpaceViewerState.currentActivity === activity.mode,
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
            <div className="data-space__viewer__main-panel">
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.MODELS_OVERVIEW && (
                <DataSpaceModelsOverview
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION && (
                <DataSpaceExecutionViewer
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.ENTITLEMENT && (
                <BlankPanelContent>
                  Request entitlement(s) (Work in Progress)
                </BlankPanelContent>
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.TEST_DATA && (
                <BlankPanelContent>
                  View test data (Work in Progress)
                </BlankPanelContent>
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.TEST_COVERAGE && (
                <BlankPanelContent>
                  View test coverage (Work in Progress)
                </BlankPanelContent>
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.TAGS && (
                <DataSpaceTags dataSpaceViewerState={dataSpaceViewerState} />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT && (
                <div className="data-space__viewer__main-panel__content data-space__viewer__support-info">
                  <DataSpaceSupportInfoViewerInner
                    dataSpaceViewerState={dataSpaceViewerState}
                    dataSpaceSupportInfo={dataSpace.supportInfo}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);
