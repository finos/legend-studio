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
import { LockIcon, clsx } from '@finos/legend-art';
import { prettyCONSTName } from '@finos/legend-shared';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  DATABASE_EDITOR_TAB,
  DatabaseEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/DatabaseEditorState.js';
import { DatabaseDiagramCanvas } from './DatabaseDiagramCanvas.js';
import { DatabaseSchemaTree } from './DatabaseSchemaTree.js';

const TABS: DATABASE_EDITOR_TAB[] = [
  DATABASE_EDITOR_TAB.VIEW,
  DATABASE_EDITOR_TAB.GRAMMAR,
];

/**
 * Top-level editor for `Database` elements in form mode. Has two tabs:
 *   - VIEW (default): Schema → Table → Column tree (left) + React-Flow ERD
 *     canvas (right). The interactive form mode.
 *   - GRAMMAR: read-only Pure DSL preview, regenerated on tab switch by
 *     `setSelectedTab` so it always reflects the current metamodel state.
 *     Mirrors what global Text Mode would render for this element — included
 *     here for users who want to peek at the grammar without leaving form
 *     mode.
 */
export const DatabaseEditor = observer(() => {
  const editorStore = useEditorStore();
  const editorState =
    editorStore.tabManagerState.getCurrentEditorState(DatabaseEditorState);
  const { selectedTab } = editorState;

  return (
    <div className="database-editor">
      <div className="database-editor__tabs__header">
        <div className="database-editor__tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => editorState.setSelectedTab(tab)}
              className={clsx('database-editor__tab', {
                'database-editor__tab--active': tab === selectedTab,
              })}
            >
              {prettyCONSTName(tab)}
            </button>
          ))}
        </div>
        {/*
         * Read-only sticker is part of the tab strip — visible across both
         * VIEW and GRAMMAR tabs because the whole form mode is currently
         * read-only. Once edit support lands, the sticker can be hidden
         * conditionally on `editorState.isReadOnly` (or removed entirely).
         */}
        <div
          className="database-editor__read-only-badge"
          title="This editor is read-only"
        >
          <LockIcon />
          <span className="database-editor__read-only-badge__label">
            READ ONLY
          </span>
        </div>
      </div>
      <div className="database-editor__content">
        {selectedTab === DATABASE_EDITOR_TAB.VIEW && (
          <div className="database-diagram">
            <DatabaseSchemaTree editorState={editorState} />
            <div className="database-diagram__canvas-container">
              <DatabaseDiagramCanvas editorState={editorState} />
            </div>
          </div>
        )}
        {selectedTab === DATABASE_EDITOR_TAB.GRAMMAR && (
          <div className="database-editor__grammar">
            <CodeEditor
              inputValue={editorState.textContent}
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.PURE}
            />
          </div>
        )}
      </div>
    </div>
  );
});
