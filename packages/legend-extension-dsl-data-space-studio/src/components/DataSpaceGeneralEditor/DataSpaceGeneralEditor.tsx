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
import {
  PanelContentLists,
  PanelForm,
  PanelFormSection,
  PanelFormTextField,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';
import {
  dataSpace_setDescription,
  dataSpace_setTitle,
} from '../../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { DataSpaceDefaultExecutionContextSection } from './DataSpaceDefaultExecutionContextSection.js';
import { DataSpaceDiagramsSection } from './DataSpaceDiagramsSection.js';
import { DataSpaceElementsSection } from './DataSpaceElementsSection.js';
import { DataspaceExecutablesSection } from './DataSpaceExecutablesSection.js';
import { DataSpaceSupportInfoSection } from './DataSpaceSupportInfoSection.js';

export const DataSpaceGeneralEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);
  const dataSpace = dataSpaceState.dataSpace;

  // Basic properties handlers
  const handleTitleChange = (value: string | undefined): void => {
    dataSpace_setTitle(dataSpace, value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    dataSpace_setDescription(dataSpace, value);
  };

  return (
    <PanelContentLists className="dataSpace-editor__general">
      <PanelForm>
        <PanelFormSection>
          <PanelFormTextField
            name="Title"
            value={dataSpace.title ?? ''}
            prompt="Provide a title for this Data Product."
            update={handleTitleChange}
            placeholder="Enter title"
          />
        </PanelFormSection>
        <PanelFormSection>
          <PanelFormTextField
            name="Description"
            value={dataSpace.description ?? ''}
            prompt="Provide a description for this Data Product."
            update={handleDescriptionChange}
            placeholder="Enter description"
          />
        </PanelFormSection>
        <DataSpaceDefaultExecutionContextSection />
        <DataSpaceDiagramsSection />
        <DataSpaceElementsSection />
        <DataspaceExecutablesSection />
        <DataSpaceSupportInfoSection />
      </PanelForm>
    </PanelContentLists>
  );
});
