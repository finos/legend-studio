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
import { ContextMenu } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { GrammarTextEditorState } from '../../stores/editor-state/GrammarTextEditorState.js';
import {
  GrammarTextEditor,
  GrammarTextEditorPanelActions,
} from './edit-panel/GrammarTextEditor.js';
import { useEditorStore } from './EditorStoreProvider.js';

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
      <div
        key={currentEditorState?.uuid}
        className="panel__content edit-panel__content"
      >
        {renderActiveElementTab()}
      </div>
    </div>
  );
});
