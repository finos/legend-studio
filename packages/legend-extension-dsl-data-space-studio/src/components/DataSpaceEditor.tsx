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
import { useEditorStore } from '@finos/legend-application-studio';
import { PanelFormTextField, PanelFormSection } from '@finos/legend-art';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const formEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const formElement = formEditorState.dataSpace;

  const handleTitleChange = (value: string | undefined) => {
    formElement.title = value ?? '';
  };

  const handleDescriptionChange = (value: string | undefined) => {
    formElement.description = value ?? '';
  };

  return (
    <div className="form-text-editor panel text-element-editor">
      <div className="panel__header text-element-editor__header">
        <div
          className="text-element-editor__header__configs"
          style={{ position: 'relative', top: '200px', height: '200px' }}
        >
          <div className="panel__content">
            <PanelFormSection>
              <div>
                <PanelFormTextField
                  name="Title"
                  value={formElement.title ?? ''}
                  update={handleTitleChange}
                  placeholder="Enter title"
                />
              </div>
              <div>
                <PanelFormTextField
                  name="Description"
                  value={formElement.description ?? ''}
                  update={handleDescriptionChange}
                  placeholder="Enter description"
                />
              </div>
            </PanelFormSection>
          </div>
        </div>
      </div>
    </div>
  );
});
