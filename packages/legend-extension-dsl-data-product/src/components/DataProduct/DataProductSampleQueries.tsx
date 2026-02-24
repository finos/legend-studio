/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import { useRef, useEffect, useState, useMemo } from 'react';
import {
  AnchorLinkIcon,
  BlankPanelContent,
  CodeIcon,
  DataAccessIcon,
  LegendLogo,
  StatisticsIcon,
  clsx,
  MarkdownTextViewer,
} from '@finos/legend-art';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import { generateAnchorForSection } from '../../stores/ProductViewerNavigation.js';
import {
  V1_SampleQuery,
  V1_ExecutableTDSResult,
  V1_ExecutableRelationResult,
  V1_RelationType,
  V1_getGenericTypeFullPath,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import { isNonNullable, uuid } from '@finos/legend-shared';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
} from '@finos/legend-code-editor';
import { DataAccessOverview } from '@finos/legend-query-builder';
import type { DataProductDataAccess_LegendApplicationPlugin_Extension } from '../../stores/DataProductDataAccess_LegendApplicationPlugin_Extension.js';
import {
  TDSSampleQueryTabKey,
  RelationSampleQueryTabKey,
  type DataProductTDSSampleQueryTabConfiguration,
  type DataProductRelationSampleQueryTabConfiguration,
  type TDSSampleQueryTabContext,
  type RelationSampleQueryTabContext,
} from '../../stores/DataProduct/DataProductSampleQueryTabState.js';

interface SampleQueryColumnData {
  id: string;
  name: string;
  type?: string | undefined;
  doc?: string | undefined;
}

const TDSColumnDocumentationCellRenderer = (
  params: DataGridCellRendererParams<SampleQueryColumnData>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return data.doc?.trim() ? (
    data.doc
  ) : (
    <div className="data-product__viewer__grid__empty-cell">
      No documentation provided
    </div>
  );
};

const getTDSSampleQueryTabs =
  (): DataProductTDSSampleQueryTabConfiguration[] => [
    {
      key: TDSSampleQueryTabKey.COLUMN_SPECIFICATIONS,
      label: 'Column Specifications',
      renderer: (context: TDSSampleQueryTabContext) => {
        const tdsResult = context.sampleQuery.result as V1_ExecutableTDSResult;
        const columnData: SampleQueryColumnData[] =
          tdsResult.tdsResult.tdsColumns.map((col) => ({
            id: uuid(),
            name: col.name,
            type: col.type,
            doc: col.doc,
          }));
        return (
          <div
            className={clsx(
              'data-product__viewer__sample-query__item__tds__column-specs',
              'data-product__viewer__grid',
              {
                'ag-theme-balham': !context.darkMode,
                'ag-theme-balham-dark': context.darkMode,
              },
            )}
          >
            <DataGrid
              rowData={columnData}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (rowData) => rowData.data.id,
              }}
              suppressFieldDotNotation={true}
              columnDefs={[
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  field: 'name',
                  headerValueGetter: () =>
                    `Column${columnData.length ? ` (${columnData.length})` : ''}`,
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
                  headerClass: 'data-product__viewer__grid__last-column-header',
                  field: 'type',
                  headerName: 'Type',
                  flex: 1,
                },
              ]}
            />
          </div>
        );
      },
    },
    {
      key: TDSSampleQueryTabKey.QUERY,
      label: 'Query',
      icon: (
        <LegendLogo className="data-product__viewer__sample-query__item__content__tab__icon--query" />
      ),
      renderer: (_context: TDSSampleQueryTabContext) => (
        <div className="data-product__viewer__sample-query__item__tds__query">
          <div className="data-product__viewer__sample-query__item__tds__query__actions">
            <button
              className="data-product__viewer__sample-query__item__tds__query__action btn--dark"
              tabIndex={-1}
              disabled={true}
            >
              Open in Query
            </button>
            <button
              className="data-product__viewer__sample-query__item__tds__query__action btn--dark"
              tabIndex={-1}
              disabled={true}
            >
              Open in Query with Test Data
            </button>
          </div>
        </div>
      ),
    },
    {
      key: TDSSampleQueryTabKey.DATA_ACCESS,
      label: 'Data Access',
      icon: <DataAccessIcon />,
      isActionTab: true,
      renderer: (context: TDSSampleQueryTabContext) =>
        context.dataAccessState ? (
          <DataAccessOverview
            dataAccessState={context.dataAccessState}
            compact={true}
          />
        ) : (
          <div className="data-product__viewer__sample-query__item__tds__placeholder-panel">
            <BlankPanelContent>
              No data access information available
            </BlankPanelContent>
          </div>
        ),
    },
    {
      key: TDSSampleQueryTabKey.USAGE_STATS,
      label: 'Usage Statistics',
      icon: <StatisticsIcon />,
      isActionTab: true,
      iconOnly: true,
      title: 'Usage Statistics',
      renderer: (_context: TDSSampleQueryTabContext) => (
        <div className="data-product__viewer__sample-query__item__tds__placeholder-panel">
          <BlankPanelContent>
            Usage Statistics (Work in Progress)
          </BlankPanelContent>
        </div>
      ),
    },
    {
      key: TDSSampleQueryTabKey.QUERY_TEXT,
      label: 'Query Text',
      icon: (
        <CodeIcon className="data-product__viewer__sample-query__item__content__tab__icon--query" />
      ),
      isActionTab: true,
      iconOnly: true,
      title: 'Pure Query',
      renderer: (context: TDSSampleQueryTabContext) => (
        <div className="data-product__viewer__sample-query__item__grammar">
          <CodeEditor
            language={CODE_EDITOR_LANGUAGE.PURE}
            inputValue={context.queryGrammar}
            isReadOnly={true}
            hideMinimap={true}
            hideGutter={true}
            lightTheme={
              context.darkMode
                ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK
                : CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
            }
          />
        </div>
      ),
    },
  ];

const getRelationSampleQueryTabs =
  (): DataProductRelationSampleQueryTabConfiguration[] => [
    {
      key: RelationSampleQueryTabKey.COLUMN_SPECIFICATIONS,
      label: 'Column Specifications',
      renderer: (context: RelationSampleQueryTabContext) => {
        const relationResult = context.sampleQuery
          .result as V1_ExecutableRelationResult;
        let columnData: SampleQueryColumnData[] = [];
        let relationType: V1_RelationType | undefined;
        if (relationResult.genericType.rawType instanceof V1_RelationType) {
          relationType = relationResult.genericType.rawType;
        } else {
          relationType = relationResult.genericType.typeArguments
            .map((typeArg) => typeArg.rawType)
            .filter(
              (rawType): rawType is V1_RelationType =>
                rawType instanceof V1_RelationType,
            )[0];
        }
        if (relationType?.columns) {
          columnData = relationType.columns.map((col) => ({
            id: uuid(),
            name: col.name,
            type: V1_getGenericTypeFullPath(col.genericType),
          }));
        }

        return (
          <div
            className={clsx(
              'data-product__viewer__sample-query__item__tds__column-specs',
              'data-product__viewer__grid',
              {
                'ag-theme-balham': !context.darkMode,
                'ag-theme-balham-dark': context.darkMode,
              },
            )}
          >
            <DataGrid
              rowData={columnData}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (rowData) => rowData.data.id,
              }}
              suppressFieldDotNotation={true}
              columnDefs={[
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  field: 'name',
                  headerValueGetter: () =>
                    `Column${columnData.length ? ` (${columnData.length})` : ''}`,
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: false,
                  resizable: false,
                  headerClass: 'data-product__viewer__grid__last-column-header',
                  field: 'type',
                  headerName: 'Type',
                  flex: 1,
                },
              ]}
            />
          </div>
        );
      },
    },
    {
      key: RelationSampleQueryTabKey.GRAMMAR,
      label: 'Grammar',
      renderer: (context: RelationSampleQueryTabContext) => (
        <div className="data-product__viewer__sample-query__item__grammar">
          <CodeEditor
            language={CODE_EDITOR_LANGUAGE.PURE}
            inputValue={context.queryGrammar}
            isReadOnly={true}
            hideMinimap={true}
            hideGutter={true}
            lightTheme={
              context.darkMode
                ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK
                : CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
            }
          />
        </div>
      ),
    },
  ];

const TDSSampleQueryResultView = observer(
  (props: {
    sampleQuery: V1_SampleQuery;
    dataProductViewerState: DataProductViewerState;
  }) => {
    const { sampleQuery, dataProductViewerState } = props;
    const applicationStore = useApplicationStore();
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const [selectedTab, setSelectedTab] = useState<string>(
      TDSSampleQueryTabKey.COLUMN_SPECIFICATIONS,
    );

    const queryGrammar = sampleQuery.info.query;
    const dataAccessState =
      dataProductViewerState.sampleQueryDataAccessStateIndex.get(sampleQuery);

    const extraTabs = useMemo(() => {
      const plugins =
        applicationStore.pluginManager.getApplicationPlugins() as DataProductDataAccess_LegendApplicationPlugin_Extension[];
      return plugins
        .map((plugin) =>
          plugin.getExtraDataProductTDSSampleQueryTabConfiguration?.(),
        )
        .flat()
        .filter(isNonNullable);
    }, [applicationStore.pluginManager]);

    const tabContext: TDSSampleQueryTabContext = useMemo(
      () => ({
        sampleQuery,
        dataProductViewerState,
        dataAccessState,
        queryGrammar,
        darkMode,
      }),
      [
        sampleQuery,
        dataProductViewerState,
        dataAccessState,
        queryGrammar,
        darkMode,
      ],
    );

    const allTabs = useMemo(() => {
      const builtInTabs = getTDSSampleQueryTabs();
      return [...builtInTabs, ...extraTabs];
    }, [extraTabs]);

    const visibleTabs = useMemo(
      () =>
        allTabs.filter((tab) => !tab.isVisible || tab.isVisible(tabContext)),
      [allTabs, tabContext],
    );

    const mainTabs = visibleTabs.filter((tab) => !tab.isActionTab);
    const actionTabs = visibleTabs.filter((tab) => tab.isActionTab);

    const renderTab = (
      tab: DataProductTDSSampleQueryTabConfiguration,
    ): React.ReactNode => (
      <button
        key={tab.key}
        className={clsx(
          'data-product__viewer__sample-query__item__content__tab',
          {
            'data-product__viewer__sample-query__item__content__tab--active':
              selectedTab === tab.key,
          },
        )}
        tabIndex={-1}
        title={tab.title}
        onClick={() => setSelectedTab(tab.key)}
      >
        {tab.icon && (
          <div className="data-product__viewer__sample-query__item__content__tab__icon">
            {tab.icon}
          </div>
        )}
        {!tab.iconOnly && (
          <div className="data-product__viewer__sample-query__item__content__tab__label">
            {tab.label}
          </div>
        )}
      </button>
    );

    const renderTabContent = (): React.ReactNode => {
      const activeTab = visibleTabs.find((tab) => tab.key === selectedTab);
      return activeTab?.renderer(tabContext) ?? null;
    };

    return (
      <div className="data-product__viewer__sample-query__item__content">
        <div className="data-product__viewer__sample-query__item__content__tab__header">
          <div className="data-product__viewer__sample-query__item__content__tabs">
            {mainTabs.map(renderTab)}
          </div>
          {actionTabs.length > 0 && (
            <div className="data-product__viewer__sample-query__item__content__action-tab-group">
              {actionTabs.map(renderTab)}
            </div>
          )}
        </div>
        <div className="data-product__viewer__sample-query__item__content__tab__content">
          {renderTabContent()}
        </div>
      </div>
    );
  },
);

const RelationSampleQueryResultView = observer(
  (props: {
    sampleQuery: V1_SampleQuery;
    dataProductViewerState: DataProductViewerState;
  }) => {
    const { sampleQuery, dataProductViewerState } = props;
    const applicationStore = useApplicationStore();
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const [selectedTab, setSelectedTab] = useState<string>(
      RelationSampleQueryTabKey.COLUMN_SPECIFICATIONS,
    );

    const queryGrammar = sampleQuery.info.query;

    const extraTabs = useMemo(() => {
      const plugins =
        applicationStore.pluginManager.getApplicationPlugins() as DataProductDataAccess_LegendApplicationPlugin_Extension[];
      return plugins
        .map((plugin) =>
          plugin.getExtraDataProductRelationSampleQueryTabConfiguration?.(),
        )
        .flat()
        .filter(isNonNullable);
    }, [applicationStore.pluginManager]);

    const tabContext: RelationSampleQueryTabContext = useMemo(
      () => ({
        sampleQuery,
        dataProductViewerState,
        queryGrammar,
        darkMode,
      }),
      [sampleQuery, dataProductViewerState, queryGrammar, darkMode],
    );

    const allTabs = useMemo(() => {
      const builtInTabs = getRelationSampleQueryTabs();
      return [...builtInTabs, ...extraTabs];
    }, [extraTabs]);

    const visibleTabs = useMemo(
      () =>
        allTabs.filter((tab) => !tab.isVisible || tab.isVisible(tabContext)),
      [allTabs, tabContext],
    );

    const mainTabs = visibleTabs.filter((tab) => !tab.isActionTab);
    const actionTabs = visibleTabs.filter((tab) => tab.isActionTab);

    const renderTab = (
      tab: DataProductRelationSampleQueryTabConfiguration,
    ): React.ReactNode => (
      <button
        key={tab.key}
        className={clsx(
          'data-product__viewer__sample-query__item__content__tab',
          {
            'data-product__viewer__sample-query__item__content__tab--active':
              selectedTab === tab.key,
          },
        )}
        tabIndex={-1}
        title={tab.title}
        onClick={() => setSelectedTab(tab.key)}
      >
        {tab.icon && (
          <div className="data-product__viewer__sample-query__item__content__tab__icon">
            {tab.icon}
          </div>
        )}
        {!tab.iconOnly && (
          <div className="data-product__viewer__sample-query__item__content__tab__label">
            {tab.label}
          </div>
        )}
      </button>
    );

    const renderTabContent = (): React.ReactNode => {
      const activeTab = visibleTabs.find((tab) => tab.key === selectedTab);
      return activeTab?.renderer(tabContext) ?? null;
    };

    return (
      <div className="data-product__viewer__sample-query__item__content">
        <div className="data-product__viewer__sample-query__item__content__tab__header">
          <div className="data-product__viewer__sample-query__item__content__tabs data-product__viewer__sample-query__item__content__tabs--full-width">
            {mainTabs.map(renderTab)}
          </div>
          {actionTabs.length > 0 && (
            <div className="data-product__viewer__sample-query__item__content__action-tab-group">
              {actionTabs.map(renderTab)}
            </div>
          )}
        </div>
        <div className="data-product__viewer__sample-query__item__content__tab__content">
          {renderTabContent()}
        </div>
      </div>
    );
  },
);

const SampleQueryItem = observer(
  (props: {
    sampleQuery: V1_SampleQuery;
    dataProductViewerState: DataProductViewerState;
  }) => {
    const { sampleQuery, dataProductViewerState } = props;

    const isTDSResult = sampleQuery.result instanceof V1_ExecutableTDSResult;
    const isRelationResult =
      sampleQuery.result instanceof V1_ExecutableRelationResult;
    const resultType = isTDSResult ? 'TDS' : 'Relation';

    return (
      <div className="data-product__viewer__sample-query__item">
        <div className="data-product__viewer__sample-query__item__header">
          <div className="data-product__viewer__sample-query__item__header__title">
            {sampleQuery.title}
          </div>
          <div className="data-product__viewer__sample-query__item__header__type">
            {resultType}
          </div>
        </div>
        {sampleQuery.description !== undefined && (
          <div className="data-product__viewer__sample-query__item__description">
            <MarkdownTextViewer
              className="data-product__viewer__markdown-text-viewer"
              value={{
                value: sampleQuery.description,
              }}
            />
          </div>
        )}
        {isTDSResult && (
          <TDSSampleQueryResultView
            sampleQuery={sampleQuery}
            dataProductViewerState={dataProductViewerState}
          />
        )}
        {isRelationResult && (
          <RelationSampleQueryResultView
            sampleQuery={sampleQuery}
            dataProductViewerState={dataProductViewerState}
          />
        )}
      </div>
    );
  },
);

export const DataProductSampleQueries = observer(
  (props: { dataProductViewerState: DataProductViewerState }) => {
    const { dataProductViewerState } = props;
    const sectionRef = useRef<HTMLDivElement>(null);
    const anchor = generateAnchorForSection('SAMPLE_QUERIES');

    useEffect(() => {
      if (sectionRef.current) {
        dataProductViewerState.layoutState.setWikiPageAnchor(
          anchor,
          sectionRef.current,
        );
      }
      return () =>
        dataProductViewerState.layoutState.unsetWikiPageAnchor(anchor);
    }, [dataProductViewerState, anchor]);

    const sampleQueries = dataProductViewerState
      .getSampleQueries()
      .filter(
        (query): query is V1_SampleQuery => query instanceof V1_SampleQuery,
      );

    if (sampleQueries.length === 0) {
      return null;
    }

    return (
      <div ref={sectionRef} className="data-product__viewer__wiki__section">
        <div className="data-product__viewer__wiki__section__header">
          <div className="data-product__viewer__wiki__section__header__label">
            Sample Queries
            <button
              className="data-product__viewer__wiki__section__header__anchor"
              tabIndex={-1}
              onClick={() => dataProductViewerState.changeZone(anchor, true)}
            >
              <AnchorLinkIcon />
            </button>
          </div>
        </div>
        <div className="data-product__viewer__wiki__section__content">
          <div className="data-product__viewer__sample-queries">
            {sampleQueries.map((sampleQuery) => (
              <SampleQueryItem
                key={sampleQuery.info.id}
                sampleQuery={sampleQuery}
                dataProductViewerState={dataProductViewerState}
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);
