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

import { useEditorStore } from '@finos/legend-application-studio';
import { PanelFormTextField } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { NewDataProductDriver } from './DSL_DataProduct_ElementDriver.js';

export const NewDataProductDriverEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataProductDriver =
    editorStore.newElementState.getNewElementDriver(NewDataProductDriver);

  const handleTitleChange = (value: string | undefined): void => {
    dataProductDriver.setTitle(value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    dataProductDriver.setDescription(value);
  };

  return (
    <div>
      <PanelFormTextField
        name="Title"
        value={dataProductDriver.title ?? ''}
        prompt="Provide a title for this Data Product."
        update={handleTitleChange}
        placeholder="Enter title"
        className="explorer__new-element-modal__driver__dropdown"
      />

      <PanelFormTextField
        name="Description"
        value={dataProductDriver.description ?? ''}
        prompt="Provide a description for this Data Product."
        update={handleDescriptionChange}
        placeholder="Enter description"
        className="explorer__new-element-modal__driver__dropdown"
      />
    </div>
  );
});
