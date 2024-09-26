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
  AnchorLinkIcon,
  BlankPanelContent,
  CodeIcon,
  CopyIcon,
  DataAccessIcon,
  LegendLogo,
  MoreVerticalIcon,
  QuestionCircleIcon,
  StatisticsIcon,
  clsx,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  DataSpaceExecutableTDSResult,
  type DataSpaceExecutableAnalysisResult,
  type DataSpaceExecutableTDSResultColumn,
  DataSpaceServiceExecutableInfo,
  DataSpaceMultiExecutionServiceExecutableInfo,
} from '../graph-manager/action/analytics/DataSpaceAnalysis.js';
import { DataSpaceMarkdownTextViewer } from './DataSpaceMarkdownTextViewer.js';
import type { DSL_DataSpace_LegendApplicationPlugin_Extension } from '../stores/DSL_DataSpace_LegendApplicationPlugin_Extension.js';
import { useEffect, useRef, useState } from 'react';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
} from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  DATA_SPACE_VIEWER_ACTIVITY_MODE,
  generateAnchorForActivity,
  generateAnchorForQuickStart,
} from '../stores/DataSpaceViewerNavigation.js';
import { DataAccessOverview } from '@finos/legend-query-builder';

enum TDS_EXECUTABLE_ACTION_TAB {
  COLUMN_SPECS = 'COLUMN_SPECS',
  QUERY = 'QUERY',

  DATA_ACCESS = 'DATA_ACCESS',
  USAGE_STATS = 'USAGE_STATS',
  QUERY_TEXT = 'QUERY_TEXT',
}

const TDSColumnDocumentationCellRenderer = (
  params: DataGridCellRendererParams<DataSpaceExecutableTDSResultColumn>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return data.documentation?.trim() ? (
    data.documentation
  ) : (
    <div className="data-space__viewer__grid__empty-cell">
      No documentation provided
    </div>
  );
};

const TDSColumnSampleValuesCellRenderer = (
  params: DataGridCellRendererParams<DataSpaceExecutableTDSResultColumn>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return data.sampleValues?.trim() ? (
    data.sampleValues
  ) : (
    <div className="data-space__viewer__grid__empty-cell">
      No sample values provided
    </div>
  );
};

const DataSpaceExecutableTDSResultView = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    executableAnalysisResult: DataSpaceExecutableAnalysisResult;
    tdsResult: DataSpaceExecutableTDSResult;
  }) => {
    const { dataSpaceViewerState, executableAnalysisResult, tdsResult } = props;
    const applicationStore = useApplicationStore();
    const [selectedTab, setSelectedTab] = useState<string>(
      TDS_EXECUTABLE_ACTION_TAB.COLUMN_SPECS,
    );
    const queryText = executableAnalysisResult.info?.query;
    const dataAccessState =
      dataSpaceViewerState.quickStartState.dataAccessStateIndex.get(
        executableAnalysisResult,
      );

    const openServiceQuery = (): void => {
      if (
        executableAnalysisResult.info instanceof
          DataSpaceServiceExecutableInfo ||
        executableAnalysisResult.info instanceof
          DataSpaceMultiExecutionServiceExecutableInfo
      ) {
        if (executableAnalysisResult.executable) {
          dataSpaceViewerState.openServiceQuery(
            executableAnalysisResult.executable,
          );
        }
      }
    };
    const columnSpecifications = tdsResult.columns;
    const extractTDSExecutableActionConfigurations =
      applicationStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_DataSpace_LegendApplicationPlugin_Extension
            ).getExtraDataSpaceTDSExecutableActionConfigurations?.() ?? [],
        )
        .filter((configuration) =>
          configuration.isSupported(
            dataSpaceViewerState,
            executableAnalysisResult,
            tdsResult,
          ),
        );
    const currentTabExtensionConfig =
      extractTDSExecutableActionConfigurations.find(
        (config) => config.key === selectedTab,
      );
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    return (
      <div className="data-space__viewer__quickstart__item__content">
        <div className="data-space__viewer__quickstart__item__content__tab__header">
          <div className="data-space__viewer__quickstart__item__content__tabs">
            <button
              className={clsx(
                'data-space__viewer__quickstart__item__content__tab',
                {
                  'data-space__viewer__quickstart__item__content__tab--active':
                    selectedTab === TDS_EXECUTABLE_ACTION_TAB.COLUMN_SPECS,
                },
              )}
              tabIndex={-1}
              onClick={() =>
                setSelectedTab(TDS_EXECUTABLE_ACTION_TAB.COLUMN_SPECS)
              }
            >
              <div className="data-space__viewer__quickstart__item__content__tab__label">
                Column Specifications
              </div>
            </button>
            <button
              className={clsx(
                'data-space__viewer__quickstart__item__content__tab',
                {
                  'data-space__viewer__quickstart__item__content__tab--active':
                    selectedTab === TDS_EXECUTABLE_ACTION_TAB.QUERY,
                },
              )}
              tabIndex={-1}
              onClick={() => setSelectedTab(TDS_EXECUTABLE_ACTION_TAB.QUERY)}
            >
              <div className="data-space__viewer__quickstart__item__content__tab__icon">
                <LegendLogo className="data-space__viewer__quickstart__item__content__tab__icon--query" />
              </div>
              <div className="data-space__viewer__quickstart__item__content__tab__label">
                Query
              </div>
            </button>
            {extractTDSExecutableActionConfigurations.map((config) => (
              <button
                key={config.key}
                className={clsx(
                  'data-space__viewer__quickstart__item__content__tab',
                  {
                    'data-space__viewer__quickstart__item__content__tab--active':
                      selectedTab === config.key,
                  },
                )}
                tabIndex={-1}
                onClick={() => setSelectedTab(config.key)}
              >
                {config.icon !== undefined && (
                  <div className="data-space__viewer__quickstart__item__content__tab__icon">
                    {config.icon}
                  </div>
                )}
                <div className="data-space__viewer__quickstart__item__content__tab__label">
                  {config.title}
                </div>
              </button>
            ))}
          </div>
          <div className="data-space__viewer__quickstart__item__content__action-tab-group">
            <button
              className={clsx(
                'data-space__viewer__quickstart__item__content__tab',
                {
                  'data-space__viewer__quickstart__item__content__tab--active':
                    selectedTab === TDS_EXECUTABLE_ACTION_TAB.DATA_ACCESS,
                },
              )}
              tabIndex={-1}
              title="Data Access"
              onClick={() =>
                setSelectedTab(TDS_EXECUTABLE_ACTION_TAB.DATA_ACCESS)
              }
            >
              <div className="data-space__viewer__quickstart__item__content__tab__icon">
                <DataAccessIcon />
              </div>
              <div className="data-space__viewer__quickstart__item__content__tab__label">
                Data Access
              </div>
            </button>
            <button
              className={clsx(
                'data-space__viewer__quickstart__item__content__tab',
                {
                  'data-space__viewer__quickstart__item__content__tab--active':
                    selectedTab === TDS_EXECUTABLE_ACTION_TAB.USAGE_STATS,
                },
              )}
              tabIndex={-1}
              title="Usage Statistics"
              onClick={() =>
                setSelectedTab(TDS_EXECUTABLE_ACTION_TAB.USAGE_STATS)
              }
            >
              <div className="data-space__viewer__quickstart__item__content__tab__icon">
                <StatisticsIcon />
              </div>
            </button>
            {queryText !== undefined && (
              <button
                className={clsx(
                  'data-space__viewer__quickstart__item__content__tab',
                  {
                    'data-space__viewer__quickstart__item__content__tab--active':
                      selectedTab === TDS_EXECUTABLE_ACTION_TAB.QUERY_TEXT,
                  },
                )}
                tabIndex={-1}
                title="Pure Query"
                onClick={() =>
                  setSelectedTab(TDS_EXECUTABLE_ACTION_TAB.QUERY_TEXT)
                }
              >
                <div className="data-space__viewer__quickstart__item__content__tab__icon">
                  <CodeIcon className="data-space__viewer__quickstart__item__content__tab__icon--query" />
                </div>
              </button>
            )}
          </div>
        </div>
        <div className="data-space__viewer__quickstart__item__content__tab__content">
          {selectedTab === TDS_EXECUTABLE_ACTION_TAB.COLUMN_SPECS && (
            <div
              className={clsx(
                'data-space__viewer__quickstart__tds__column-specs',
                'data-space__viewer__grid',
                {
                  'ag-theme-balham': !darkMode,
                  'ag-theme-balham-dark': darkMode,
                },
              )}
            >
              <DataGrid
                rowData={columnSpecifications}
                gridOptions={{
                  suppressScrollOnNewData: true,
                  getRowId: (rowData) => rowData.data.uuid,
                }}
                suppressFieldDotNotation={true}
                columnDefs={[
                  {
                    minWidth: 50,
                    sortable: true,
                    resizable: true,
                    field: 'name',
                    headerValueGetter: () =>
                      `Column ${
                        columnSpecifications.length
                          ? ` (${columnSpecifications.length})`
                          : ''
                      }`,
                    flex: 1,
                  },
                  {
                    minWidth: 50,
                    sortable: false,
                    resizable: true,
                    cellRenderer: TDSColumnDocumentationCellRenderer,
                    headerName: 'Documentation',
                    flex: 1,
                    wrapText: true,
                    autoHeight: true,
                  },
                  {
                    minWidth: 50,
                    sortable: false,
                    resizable: false,
                    headerClass: 'data-space__viewer__grid__last-column-header',
                    cellRenderer: TDSColumnSampleValuesCellRenderer,
                    headerName: 'Sample Values',
                    flex: 1,
                  },
                ]}
              />
            </div>
          )}
          {selectedTab === TDS_EXECUTABLE_ACTION_TAB.QUERY && (
            <div className="data-space__viewer__quickstart__tds__query">
              <div className="data-space__viewer__quickstart__tds__query__actions">
                <button
                  className="data-space__viewer__quickstart__tds__query__action btn--dark"
                  tabIndex={-1}
                  onClick={openServiceQuery}
                >
                  Open in Query
                </button>
                <button
                  className="data-space__viewer__quickstart__tds__query__action btn--dark"
                  tabIndex={-1}
                  disabled={true}
                >
                  Open in Query with Test Data
                </button>
              </div>
            </div>
          )}
          {selectedTab === TDS_EXECUTABLE_ACTION_TAB.DATA_ACCESS &&
            (dataAccessState ? (
              <DataAccessOverview
                dataAccessState={dataAccessState}
                compact={true}
              />
            ) : (
              <div className="data-space__viewer__quickstart__tds__placeholder-panel">
                <BlankPanelContent>
                  No data access information available
                </BlankPanelContent>
              </div>
            ))}
          {selectedTab === TDS_EXECUTABLE_ACTION_TAB.USAGE_STATS && (
            <div className="data-space__viewer__quickstart__tds__placeholder-panel">
              <BlankPanelContent>
                Usage Statistics (Work in Progress)
              </BlankPanelContent>
            </div>
          )}
          {selectedTab === TDS_EXECUTABLE_ACTION_TAB.QUERY_TEXT &&
            queryText !== undefined && (
              <div className="data-space__viewer__quickstart__tds__query-text">
                <div className="data-space__viewer__quickstart__tds__query-text__content">
                  <CodeEditor
                    inputValue={queryText}
                    isReadOnly={true}
                    lightTheme={CODE_EDITOR_THEME.ONE_DARK_PRO}
                    language={CODE_EDITOR_LANGUAGE.PURE}
                    hideMinimap={true}
                    hideGutter={true}
                  />
                </div>
                <div className="data-space__viewer__quickstart__tds__query-text__actions">
                  <button
                    className="data-space__viewer__quickstart__tds__query-text__action"
                    tabIndex={-1}
                    title="Copy"
                    onClick={() => {
                      applicationStore.clipboardService
                        .copyTextToClipboard(queryText)
                        .catch(applicationStore.alertUnhandledError);
                    }}
                  >
                    <CopyIcon />
                  </button>
                  <button
                    className="data-space__viewer__quickstart__tds__query-text__action"
                    tabIndex={-1}
                  >
                    <MoreVerticalIcon />
                  </button>
                </div>
              </div>
            )}
          {currentTabExtensionConfig?.renderer(
            dataSpaceViewerState,
            executableAnalysisResult,
            tdsResult,
          )}
        </div>
      </div>
    );
  },
);

const DataSpaceExecutableAnalysisResultView = observer(
  (props: {
    dataSpaceViewerState: DataSpaceViewerState;
    executableAnalysisResult: DataSpaceExecutableAnalysisResult;
  }) => {
    const { dataSpaceViewerState, executableAnalysisResult } = props;
    const quickStartRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForQuickStart(executableAnalysisResult);

    useEffect(() => {
      if (quickStartRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          quickStartRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    return (
      <div ref={quickStartRef} className="data-space__viewer__quickstart__item">
        <div className="data-space__viewer__quickstart__item__header">
          <div className="data-space__viewer__quickstart__item__header__title">
            {executableAnalysisResult.title}
          </div>
          <div className="data-space__viewer__quickstart__item__header__type">
            {executableAnalysisResult.result instanceof
            DataSpaceExecutableTDSResult
              ? 'TDS'
              : 'UNKNOWN'}
          </div>
          <button
            className="data-space__viewer__quickstart__item__header__anchor"
            tabIndex={-1}
            onClick={() => dataSpaceViewerState.changeZone(anchor, true)}
          >
            <AnchorLinkIcon />
          </button>
        </div>
        {executableAnalysisResult.description !== undefined && (
          <div className="data-space__viewer__quickstart__item__description">
            <DataSpaceMarkdownTextViewer
              value={executableAnalysisResult.description}
            />
          </div>
        )}
        {executableAnalysisResult.result instanceof
          DataSpaceExecutableTDSResult && (
          <DataSpaceExecutableTDSResultView
            dataSpaceViewerState={dataSpaceViewerState}
            executableAnalysisResult={executableAnalysisResult}
            tdsResult={executableAnalysisResult.result}
          />
        )}
      </div>
    );
  },
);

export const DataSpaceQuickStart = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const applicationStore = useApplicationStore();
    const analysisResult = dataSpaceViewerState.dataSpaceAnalysisResult;
    const documentationUrl = analysisResult.supportInfo?.documentationUrl;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForActivity(
      DATA_SPACE_VIEWER_ACTIVITY_MODE.QUICK_START,
    );

    useEffect(() => {
      if (sectionRef.current) {
        dataSpaceViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () => dataSpaceViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataSpaceViewerState, anchor]);

    const seeDocumentation = (): void => {
      if (documentationUrl) {
        applicationStore.navigationService.navigator.visitAddress(
          documentationUrl,
        );
      }
    };

    return (
      <div ref={sectionRef} className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Quick Start
            <button
              className="data-space__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataSpaceViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
          {Boolean(documentationUrl) && (
            <button
              className="data-space__viewer__wiki__section__header__documentation"
              tabIndex={-1}
              onClick={seeDocumentation}
              title="See Documentation"
            >
              <QuestionCircleIcon />
            </button>
          )}
        </div>
        <div className="data-space__viewer__wiki__section__content">
          {analysisResult.executables.length !== 0 && (
            <div className="data-space__viewer__quickstart">
              {analysisResult.executables.map((executable) => (
                <DataSpaceExecutableAnalysisResultView
                  key={executable.uuid}
                  dataSpaceViewerState={dataSpaceViewerState}
                  executableAnalysisResult={executable}
                />
              ))}
            </div>
          )}
          {analysisResult.executables.length === 0 && (
            <DataSpaceWikiPlaceholder message="(not specified)" />
          )}
        </div>
      </div>
    );
  },
);
