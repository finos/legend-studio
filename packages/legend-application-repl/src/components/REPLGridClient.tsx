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
import { useCallback, useEffect, useRef } from 'react';
import { flowResult } from 'mobx';
import {
  BasePopover,
  CheckSquareIcon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalTitle,
  SquareIcon,
  clsx,
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
import { HPivotAndSortEditor } from './dataCube/DataCubeHPivotAndSortEditor.js';

const PivotPanelEditor = observer(
  (props: {
    triggerElement: HTMLElement | null;
    editorStore: REPLGridClientStore;
  }) => {
    const { triggerElement, editorStore } = props;
    const dataCubeState = editorStore.dataCubeState;
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
        <div>
          <Modal darkMode={false} className="editor-modal">
            <ModalHeader>
              <ModalTitle
                title="cube properties"
                className="datacube-properties-editor__title"
              />
            </ModalHeader>
            <ModalBody>
              <div style={{ height: '100%', width: '100%' }}>
                <div className="panel__header datacube-properties-editor__tabs__header ">
                  <div className="datacube-properties-editor__tabs">
                    {tabOptions.map((tab) => (
                      <div
                        key={tab}
                        onClick={(): void => setSelectedTab(tab)}
                        className={clsx('datacube-properties-editor__tab', {
                          'datacube-properties-editor__tab--active':
                            tab === selectedTab,
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
        </div>
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

    // const showBuilder = useCallback(() => {
    //   console.log('show');
    //   console.log(dataCubeState.configState.gridApi);
    //   dataCubeState.configState.gridApi?.showAdvancedFilterBuilder();
    // }, [dataCubeState.configState.gridApi]);

    const showBuilder = (): void => {
      dataCubeState.configState.gridApi?.showAdvancedFilterBuilder();
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
          <div id="wrapper" className="repl__footer__filter__parent">
            <div
              id="advancedFilterParent"
              className="parent"
              style={{ display: 'none' }}
            ></div>
            <button
              id="advancedFilterBuilderButton"
              className="repl__footer__filter"
              onClick={showBuilder}
            >
              Filter
            </button>
          </div>
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
