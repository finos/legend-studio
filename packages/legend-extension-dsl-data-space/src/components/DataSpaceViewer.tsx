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
  ShieldIcon,
  LightBulbIcon,
  InfoCircleIcon,
  ExternalLinkIcon,
  useResizeDetector,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  CaretDownIcon,
  ExternalLinkSquareIcon,
  DocumentationIcon,
  TableIcon,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  MarkdownTextViewer,
} from '@finos/legend-art';
import {
  type Diagram,
  DiagramRenderer,
} from '@finos/legend-extension-dsl-diagram';
import { DataSpaceSupportEmail } from '../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import {
  extractElementNameFromPath,
  type PackageableRuntime,
} from '@finos/legend-graph';
import {
  type DataSpaceViewerState,
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
} from '../stores/DataSpaceViewerState.js';
import type { DataSpaceExecutionContextAnalysisResult } from '../graphManager/action/analytics/DataSpaceAnalysis.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { useApplicationStore } from '@finos/legend-application';
import { DSL_DataSpace_LegendApplicationPlugin } from './DSL_DataSpace_LegendApplicationPlugin.js';

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
    const diagramCanvasRef = ref as React.MutableRefObject<HTMLDivElement>;

    const { width, height } = useResizeDetector<HTMLDivElement>({
      refreshMode: 'debounce',
      refreshRate: 50,
      targetRef: diagramCanvasRef,
    });

    useEffect(() => {
      const renderer = new DiagramRenderer(diagramCanvasRef.current, diagram);
      dataSpaceViewerState.setRenderer(renderer);
      dataSpaceViewerState.setupRenderer();
      renderer.render();
      renderer.autoRecenter();
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
      />
    );
  }),
);

const DataSpaceOverview = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;

    // diagram selector
    const diagramCanvasRef = useRef<HTMLDivElement>(null);

    if (analysisResult.featuredDiagrams.length === 0) {
      return <BlankPanelContent>No diagrams available</BlankPanelContent>;
    }
    return (
      <div className="data-space__viewer__main-panel__content data-space__viewer__overview">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel size={250} minSize={100}>
            <div className="data-space__viewer__overview__description">
              {analysisResult.description !== undefined && (
                <div className="data-space__viewer__overview__description__content">
                  <MarkdownTextViewer
                    className="data-space__viewer__overview__description__content__markdown-content"
                    value={{
                      value: analysisResult.description,
                    }}
                  />
                </div>
              )}
              {analysisResult.description === undefined && (
                <div className="data-space__viewer__overview__description--empty">
                  No description
                </div>
              )}
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter />
          <ResizablePanel minSize={100}>
            <div className="data-space__viewer__overview__diagrams">
              <div className="data-space__viewer__overview__diagrams__header">
                <div className="data-space__viewer__overview__diagrams__header__tabs">
                  {analysisResult.featuredDiagrams.map((diagram) => (
                    <button
                      key={diagram.path}
                      className={clsx(
                        'data-space__viewer__overview__diagrams__header__tab',
                        {
                          'data-space__viewer__overview__diagrams__header__tab--active':
                            dataSpaceViewerState.currentDiagram === diagram,
                        },
                      )}
                      onClick={() =>
                        dataSpaceViewerState.setCurrentDiagram(diagram)
                      }
                    >
                      {diagram.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="data-space__viewer__overview__diagrams__content">
                {dataSpaceViewerState.currentDiagram && (
                  <DataSpaceDiagramCanvas
                    dataSpaceViewerState={dataSpaceViewerState}
                    diagram={dataSpaceViewerState.currentDiagram}
                    ref={diagramCanvasRef}
                  />
                )}
              </div>
              <div className="data-space__viewer__overview__diagrams__footer">
                <div className="data-space__viewer__overview__diagrams__footer__icon">
                  <LightBulbIcon />
                </div>
                <div className="data-space__viewer__overview__diagrams__footer__text">
                  Double-click a class to start a query for that class
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);

const DataSpaceDocumentation = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const documentationEntries =
      dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;

    if (documentationEntries.length === 0) {
      return <BlankPanelContent>No documentation available</BlankPanelContent>;
    }
    return (
      <div className="data-space__viewer__main-panel__content data-space__viewer__overview">
        <table className="table">
          <thead>
            <tr>
              <th className="table__cell--left">Element</th>
              <th className="table__cell--left"></th>
              <th className="table__cell--left">Documentation</th>
            </tr>
          </thead>
          <tbody>
            {documentationEntries.map((entry) => (
              <tr
                key={entry.uuid}
                className={'query-editor__query-loader__body__table__row'}
              >
                <td className="table__cell--left">{entry.elementPath}</td>
                <td className="table__cell--left">
                  {entry.subElementText ?? ''}
                </td>
                <td className="table__cell--left">{entry.doc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
);

type ExecutionContextOption = {
  label: string;
  value: DataSpaceExecutionContextAnalysisResult;
};
const buildExecutionContextOption = (
  value: DataSpaceExecutionContextAnalysisResult,
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
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const executionContexts = Array.from(
      dataSpaceViewerState.dataSpaceAnalysisResult.executionContextsIndex.values(),
    );

    // execution
    const executionContextOptions = executionContexts.map(
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
        {option.value === analysisResult.defaultExecutionContext && (
          <div className="data-space__viewer__execution__entry__content__dropdown__option__tag">
            default
          </div>
        )}
      </div>
    );

    // runtime
    const runtimeOptions =
      dataSpaceViewerState.currentExecutionContext.compatibleRuntimes.map(
        buildRuntimeOption,
      );
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
          dataSpaceViewerState.currentExecutionContext.defaultRuntime && (
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
            {dataSpaceViewerState.currentExecutionContext.mapping.path}
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

const DataSpaceInfo = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const viewProject = (): void =>
      dataSpaceViewerState.viewProject(
        dataSpaceViewerState.groupId,
        dataSpaceViewerState.artifactId,
        dataSpaceViewerState.versionId,
        undefined,
      );
    const viewDataSpaceInProject = (): void =>
      dataSpaceViewerState.viewProject(
        dataSpaceViewerState.groupId,
        dataSpaceViewerState.artifactId,
        dataSpaceViewerState.versionId,
        analysisResult.path,
      );

    return (
      <div className="data-space__viewer__info">
        <div className="data-space__viewer__info__section">
          <div className="data-space__viewer__info__section__entry">
            <div className="data-space__viewer__info__project-info__label">
              Project
            </div>
            <button
              className="data-space__viewer__info__project-info__value"
              tabIndex={-1}
              title="View Project"
              onClick={viewProject}
            >
              {generateGAVCoordinates(
                dataSpaceViewerState.groupId,
                dataSpaceViewerState.artifactId,
                dataSpaceViewerState.versionId,
              )}
            </button>
            <div className="data-space__viewer__info__project-info__link">
              <ExternalLinkIcon />
            </div>
          </div>
          <div className="data-space__viewer__info__section__entry">
            <div className="data-space__viewer__info__project-info__label">
              Data Space
            </div>
            <button
              className="data-space__viewer__info__project-info__value"
              tabIndex={-1}
              title="View Data Space"
              onClick={viewDataSpaceInProject}
            >
              {analysisResult.path}
            </button>
            <div className="data-space__viewer__info__project-info__link">
              <ExternalLinkIcon />
            </div>
          </div>
        </div>
        <div className="data-space__viewer__info__section">
          <div className="data-space__viewer__info__section__title">
            Tagged Values
          </div>
          {analysisResult.taggedValues.length !== 0 &&
            analysisResult.taggedValues.map((taggedValue) => (
              <div
                key={taggedValue._UUID}
                className="data-space__viewer__info__section__entry"
              >
                <div
                  className="data-space__viewer__info__tagged-value__tag"
                  title={`${taggedValue.profile}.${taggedValue.tag}`}
                >
                  {`${extractElementNameFromPath(taggedValue.profile)}.${
                    taggedValue.tag
                  }`}
                </div>
                <div className="data-space__viewer__info__tagged-value__value">
                  {taggedValue.value}
                </div>
              </div>
            ))}
          {analysisResult.taggedValues.length === 0 && (
            <div className="data-space__viewer__info__section__placeholder">
              (empty)
            </div>
          )}
        </div>
        <div className="data-space__viewer__info__section">
          <div className="data-space__viewer__info__section__title">
            Stereotypes
          </div>
          {analysisResult.stereotypes.length !== 0 &&
            analysisResult.stereotypes.map((stereotype) => (
              <div
                key={stereotype._UUID}
                className="data-space__viewer__info__section__entry"
                title={`${stereotype.profile}.${stereotype.value}`}
              >
                <div className="data-space__viewer__info__steoreotype">
                  {`${extractElementNameFromPath(stereotype.profile)}.${
                    stereotype.value
                  }`}
                </div>
              </div>
            ))}
          {analysisResult.stereotypes.length === 0 && (
            <div className="data-space__viewer__info__section__placeholder">
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
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const supportInfo =
      dataSpaceViewerState.dataSpaceAnalysisResult.supportInfo;

    if (supportInfo === undefined) {
      return <BlankPanelContent>No support info available</BlankPanelContent>;
    } else if (supportInfo instanceof DataSpaceSupportEmail) {
      return (
        <DataSpaceSupportEmailViewer
          dataSpaceViewerState={dataSpaceViewerState}
          dataSpaceSupportEmail={supportInfo}
        />
      );
    }
    return (
      <BlankPanelContent>Can&apos;t display support info</BlankPanelContent>
    );
  },
);

const renderDataSpaceCheckEntitlementsEditor = (
  dataSpaceViewerState: DataSpaceViewerState,
  plugins: DSL_DataSpace_LegendApplicationPlugin[],
): React.ReactNode => {
  const checkEntitlementsEditorRenderers = plugins.flatMap(
    (plugin) => plugin.getCheckEntitlementsEditorRender() ?? [],
  );
  for (const editorRenderer of checkEntitlementsEditorRenderers) {
    const editor = editorRenderer(dataSpaceViewerState);
    if (editor) {
      return editor;
    }
  }
  return (
    <BlankPanelContent>
      Check entitlement(s) (Work in Progress)
    </BlankPanelContent>
  );
};

export const DataSpaceViewer = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const changeActivity =
      (activity: DATA_SPACE_VIEWER_ACTIVITY_MODE): (() => void) =>
      (): void =>
        dataSpaceViewerState.setCurrentActivity(activity);

    const activities: DataSpaceViewerActivityConfig[] = [
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.OVERVIEW,
        title: 'Overview',
        icon: <ShapesIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.DOCUMENTATION,
        title: 'Documentation',
        icon: <DocumentationIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.EXECUTION,
        title: 'Execution Context',
        icon: <PlayIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.TEST_DATA,
        title: 'Test Data',
        icon: <FlaskIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.SAMPLE_DATA_TABLE,
        title: 'Sample Data Table',
        icon: <TableIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.ENTITLEMENT,
        title: 'Entitlement',
        icon: <KeyIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.TEST_COVERAGE,
        title: 'Test Coverage',
        icon: <ShieldIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.INFO,
        title: 'Info',
        icon: <InfoCircleIcon />,
      },
      {
        mode: DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT,
        title: 'Support',
        icon: <QuestionCircleIcon />,
      },
    ];

    const viewProject = (): void =>
      dataSpaceViewerState.viewProject(
        dataSpaceViewerState.groupId,
        dataSpaceViewerState.artifactId,
        dataSpaceViewerState.versionId,
        analysisResult.path,
      );
    const viewSDLCProject = (): void => {
      dataSpaceViewerState
        .viewSDLCProject(
          dataSpaceViewerState.groupId,
          dataSpaceViewerState.artifactId,
          analysisResult.path,
        )
        .catch(applicationStore.alertUnhandledError);
    };

    return (
      <div className="data-space__viewer">
        <div className="data-space__viewer__header">
          <div className="data-space__viewer__title">
            <button
              className="data-space__viewer__title__btn"
              tabIndex={-1}
              title={`View Project (${generateGAVCoordinates(
                dataSpaceViewerState.groupId,
                dataSpaceViewerState.artifactId,
                dataSpaceViewerState.versionId,
              )})`}
              onClick={viewProject}
            >
              <div
                className="data-space__viewer__title__label"
                title={`${analysisResult.title ?? analysisResult.name} - ${
                  analysisResult.path
                }`}
              >
                {analysisResult.title ?? analysisResult.name}
              </div>
              <div className="data-space__viewer__title__link">
                <ExternalLinkSquareIcon />
              </div>
            </button>
            <DropdownMenu
              className="data-space__viewer__title__dropdown-trigger"
              content={
                <MenuContent>
                  <MenuContentItem onClick={viewSDLCProject}>
                    View SDLC project
                  </MenuContentItem>
                </MenuContent>
              }
            >
              <CaretDownIcon title="Show more options..." />
            </DropdownMenu>
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
                DATA_SPACE_VIEWER_ACTIVITY_MODE.OVERVIEW && (
                <DataSpaceOverview
                  dataSpaceViewerState={dataSpaceViewerState}
                />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.DOCUMENTATION && (
                <DataSpaceDocumentation
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
                DATA_SPACE_VIEWER_ACTIVITY_MODE.SAMPLE_DATA_TABLE && (
                <BlankPanelContent>
                  View sample data table (Work in Progress)
                </BlankPanelContent>
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.ENTITLEMENT &&
                renderDataSpaceCheckEntitlementsEditor(
                  dataSpaceViewerState,
                  applicationStore.pluginManager
                    .getApplicationPlugins()
                    .filter(
                      (plugin) =>
                        plugin instanceof DSL_DataSpace_LegendApplicationPlugin,
                    ) as DSL_DataSpace_LegendApplicationPlugin[],
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
                DATA_SPACE_VIEWER_ACTIVITY_MODE.INFO && (
                <DataSpaceInfo dataSpaceViewerState={dataSpaceViewerState} />
              )}
              {dataSpaceViewerState.currentActivity ===
                DATA_SPACE_VIEWER_ACTIVITY_MODE.SUPPORT && (
                <div className="data-space__viewer__main-panel__content data-space__viewer__support-info">
                  <DataSpaceSupportInfoViewerInner
                    dataSpaceViewerState={dataSpaceViewerState}
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
