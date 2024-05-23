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
import { useREPLGridClientStore } from './REPLGridClientStoreProvider.js';
import { AgGridComponent } from './AgGrid.js';
import { useEffect, useState } from 'react';
import { flowResult } from 'mobx';
import { getTDSRowData } from '../components/grid/GridUtils.js';
import { ServerSideDataSource } from '../components/grid/ServerSideDataSource.js';
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import {
  BasePopover,
  CheckSquareIcon,
  CogIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  PanelLoadingIndicator,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  SquareIcon,
  TimesIcon,
  clsx,
} from '@finos/legend-art';
import { LEGEND_APPLICATION_REPL_SETTING_KEY } from '../Const.js';

import { QueryEditor } from './REPLQueryEditor.js';
import { useParams } from '@finos/legend-application/browser';
import {
  LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN,
  type REPLQueryEditorPathParams,
} from './LegendREPLGridClientApplication.js';
import { REPLGridClientStore } from '../stores/REPLGridClientStore.js';
import { PIVOT_PANEL_TABS } from '../stores/REPLGridState.js';
import { TDSSort, TDS_SORT_ORDER } from './grid/TDSRequest.js';

const HPivotAndSortEditor = observer(
  (props: { editorStore: REPLGridClientStore }) => {
    const { editorStore } = props;
    const columns = editorStore.replGridState.columns ?? [];
    const [sortedColumns, setSortedColumns] = useState<TDSSort[]>(
      editorStore.replGridState.lastQueryTDSRequest?.sort ?? [],
    );
    const [availableColumns, setAvailableColumns] = useState<TDSSort[]>(
      columns
        .filter((col) => !sortedColumns.find((c) => c.column === col))
        .map((col) => new TDSSort(col, TDS_SORT_ORDER.ASCENDING)),
    );
    const [availableColSearchText, setAvailableColSearchText] = useState('');
    return (
      <div className="repl__hpivot__sort__editor">
        <div className="repl__hpivot__sort__column__editor">
          <div className="repl__hpivot__sort__column__editor__header">
            Sorts
          </div>
          <div className="repl__hpivot__sort__column__editor__content">
            <div className="repl__hpivot__sort__column__editor__available__columns">
              <div className="repl__hpivot__sort__column__editor__description">
                Available sort columns:
              </div>
              <div className="repl__hpivot__sort__column__editor__container">
                <div className="query-builder-property-search-panel__header">
                  <div className="query-builder-property-search-panel__input__container">
                    <input
                      // ref={searchInputRef}
                      className={clsx(
                        'query-builder-property-search-panel__input',
                        {
                          'query-builder-property-search-panel__input--searching':
                            availableColSearchText,
                        },
                      )}
                      spellCheck={false}
                      // onChange={onSearchPropertyTextChange}
                      value={availableColSearchText}
                      placeholder="Search"
                    />
                    {!availableColSearchText ? (
                      <>
                        <div className="query-builder-property-search-panel__input__search__icon">
                          <SearchIcon />
                        </div>
                      </>
                    ) : (
                      <button
                        className="query-builder-property-search-panel__input__clear-btn"
                        tabIndex={-1}
                        // onClick={clearSearch}
                        title="Clear"
                      >
                        <TimesIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className="repl__hpivot__sort__column__editor__available__columns__content">
                  <div className="repl__hpivot__sort__column__editor__available__columns__root">
                    <PlusIcon />
                    <div className="repl__hpivot__sort__column__editor__available__columns__root__label">
                      All
                    </div>
                  </div>
                  {availableColumns.map((col) => (
                    <div
                      className="repl__hpivot__sort__column__editor__available__columns__children"
                      key={col.column}
                    >
                      {col.column}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="repl__hpivot__sort__column__editor__actions">
              Actions
            </div>
            <div className="repl__hpivot__sort__column__editor__selected__columns">
              <div className="repl__hpivot__sort__column__editor__description">
                Selected sort columns:
              </div>
              <div className="repl__hpivot__sort__column__editor__container"></div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const PivotPanelEditor = observer(
  (props: { editorStore: REPLGridClientStore }) => {
    const { editorStore } = props;
    const applicationStore = editorStore.applicationStore;
    const closeEditor = (): void => {
      editorStore.replGridState.setIsPivotPanelOpened(false);
    };
    const selectedTab = editorStore.replGridState.selectedPivotPanelTab;
    const tabOptions = [
      PIVOT_PANEL_TABS.COLUMNS_AND_PIVOTS,
      PIVOT_PANEL_TABS.HPIVOTS_AND_SORTS,
      PIVOT_PANEL_TABS.GENERAL_PROPERTIES,
      PIVOT_PANEL_TABS.COLUMN_PROPERTIES,
      PIVOT_PANEL_TABS.DEVELOPER_OPTIONS,
      PIVOT_PANEL_TABS.PIVOT_LAYOUT,
    ];
    const setSelectedTab = (tab: PIVOT_PANEL_TABS): void => {
      editorStore.replGridState.setSelectedPivotPanelTab(tab);
    };
    return (
      <BasePopover
        open={editorStore.replGridState.isPivotPanelOpened}
        onClose={closeEditor}
        // TransitionProps={{
        //   onEnter: onSearchConfigMenuOpen,
        // }}
        // anchorEl={searchConfigTriggerRef.current}

        anchorOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'center',
          horizontal: 'center',
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="editor-modal embedded-runtime-editor"
        >
          <ModalHeader>
            <ModalTitle title="cube properties" />
            <ModalHeaderActions>
              <button
                className="modal__header__action"
                tabIndex={-1}
                onClick={closeEditor}
              >
                <TimesIcon />
              </button>
            </ModalHeaderActions>
          </ModalHeader>
          <ModalBody>
            <div style={{ height: '100%', width: '100%' }}>
              <div className="panel__header uml-element-editor__tabs__header ">
                <div className="uml-element-editor__tabs">
                  {tabOptions.map((tab) => (
                    <div
                      key={tab}
                      onClick={(): void => setSelectedTab(tab)}
                      className={clsx('uml-element-editor__tab', {
                        'uml-element-editor__tab--active': tab === selectedTab,
                      })}
                    >
                      {tab}
                    </div>
                  ))}
                </div>
              </div>
              {selectedTab === PIVOT_PANEL_TABS.HPIVOTS_AND_SORTS && (
                <HPivotAndSortEditor editorStore={editorStore} />
              )}
            </div>
          </ModalBody>
          <ModalFooter className="repl__modal__footer">
            <div className="search-modal__actions">
              <ModalFooterButton text="Ok" />
              <ModalFooterButton text="Close" />
              <ModalFooterButton text="Apply" />
            </div>
          </ModalFooter>
        </Modal>
      </BasePopover>
    );
  },
);

export const GenericEditor = observer(
  (props: { queryId?: string | undefined }) => {
    const { queryId } = props;
    const editorStore = useREPLGridClientStore();
    const selectDarkTheme = (): void => {
      editorStore.applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
        { persist: true },
      );
    };
    const selectLightTheme = (): void => {
      editorStore.applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
        { persist: true },
      );
    };
    const isLightTheme =
      editorStore.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    const executeLambda = (): void => {
      flowResult(editorStore.executeLambda()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };

    const saveQuery = (): void => {
      flowResult(editorStore.saveQuery()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };

    const togglePagination = (): void => {
      editorStore.replGridState.setIsPaginationEnabled(
        !editorStore.replGridState.isPaginationEnabled,
      );
      editorStore.applicationStore.settingService.persistValue(
        LEGEND_APPLICATION_REPL_SETTING_KEY.PAGINATION,
        editorStore.replGridState.isPaginationEnabled,
      );
    };

    useEffect(() => {
      flowResult(editorStore.getInitialREPLGridServerResult(queryId)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    }, [editorStore, queryId]);

    return (
      <div className="repl">
        <div className="repl__header">
          <div className="repl__header__content">
            <div className="repl__header__content__title">REPL Grid</div>
            <div className="repl__header__actions">
              <div
                className="repl__header__action__pagination"
                onClick={(): void => saveQuery()}
              >
                <div className="repl__header__action__pagination__label">
                  Save Query
                </div>
              </div>
              <div className="repl__header__action__pagination">
                <button
                  className={clsx(
                    'repl__header__action__pagination__toggler__btn',
                    {
                      'repl__header__action__pagination__toggler__btn--toggled':
                        editorStore.replGridState.isPaginationEnabled,
                    },
                  )}
                  onClick={togglePagination}
                  tabIndex={-1}
                >
                  {editorStore.replGridState.isPaginationEnabled ? (
                    <CheckSquareIcon />
                  ) : (
                    <SquareIcon />
                  )}
                </button>
                <div className="repl__header__action__pagination__label">
                  Pagination
                </div>
              </div>
              <button
                className={
                  isLightTheme
                    ? 'repl__header__action'
                    : 'repl__header__action repl__header__action--toggled'
                }
                onClick={selectDarkTheme}
              >
                Dark
              </button>
              <button
                className={
                  isLightTheme
                    ? 'repl__header__action repl__header__action--toggled'
                    : 'repl__header__action'
                }
                onClick={selectLightTheme}
              >
                Light
              </button>
            </div>
          </div>
        </div>
        <div className="repl__content">
          <div className="repl__content__query">
            <div className="repl__query">
              <div className="repl__query__editor">
                <div className="repl__query__header">
                  <div className="repl__query__label">Curent Query</div>
                  <div className="repl__query__execute-btn btn__dropdown-combo btn__dropdown-combo--primary">
                    <button
                      className="btn__dropdown-combo__label"
                      onClick={executeLambda}
                      tabIndex={-1}
                    >
                      <PlayIcon className="btn__dropdown-combo__label__icon" />
                      <div className="btn__dropdown-combo__label__title">
                        Run Query
                      </div>
                    </button>
                  </div>
                </div>
                <div className="repl__query__content">
                  <QueryEditor />
                </div>
              </div>
            </div>
            {editorStore.replGridState.currentSubQuery !== undefined && (
              <div className="repl__query">
                <div className="repl__query__editor">
                  <div className="repl__query__header">
                    <div className="repl__query__label__sub__query">
                      Current Row Group Sub Query
                    </div>
                    <div className="repl__query__label__sub__query__read--only">
                      Read Only
                    </div>
                  </div>
                  <div className="repl__query__content">
                    <CodeEditor
                      lightTheme={
                        isLightTheme
                          ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_HC_LIGHT
                          : CODE_EDITOR_THEME.BUILT_IN__VSCODE_HC_BLACK
                      }
                      language={CODE_EDITOR_LANGUAGE.PURE}
                      isReadOnly={true}
                      inputValue={editorStore.replGridState.currentSubQuery}
                      hideActionBar={true}
                      hidePadding={true}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="repl__query__label">Result</div>
          <PanelLoadingIndicator
            isLoading={editorStore.executeAction.isInProgress}
          />
          {editorStore.executeAction.hasCompleted && (
            <AgGridComponent
              onGridReady={(params): void => {
                editorStore.replGridState.setGridApi(params.api);
              }}
              className={
                editorStore.applicationStore.layoutService
                  .TEMPORARY__isLightColorThemeEnabled
                  ? 'ag-theme-balham'
                  : 'ag-theme-balham-dark'
              }
              gridOptions={
                editorStore.replGridState.initialResult
                  ? {
                      serverSideDatasource: new ServerSideDataSource(
                        getTDSRowData(
                          editorStore.replGridState.initialResult.result,
                        ),
                        editorStore.replGridState.initialResult.builder.columns,
                        editorStore,
                      ),
                    }
                  : {}
              }
              licenseKey={editorStore.replGridState.licenseKey ?? ''}
              rowData={editorStore.replGridState.rowData}
              columnDefs={editorStore.replGridState.columnDefs}
              suppressServerSideInfiniteScroll={
                !editorStore.replGridState.isPaginationEnabled
              }
            />
          )}
        </div>
        <div className="repl__footer">
          <div
            className="repl__footer__pivot"
            onClick={(): void =>
              editorStore.replGridState.setIsPivotPanelOpened(true)
            }
          >
            Pivot
          </div>
          <div className="repl__footer__filter">Filter</div>
          <div className="repl__footer__mode">Modes</div>
          {editorStore.replGridState.isPivotPanelOpened && (
            <PivotPanelEditor editorStore={editorStore} />
          )}
        </div>
      </div>
    );
  },
);

export const Editor = observer(() => <GenericEditor />);

export const REPLQueryEditor = observer(() => {
  const params = useParams<REPLQueryEditorPathParams>();
  const queryId = params[LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN.QUERY_ID];
  return <GenericEditor queryId={queryId} />;
});
