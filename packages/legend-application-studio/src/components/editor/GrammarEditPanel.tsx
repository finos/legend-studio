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

import { TabManager, type TabState } from '@finos/legend-application';
import {
  ContextMenu,
  PlusIcon,
  useResizeDetector,
  clsx,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { GrammarTextEditorState } from '../../stores/editor-state/GrammarTextEditorState.js';
import {
  GrammarTextEditor,
  GrammarTextEditorPanelActions,
} from './edit-panel/GrammarTextEditor.js';
import { useEditorStore } from './EditorStoreProvider.js';
import { useEffect, useState } from 'react';

export const EditPanelSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 180;
  const [showCommandList, setShowCommandList] = useState(false);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowCommandList(
      (width ?? 0) > commandListWidth && (height ?? 0) > commandListHeight,
    );
  }, [width, height]);

  return (
    <div ref={ref} className="edit-panel__splash-screen">
      <div
        className={clsx('edit-panel__splash-screen__content', {
          'edit-panel__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Open or Search for an Element
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Search across Elements
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">Shift</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">F</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Push Local Changes
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">S</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Toggle FormMode
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F8</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Compile
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F9</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GrammarEditPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentEditorState =
    editorStore.tabManagerState.currentTab instanceof GrammarTextEditorState
      ? editorStore.tabManagerState.currentTab
      : undefined;

  const renderActiveElementTab = (): React.ReactNode => {
    if (currentEditorState) {
      return (
        <GrammarTextEditor
          key={currentEditorState.uuid}
          grammarTextEditorState={currentEditorState}
        />
      );
    }
    return null;
  };

  const renderTab = (editorState: TabState): React.ReactNode | undefined =>
    editorState.label;

  return (
    <div className="panel edit-panel">
      <ContextMenu disabled={true} className="panel__header edit-panel__header">
        <div className="edit-panel__header__tabs">
          {currentEditorState && (
            <TabManager
              tabManagerState={editorStore.tabManagerState}
              tabRenderer={renderTab}
            />
          )}
        </div>
        <div className="edit-panel__header__actions">
          <GrammarTextEditorPanelActions
            grammarTextEditorState={currentEditorState}
          />
        </div>
      </ContextMenu>
      {!currentEditorState && (
        <div className="panel__content edit-panel__content">
          <EditPanelSplashScreen />
        </div>
      )}
      {currentEditorState && (
        <div
          key={currentEditorState.uuid}
          className="panel__content edit-panel__content"
        >
          {renderActiveElementTab()}
        </div>
      )}
    </div>
  );
});
