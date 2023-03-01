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

import {
  LockIcon,
  Panel,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';

import { SchemaGenerationEditorState } from '../../../../stores/editor-state/element-editor-state/file-generation/SchemaGenerationEditorState.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

export const SchemaGenerationEditor = observer(() => {
  const editorStore = useEditorStore();
  const schemaGenerationEditorState =
    editorStore.tabManagerState.getCurrentEditorState(
      SchemaGenerationEditorState,
    );
  const schemaGeneration = schemaGenerationEditorState.schemaGeneration;
  const isReadOnly = schemaGenerationEditorState.isReadOnly;
  return (
    <div className="schema-generation-editor">
      <Panel>
        <div className="panel__header">
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="uml-element-editor__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">schema generation</div>
            <div className="panel__header__title__content">
              {schemaGeneration.name}
            </div>
          </div>
        </div>
        <div className="panel__content file-generation-editor__content">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={400} minSize={300}>
              <div></div>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <div></div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </Panel>
    </div>
  );
});
