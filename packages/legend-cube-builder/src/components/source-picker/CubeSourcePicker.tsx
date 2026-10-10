/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  clsx,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { SELECT_SOURCE_TYPE_PROMPT } from '../../__lib__/LegendCubeLabels.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeSourcePickerTabKey } from '../../stores/source-picker/CubeSourcePickerTab.js';
import { CubeDataProductTab } from './CubeDataProductTab.js';
import { CubeDirectConnectionTab } from './CubeDirectConnectionTab.js';
import { CubeInlineModelTab } from './CubeInlineModelTab.js';

/**
 * Adds a source to the cube (PLAN §6.1, §6.2.7, §6.8): a tab per way to find
 * one, shown when the host offers more than one. The source lands with its
 * schema; the first one fixes the cube's context, and with it the only tab
 * enabled.
 */
export const CubeSourcePicker = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const picker = editorState.sourcePicker;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const { activeTab, tabs } = picker;
    const confirm = (): void => {
      flowResult(picker.confirm()).catch(applicationStore.alertUnhandledError);
    };

    return (
      <Dialog open={picker.isOpen} onClose={() => picker.close()}>
        <Modal darkMode={darkMode} className="w-[640px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Add a source</div>
          </ModalHeader>
          <PanelLoadingIndicator
            isLoading={!picker.isChoosingTab && activeTab.isBusy}
          />
          <ModalBody>
            {tabs.length > 1 && (
              <div
                className="mb-2 flex gap-1 border-b border-[var(--color-border-subtle)]"
                role="tablist"
                aria-label="Source kinds"
              >
                {tabs.map((tab) => {
                  const isActive = !picker.isChoosingTab && tab === activeTab;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      disabled={!picker.isTabEnabled(tab)}
                      className={clsx(
                        '-mb-px border-b-2 px-2 py-1 text-base enabled:cursor-pointer disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]',
                        isActive
                          ? 'border-[var(--color-accent)] text-[var(--color-text-primary)]'
                          : 'border-transparent text-[var(--color-text-secondary)] enabled:hover:text-[var(--color-text-primary)]',
                      )}
                      onClick={() => picker.selectTab(tab.key)}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div
              role={
                tabs.length > 1 && !picker.isChoosingTab
                  ? 'tabpanel'
                  : undefined
              }
            >
              {picker.isChoosingTab ? (
                <div className="py-4 text-center text-base text-[var(--color-text-secondary)]">
                  {SELECT_SOURCE_TYPE_PROMPT}
                </div>
              ) : activeTab.key === CubeSourcePickerTabKey.DIRECT_CONNECTION ? (
                <CubeDirectConnectionTab tab={picker.directTab} />
              ) : activeTab.key === CubeSourcePickerTabKey.DATA_PRODUCT ? (
                <CubeDataProductTab tab={picker.dataProductTab} />
              ) : (
                <CubeInlineModelTab tab={picker.modelTab} />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              text="Add"
              disabled={!picker.canConfirm}
              onClick={confirm}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Cancel"
              onClick={() => picker.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
