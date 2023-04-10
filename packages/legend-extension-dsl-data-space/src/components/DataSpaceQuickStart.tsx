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
  CodeIcon,
  CopyIcon,
  LegendLogo,
  MoreVerticalIcon,
  QuestionCircleIcon,
  clsx,
} from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import {
  EDITOR_LANGUAGE,
  TextInputEditor,
  useApplicationStore,
} from '@finos/legend-application';
import {
  DataSpaceExecutableTDSResult,
  type DataSpaceExecutableAnalysisResult,
  type DataSpaceExecutableTDSResultColumn,
} from '../graphManager/action/analytics/DataSpaceAnalysis.js';
import { DataSpaceMarkdownTextViewer } from './DataSpaceMarkdownTextViewer.js';
import type { DSL_DataSpace_LegendApplicationPlugin_Extension } from '../stores/DSL_DataSpace_LegendApplicationPlugin_Extension.js';
import { useState } from 'react';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';
import type { ICellRendererParams } from '@ag-grid-community/core';

enum TDS_EXECUTABLE_ACTION_TAB {
  COLUMN_SPECS = 'COLUMN_SPECS',
  QUERY = 'QUERY',
  QUERY_TEXT = 'QUERY_TEXT',
}

const MIN_NUMBER_OF_ROWS_FOR_AUTO_HEIGHT = 15;

const TDSColumnDocumentationCellRenderer = (
  params: ICellRendererParams<DataSpaceExecutableTDSResultColumn>,
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
  params: ICellRendererParams<DataSpaceExecutableTDSResultColumn>,
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

    const columnSpecifications = tdsResult.columns;
    const autoHeight =
      tdsResult.columns.length <= MIN_NUMBER_OF_ROWS_FOR_AUTO_HEIGHT;
    const extractTDSExecutableActionConfigurations =
      applicationStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_DataSpace_LegendApplicationPlugin_Extension
            ).getExtraDataSpaceTDSExecutableActionConfigurations?.() ?? [],
        );
    const currentTabExtensionConfig =
      extractTDSExecutableActionConfigurations.find(
        (config) => config.key === selectedTab,
      );

    return (
      <div className="data-space__viewer__quickstart__item">
        <div className="data-space__viewer__quickstart__item__header">
          <div className="data-space__viewer__quickstart__item__header__title">
            {executableAnalysisResult.title}
          </div>
          <div className="data-space__viewer__quickstart__item__header__type">
            TDS
          </div>
          <div className="data-space__viewer__quickstart__item__header__anchor">
            <AnchorLinkIcon />
          </div>
        </div>
        {executableAnalysisResult.description !== undefined && (
          <div className="data-space__viewer__quickstart__item__description">
            <DataSpaceMarkdownTextViewer
              value={executableAnalysisResult.description}
            />
          </div>
        )}
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
          <div
            className={clsx(
              'data-space__viewer__quickstart__item__content__tab__content',
              {
                'data-space__viewer__quickstart__item__content__tab__content':
                  autoHeight,
              },
            )}
          >
            {selectedTab === TDS_EXECUTABLE_ACTION_TAB.COLUMN_SPECS && (
              <div className="data-space__viewer__quickstart__tds__column-specs data-space__viewer__grid ag-theme-balham-dark">
                <AgGridReact
                  domLayout={autoHeight ? 'autoHeight' : 'normal'}
                  rowData={columnSpecifications}
                  gridOptions={{
                    suppressScrollOnNewData: true,
                    getRowId: (rowData) => rowData.data.uuid,
                  }}
                  modules={[ClientSideRowModelModule]}
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
                      headerClass:
                        'data-space__viewer__grid__last-column-header',
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
                    onClick={() => {
                      // TODO: wire this so we can go to the query for the service
                    }}
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
            {selectedTab === TDS_EXECUTABLE_ACTION_TAB.QUERY_TEXT &&
              queryText !== undefined && (
                <div className="data-space__viewer__quickstart__tds__query-text">
                  <div className="data-space__viewer__quickstart__tds__query-text__content">
                    <TextInputEditor
                      inputValue={queryText}
                      isReadOnly={true}
                      language={EDITOR_LANGUAGE.PURE}
                      showMiniMap={false}
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

    if (
      executableAnalysisResult.result instanceof DataSpaceExecutableTDSResult
    ) {
      return (
        <DataSpaceExecutableTDSResultView
          dataSpaceViewerState={dataSpaceViewerState}
          executableAnalysisResult={executableAnalysisResult}
          tdsResult={executableAnalysisResult.result}
        />
      );
    }
    return (
      <div className="data-space__viewer__quickstart__item">
        <div className="data-space__viewer__quickstart__item__header">
          <div className="data-space__viewer__quickstart__item__header__title">
            {executableAnalysisResult.title}
          </div>
          <div className="data-space__viewer__quickstart__item__header__type">
            UNKNOWN
          </div>
          <div className="data-space__viewer__quickstart__item__header__anchor">
            <AnchorLinkIcon />
          </div>
        </div>
        {executableAnalysisResult.description !== undefined && (
          <div className="data-space__viewer__quickstart__item__description">
            <DataSpaceMarkdownTextViewer
              value={executableAnalysisResult.description}
            />
          </div>
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

    const seeDocumentation = (): void => {
      if (documentationUrl) {
        applicationStore.navigationService.navigator.visitAddress(
          documentationUrl,
        );
      }
    };

    return (
      <div className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Quick Start
            <div className="data-space__viewer__wiki__section__header__anchor">
              <AnchorLinkIcon />
            </div>
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
          <div className="data-space__viewer__quickstart">
            {analysisResult.executables.map((executable) => (
              <DataSpaceExecutableAnalysisResultView
                key={executable.uuid}
                dataSpaceViewerState={dataSpaceViewerState}
                executableAnalysisResult={executable}
              />
            ))}
          </div>
        </div>
        {analysisResult.executables.length === 0 && (
          <DataSpaceWikiPlaceholder message="No quick start provided" />
        )}
      </div>
    );
  },
);
