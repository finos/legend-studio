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
  TimesIcon,
  clsx,
  BasePopover,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  ModalHeaderActions,
  ModalTitle,
} from '@finos/legend-art';
import type { REPLStore } from '../../../stores/dataCube/DataCubeStore.js';
import { DATA_CUBE_EDITOR_TAB } from '../../../stores/dataCube/editor/DataCubeEditorState.js';
import { DataCubeEditorSortPanel } from './DataCubeEditorSortPanel.js';

export const PivotPanelEditor = observer(
  (props: { triggerElement: HTMLElement | null; editorStore: REPLStore }) => {
    const { triggerElement, editorStore } = props;
    const dataCubeState = editorStore.dataCubeState;
    const applicationStore = editorStore.applicationStore;
    const closeEditor = (): void => {
      dataCubeState.editor.closePanel();
    };
    const selectedTab = dataCubeState.editor.currentTab;
    const tabOptions = [
      // DATA_CUBE_EDITOR_TAB.COLUMNS,
      DATA_CUBE_EDITOR_TAB.SORTS,
      // DATA_CUBE_EDITOR_TAB.HORIZONTAL_PIVOTS,
      // DATA_CUBE_EDITOR_TAB.VERTICAL_PIVOTS,
      // DATA_CUBE_EDITOR_TAB.GENERAL_PROPERTIES,
      // DATA_CUBE_EDITOR_TAB.COLUMN_PROPERTIES,
    ];
    const setSelectedTab = (tab: DATA_CUBE_EDITOR_TAB): void => {
      dataCubeState.editor.setCurrentTab(tab);
    };
    const onClickOk = (): void => {
      dataCubeState.editor.applyChanges();
      dataCubeState.editor.closePanel();
    };

    return (
      <BasePopover
        open={dataCubeState.editor.isPanelOpen}
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
              {selectedTab === DATA_CUBE_EDITOR_TAB.SORTS && (
                <DataCubeEditorSortPanel editorStore={editorStore} />
              )}
            </div>
          </ModalBody>
          <ModalFooter className="repl__modal__footer">
            <div className="search-modal__actions">
              <ModalFooterButton text="Ok" onClick={onClickOk} />
              <ModalFooterButton text="Close" onClick={closeEditor} />
              <ModalFooterButton
                text="Apply"
                onClick={(): void => dataCubeState.editor.applyChanges()}
              />
            </div>
          </ModalFooter>
        </Modal>
      </BasePopover>
    );
  },
);
