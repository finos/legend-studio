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
import { useEffect, useRef } from 'react';
import { flowResult } from 'mobx';
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import {
  BasePopover,
  CheckSquareIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
  PlusIcon,
  SearchIcon,
  SquareIcon,
  TimesIcon,
  clsx,
  ChevronLeftIcon,
  ChevronRightIcon,
  CustomSelectorInput,
} from '@finos/legend-art';
import { LEGEND_APPLICATION_REPL_SETTING_KEY } from '../Const.js';
import { useParams } from '@finos/legend-application/browser';
import {
  LEGEND_REPL_GRID_CLIENT_PATTERN_TOKEN,
  type REPLQueryEditorPathParams,
} from './LegendREPLGridClientApplication.js';
import type { REPLGridClientStore } from '../stores/REPLGridClientStore.js';
import { DataCubeQueryTextEditor } from './dataCube/DataCubeQueryTextEditor.js';
import { DataCubeGridEditor } from './dataCube/DataCubeGridEditor.js';
import { PIVOT_PANEL_TABS } from '../stores/dataCube/DataCubePropertiesPanelState.js';
import { TDS_SORT_ORDER } from './grid/TDSRequest.js';

type SortOption = {
  label: string;
  value: TDS_SORT_ORDER;
};

const HPivotAndSortEditor = observer(
  (props: { editorStore: REPLGridClientStore }) => {
    const { editorStore } = props;
    const hPivotAndSortColumnState =
      editorStore.dataCubeState.propertiesPanelState.hpivotAndSortPanelState;
    const onAvailabeSortColumnsSearchTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      hPivotAndSortColumnState.setAvailableSortColumnsSearchText(
        event.target.value,
      );
    };
    const onSelectedSortColumnsSearchTextChange: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => {
      hPivotAndSortColumnState.setSelectedSortColumnsSearchText(
        event.target.value,
      );
    };
    const clearAvailableSortColumnsSearchText = (): void => {
      hPivotAndSortColumnState.setAvailableSortColumnsSearchText('');
    };
    const clearSelectedSortColumnsSearchText = (): void => {
      hPivotAndSortColumnState.setSelectedSortColumnsSearchText('');
    };
    const sortOptions = Array.from(Object.values(TDS_SORT_ORDER)).map(
      (val) => ({
        label: val,
        value: val,
      }),
    );
    const onAvailableColumnsSortOptionsChanged = (
      columnName: string,
    ): ((option: SortOption) => void) =>
      function AvailableColumnSortOption(option: SortOption): void {
        const column = hPivotAndSortColumnState.availableSortColumns.find(
          (col) => col.column === columnName,
        );
        if (column) {
          column.setOrder(option.value);
        }
      };

    const onSelectedColumnsSortOptionsChanged = (
      columnName: string,
    ): ((option: SortOption) => void) =>
      function SelectedColumnSortOption(option: SortOption): void {
        const column = hPivotAndSortColumnState.selectedSortColumns.find(
          (col) => col.column === columnName,
        );
        if (column) {
          column.setOrder(option.value);
        }
      };

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
                      className={clsx(
                        'query-builder-property-search-panel__input',
                        {
                          'query-builder-property-search-panel__input--searching':
                            hPivotAndSortColumnState.availableSortColumnsSearchText,
                        },
                      )}
                      spellCheck={false}
                      onChange={onAvailabeSortColumnsSearchTextChange}
                      value={
                        hPivotAndSortColumnState.availableSortColumnsSearchText
                      }
                      placeholder="Search"
                    />
                    {!hPivotAndSortColumnState.availableSortColumnsSearchText ? (
                      <>
                        <div className="query-builder-property-search-panel__input__search__icon">
                          <SearchIcon />
                        </div>
                      </>
                    ) : (
                      <button
                        className="query-builder-property-search-panel__input__clear-btn"
                        tabIndex={-1}
                        onClick={clearAvailableSortColumnsSearchText}
                        title="Clear"
                      >
                        <TimesIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className="repl__hpivot__sort__column__editor__available__columns__content">
                  <div
                    className="repl__hpivot__sort__column__editor__available__columns__root"
                    onDoubleClick={(): void =>
                      hPivotAndSortColumnState.addAllAvailableSortColumns()
                    }
                  >
                    <PlusIcon />
                    <div className="repl__hpivot__sort__column__editor__available__columns__root__label">
                      All
                    </div>
                  </div>
                  {hPivotAndSortColumnState.availableSortColumnsSearchResults.map(
                    (col) => (
                      <div
                        className="repl__hpivot__sort__column__editor__available__columns__children"
                        key={col.column}
                      >
                        <div
                          className="repl__hpivot__sort__column__editor__available__columns__children__name"
                          onDoubleClick={(): void =>
                            hPivotAndSortColumnState.addAvailableSortColumn(
                              col.column,
                            )
                          }
                        >
                          {col.column}
                        </div>
                        <CustomSelectorInput
                          className="repl__hpivot__sort__column__editor__available__columns__children__order"
                          options={sortOptions}
                          onChange={onAvailableColumnsSortOptionsChanged(
                            col.column,
                          )}
                          value={{ label: col.order, value: col.order }}
                          isClearable={false}
                          darkMode={
                            !editorStore.applicationStore.layoutService
                              .TEMPORARY__isLightColorThemeEnabled
                          }
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
            <div className="repl__hpivot__sort__column__editor__actions">
              <div className="repl__hpivot__sort__column__editor__action">
                <button
                  tabIndex={-1}
                  // onClick={clearSearch}
                  title="Add"
                >
                  Add
                  <ChevronRightIcon />
                </button>
              </div>
              <div className="repl__hpivot__sort__column__editor__action">
                <button
                  tabIndex={-1}
                  // onClick={clearSearch}
                  title="Remove"
                >
                  <ChevronLeftIcon />
                  Remove
                </button>
              </div>
            </div>
            <div className="repl__hpivot__sort__column__editor__selected__columns">
              <div className="repl__hpivot__sort__column__editor__description">
                Selected sort columns:
              </div>
              <div className="repl__hpivot__sort__column__editor__container">
                <div className="query-builder-property-search-panel__header">
                  <div className="query-builder-property-search-panel__input__container">
                    <input
                      className={clsx(
                        'query-builder-property-search-panel__input',
                        {
                          'query-builder-property-search-panel__input--searching':
                            hPivotAndSortColumnState.selectedSortColumnsSearchText,
                        },
                      )}
                      spellCheck={false}
                      onChange={onSelectedSortColumnsSearchTextChange}
                      value={
                        hPivotAndSortColumnState.selectedSortColumnsSearchText
                      }
                      placeholder="Search"
                    />
                    {!hPivotAndSortColumnState.selectedSortColumnsSearchText ? (
                      <>
                        <div className="query-builder-property-search-panel__input__search__icon">
                          <SearchIcon />
                        </div>
                      </>
                    ) : (
                      <button
                        className="query-builder-property-search-panel__input__clear-btn"
                        tabIndex={-1}
                        onClick={clearSelectedSortColumnsSearchText}
                        title="Clear"
                      >
                        <TimesIcon />
                      </button>
                    )}
                  </div>
                </div>
                <div className="repl__hpivot__sort__column__editor__available__columns__content">
                  <div
                    className="repl__hpivot__sort__column__editor__available__columns__root"
                    onDoubleClick={(): void =>
                      hPivotAndSortColumnState.addAllSelectedSortColumns()
                    }
                  >
                    <PlusIcon />
                    <div className="repl__hpivot__sort__column__editor__available__columns__root__label">
                      All
                    </div>
                  </div>
                  {hPivotAndSortColumnState.selectedSortColumnsSearchResults.map(
                    (col) => (
                      <div
                        className="repl__hpivot__sort__column__editor__available__columns__children"
                        key={col.column}
                      >
                        <div
                          className="repl__hpivot__sort__column__editor__available__columns__children__name"
                          onDoubleClick={(): void =>
                            hPivotAndSortColumnState.addSelectedSortColumn(
                              col.column,
                            )
                          }
                        >
                          {col.column}
                        </div>
                        <CustomSelectorInput
                          className="repl__hpivot__sort__column__editor__available__columns__children__order"
                          options={sortOptions}
                          onChange={onSelectedColumnsSortOptionsChanged(
                            col.column,
                          )}
                          value={{ label: col.order, value: col.order }}
                          isClearable={false}
                          darkMode={
                            !editorStore.applicationStore.layoutService
                              .TEMPORARY__isLightColorThemeEnabled
                          }
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const PivotPanelEditor = observer(
  (props: {
    triggerElement: HTMLElement | null;
    editorStore: REPLGridClientStore;
  }) => {
    const { triggerElement, editorStore } = props;
    const dataCubeState = editorStore.dataCubeState;
    const applicationStore = editorStore.applicationStore;
    const closeEditor = (): void => {
      dataCubeState.configState.closePanel();
    };
    const selectedTab =
      dataCubeState.propertiesPanelState.selectedPivotPanelTab;
    const tabOptions = [
      PIVOT_PANEL_TABS.COLUMNS_AND_PIVOTS,
      PIVOT_PANEL_TABS.HPIVOTS_AND_SORTS,
      PIVOT_PANEL_TABS.GENERAL_PROPERTIES,
      PIVOT_PANEL_TABS.COLUMN_PROPERTIES,
      PIVOT_PANEL_TABS.DEVELOPER_OPTIONS,
      PIVOT_PANEL_TABS.PIVOT_LAYOUT,
    ];
    const setSelectedTab = (tab: PIVOT_PANEL_TABS): void => {
      dataCubeState.propertiesPanelState.setSelectedPivotPanelTab(tab);
    };
    const onClickOk = (): void => {
      dataCubeState.propertiesPanelState.applyChanges();
      dataCubeState.configState.closePanel();
    };

    return (
      <BasePopover
        open={dataCubeState.configState.isPivotPanelOpened}
        onClose={closeEditor}
        anchorEl={triggerElement}
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
              <ModalFooterButton text="Ok" onClick={onClickOk} />
              <ModalFooterButton text="Close" onClick={closeEditor} />
              <ModalFooterButton
                text="Apply"
                onClick={(): void =>
                  dataCubeState.propertiesPanelState.applyChanges()
                }
              />
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
    const dataCubeState = editorStore.dataCubeState;
    const pivotPanelButtonRef = useRef<HTMLDivElement>(null);

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

    const saveQuery = (): void => {
      flowResult(dataCubeState.saveQuery()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    };

    const togglePagination = (): void => {
      dataCubeState.configState.setIsPaginationEnabled(
        !dataCubeState.configState.isPaginationEnabled,
      );
      editorStore.applicationStore.settingService.persistValue(
        LEGEND_APPLICATION_REPL_SETTING_KEY.PAGINATION,
        dataCubeState.configState.isPaginationEnabled,
      );
    };

    useEffect(() => {
      flowResult(dataCubeState.getInitialREPLGridServerResult(queryId)).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    }, [dataCubeState, editorStore, queryId]);

    return (
      <div className="repl">
        <div className="repl__header">
          <div className="repl__header__content">
            <div className="repl__header__content__title">Legend DataCube</div>
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
                        dataCubeState.configState.isPaginationEnabled,
                    },
                  )}
                  onClick={togglePagination}
                  tabIndex={-1}
                >
                  {dataCubeState.configState.isPaginationEnabled ? (
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
          <DataCubeQueryTextEditor editorStore={editorStore} />
          <DataCubeGridEditor editorStore={editorStore} />
        </div>
        <div className="repl__footer">
          <div
            className="repl__footer__pivot"
            ref={pivotPanelButtonRef}
            onClick={(): void => dataCubeState.configState.openPanel()}
          >
            Pivot
          </div>
          <div className="repl__footer__filter">Filter</div>
          <div className="repl__footer__mode">Modes</div>
          {dataCubeState.configState.isPivotPanelOpened && (
            <PivotPanelEditor
              editorStore={editorStore}
              triggerElement={pivotPanelButtonRef.current}
            />
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
