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
import {
  set_description,
  set_title,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const formEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const formElement = formEditorState.dataSpace;

  const handleTitleChange = (value: string | undefined): void => {
    set_title(formElement, value);
  };

  const handleDescriptionChange: React.ChangeEventHandler<
    HTMLTextAreaElement
  > = (event) => {
    set_description(formElement, event.target.value);
  };

  return (
    <div className="form-dataSpace-editor panel dataSpace-editor--dark">
      <div className="panel__content__form">
        <div className="panel__content__form__section">
          <PanelFormTextField
            name="Title"
            value={formElement.title ?? ''}
            update={handleTitleChange}
            placeholder="Enter title"
          />
        </div>
      </div>
      <div className="panel__content__form">
        <div className="panel__content__form__section">
          <div className="panel__content__form__section__header__label">
            Description
          </div>
          <textarea
            className="panel__content__form__section__textarea"
            title="Description"
            spellCheck={false}
            value={formElement.description ?? ''}
            onChange={handleDescriptionChange}
          />
        </div>
      </div>
    </div>
  );
});
