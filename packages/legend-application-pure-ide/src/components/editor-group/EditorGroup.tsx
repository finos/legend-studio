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
import { FileEditorState } from '../../stores/FileEditorState.js';
import { GenericFileEditor } from './GenericFileEditor.js';
import { PureFileEditor } from './PureFileEditor.js';
import {
  clsx,
  FileAltIcon,
  LockIcon,
  PlusIcon,
  useResizeDetector,
} from '@finos/legend-art';
import { DiagramEditorState } from '../../stores/DiagramEditorState.js';
import { DiagramEditor } from './DiagramEditor.js';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import { PURE_DiagramIcon } from '../shared/ConceptIconUtils.js';
import { TabManager, type TabState } from '@finos/legend-lego/application';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';

const EditorGroupSplashScreen: React.FC = () => {
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
    <div ref={ref} className="editor-group__splash-screen">
      <div
        className={clsx('editor-group__splash-screen__content', {
          'editor-group__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="editor-group__splash-screen__content__item">
          <div className="editor-group__splash-screen__content__item__label">
            {`Run the go() function`}
          </div>
          <div className="editor-group__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F9</div>
          </div>
        </div>
        <div className="editor-group__splash-screen__content__item">
          <div className="editor-group__splash-screen__content__item__label">
            Run the full test suite
          </div>
          <div className="editor-group__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F10</div>
          </div>
        </div>
        <div className="editor-group__splash-screen__content__item">
          <div className="editor-group__splash-screen__content__item__label">
            Search for a file
          </div>
          <div className="editor-group__splash-screen__content__item__hot-keys">
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

export const EditorGroup = observer(() => {
  const ideStore = usePureIDEStore();
  const currentTab = ideStore.tabManagerState.currentTab;
  const renderActiveEditorState = (): React.ReactNode => {
    if (currentTab instanceof FileEditorState) {
      if (currentTab.textEditorState.language === CODE_EDITOR_LANGUAGE.PURE) {
        return <PureFileEditor editorState={currentTab} />;
      }
      return <GenericFileEditor editorState={currentTab} />;
    } else if (currentTab instanceof DiagramEditorState) {
      return <DiagramEditor diagramEditorState={currentTab} />;
    }
    return null;
  };
  const renderTab = (editorState: TabState): React.ReactNode | undefined => {
    if (editorState instanceof FileEditorState) {
      const showMoreInfo =
        ideStore.tabManagerState.tabs.filter(
          (tab) =>
            tab instanceof FileEditorState &&
            tab.fileName === editorState.fileName,
        ).length > 1;
      return (
        <div className="editor-group__header__tab">
          <div className="editor-group__header__tab__icon">
            <FileAltIcon className="editor-group__header__tab__icon--file" />
          </div>
          <div className="editor-group__header__tab__label">
            {editorState.fileName}
          </div>
          {showMoreInfo && (
            <div className="editor-group__header__tab__path">
              {editorState.filePath}
            </div>
          )}
          {editorState.file.RO && (
            <div className="editor-group__header__tab__icon">
              <LockIcon className="editor-group__header__tab__icon--readonly" />
            </div>
          )}
        </div>
      );
    } else if (editorState instanceof DiagramEditorState) {
      const showMoreInfo =
        ideStore.tabManagerState.tabs.filter(
          (tab) =>
            tab instanceof DiagramEditorState &&
            tab.diagramName === editorState.diagramName,
        ).length > 1;
      return (
        <div className="editor-group__header__tab">
          <div className="editor-group__header__tab__icon">
            <PURE_DiagramIcon />
          </div>
          <div className="editor-group__header__tab__label">
            {editorState.diagramName}
          </div>
          {showMoreInfo && (
            <div className="editor-group__header__tab__path">
              {editorState.diagramPath}
            </div>
          )}
        </div>
      );
    }
    return editorState.label;
  };

  if (!currentTab) {
    return <EditorGroupSplashScreen />;
  }
  return (
    <div className="panel editor-group">
      <div className="panel__header editor-group__header">
        <div className="editor-group__header__tabs">
          <TabManager
            tabManagerState={ideStore.tabManagerState}
            tabRenderer={renderTab}
          />
        </div>
        <div className="panel__header__actions"></div>
      </div>
      <div
        // NOTE: This is one small but extremely important line. Using `key` we effectivly force-remounting the element editor
        // component every time current element editor state is changed. This is great to control errors that has to do with stale states
        // when we `reprocess` world or when we switch tabs between 2 elements of the same type (i.e. 2 classes, 2 mappings, etc.)
        // See https://github.com/bvaughn/react-error-boundary/issues/23#issuecomment-425470511
        key={currentTab.uuid}
        className="panel__content editor-group__content"
      >
        {renderActiveEditorState()}
      </div>
    </div>
  );
});
