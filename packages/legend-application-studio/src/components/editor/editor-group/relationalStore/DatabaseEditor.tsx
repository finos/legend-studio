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
  STORE_DATABASE_TAB_TYPE,
  DatabaseEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/relationalStore/DatabaseEditorState.js';
import { Panel, PanelContent, PanelTabs } from '@finos/legend-art';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';
import { RelationalMappingBuilder } from './RelationalMappingBuilder.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

export const DatabaseEditor = observer(() => {
  const editorStore = useEditorStore();
  const databaseEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DatabaseEditorState);
  const isReadOnly = databaseEditorState.isReadOnly;

  const selectedTab = databaseEditorState.selectedTab;
  const changeTab =
    <T,>( // eslint-disable-line
      tab: T,
    ) =>
    (): void => {
      databaseEditorState.setSelectedTab(
        tab as unknown as STORE_DATABASE_TAB_TYPE,
      );
    };
  return (
    <div className="panel connection-editor">
      <div className="panel__header">
        <div className="panel__header__title">
          <div className="panel__header__title__label">database</div>
        </div>
      </div>
      <Panel>
        <PanelTabs
          tabTitles={Object.values(STORE_DATABASE_TAB_TYPE)}
          changeTheTab={changeTab}
          selectedTab={databaseEditorState.selectedTab}
          tabClassName="relational-connection-editor__tab"
        />
        <PanelContent>
          {selectedTab === STORE_DATABASE_TAB_TYPE.GENERAL && (
            <UnsupportedEditorPanel
              text="Can't display this element in form-mode"
              isReadOnly={isReadOnly}
            />
          )}
          {selectedTab === STORE_DATABASE_TAB_TYPE.BUILD_MAPPING && (
            <RelationalMappingBuilder
              relationalMappingBuilderState={
                databaseEditorState.relationalMappingBuilderState
              }
              isReadOnly={isReadOnly}
            />
          )}
        </PanelContent>
      </Panel>
    </div>
  );
});
