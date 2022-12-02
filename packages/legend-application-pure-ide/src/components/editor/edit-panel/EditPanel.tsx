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

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { FileEditorState } from '../../../stores/FileEditorState.js';
import { FileEditor } from './FileEditor.js';
import { clsx, PlusIcon, useResizeDetector } from '@finos/legend-art';
import { DiagramEditorState } from '../../../stores/DiagramEditorState.js';
import { DiagramEditor } from './DiagramEditor.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { TabManager } from '@finos/legend-application';

export const EditPanelSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 150;
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
            Execute the &apos;go&apos; function
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F9</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Run the full test suite
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F10</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Search for a file
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentTab = editorStore.tabManagerState.currentTab;
  const renderActiveEditorState = (): React.ReactNode => {
    if (currentTab instanceof FileEditorState) {
      return <FileEditor editorState={currentTab} />;
    } else if (currentTab instanceof DiagramEditorState) {
      return <DiagramEditor editorState={currentTab} />;
    }
    return null;
  };

  if (!currentTab) {
    return <EditPanelSplashScreen />;
  }
  return (
    <div className="panel edit-panel">
      <div className="panel__header edit-panel__header">
        <div className="edit-panel__header__tabs">
          <TabManager tabManagerState={editorStore.tabManagerState} />
        </div>
        <div className="panel__header__actions"></div>
      </div>
      <div
        // NOTE: This is one small but extremely important line. Using `key` we effectivly force-remounting the element editor
        // component every time current element editor state is changed. This is great to control errors that has to do with stale states
        // when we `reprocess` world or when we switch tabs between 2 elements of the same type (i.e. 2 classes, 2 mappings, etc.)
        // See https://github.com/bvaughn/react-error-boundary/issues/23#issuecomment-425470511
        key={currentTab.uuid}
        className="panel__content edit-panel__content"
      >
        {renderActiveEditorState()}
      </div>
    </div>
  );
});
