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
import { PanelFormSection, PanelFormTextField } from '@finos/legend-art';
import { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';
import {
  set_description,
  set_supportInfo,
  // set_executionContexts,
  set_title,
} from '../stores/studio/DSL_DataSpace_GraphModifierHelper.js';
import { DataSpaceSupportEmail } from '@finos/legend-extension-dsl-data-space/graph';

export const DataSpaceEditor = observer(() => {
  const editorStore = useEditorStore();

  const dataSpaceEditorState =
    editorStore.tabManagerState.getCurrentEditorState(DataSpaceEditorState);

  const dataSpaceElement = dataSpaceEditorState.dataSpace;

  const handleTitleChange = (value: string | undefined): void => {
    set_title(dataSpaceElement, value);
  };

  const handleDescriptionChange = (value: string | undefined): void => {
    set_description(dataSpaceElement, value);
  };

  const handleSupportInfoChange = (value: string | undefined) => {
    const supportInfo = new DataSpaceSupportEmail();
    supportInfo.address = value ?? '';
    set_supportInfo(dataSpaceElement, supportInfo);
  };

  const supportEmail =
    dataSpaceElement.supportInfo instanceof DataSpaceSupportEmail
      ? dataSpaceElement.supportInfo.address
      : '';

  // const handleExecutionContextChange = (
  //   index: number,
  //   field: string,
  //   value: string,
  // ) => {
  //   const updatedContexts = [...dataSpaceElement.executionContexts];
  //   const context = updatedContexts[index];
  //   if (!context) {
  //     console.warn(`Execution context at index ${index} is undefined.`);
  //     return;
  //   }
  //   if (field === 'name') {
  //     context.name = value;
  //   } else if (field === 'title') {
  //     context.title = value;
  //   } else if (field === 'description') {
  //     context.description = value;
  //   }
  //   set_executionContexts(dataSpaceElement, updatedContexts);
  // };

  return (
    <div className="dataSpace-editor panel dataSpace-editor--dark">
      <PanelFormSection>
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <PanelFormTextField
              name="Data Space Title"
              value={dataSpaceElement.title ?? ''}
              prompt="Data Space title is the user facing name for the Data Space. It used in downstream applications as the default identifier for this Data Space. When not provided, the DataSpace name property is used"
              update={handleTitleChange}
              placeholder="Enter title"
            />
          </div>
        </div>
        <div className="panel__content__form">
          <div className="panel__content__form__section">
            <PanelFormTextField
              name="Data Space Description"
              value={dataSpaceElement.description ?? ''}
              update={handleDescriptionChange}
              placeholder="Enter Description"
            />
          </div>
        </div>
        <div>
          <PanelFormTextField
            name="Support Email"
            value={supportEmail}
            update={handleSupportInfoChange}
            placeholder="Enter support email"
          />
        </div>
        {/* {dataSpaceElement.executionContexts.map((context, index) => (
          <div key={index}>
            <PanelFormTextField
              name={`Execution Context ${index + 1} Name`}
              value={context.name}
              update={(value) =>
                handleExecutionContextChange(index, 'name', value ?? '')
              }
              placeholder="Enter execution context name"
            />
            <PanelFormTextField
              name={`Execution Context ${index + 1} Title`}
              value={context.title ?? ''}
              update={(value) =>
                handleExecutionContextChange(index, 'title', value ?? '')
              }
              placeholder="Enter execution context title"
            />
            <PanelFormTextField
              name={`Execution Context ${index + 1} Description`}
              value={context.description ?? ''}
              update={(value) =>
                handleExecutionContextChange(index, 'description', value ?? '')
              }
              placeholder="Enter execution context description"
            />
            <PanelFormTextField
              name={`Support Info ${index + 1} `}
              value={context.description ?? ''}
              update={(value) =>
                handleSupportInfoChange(index, 'support', value ?? '')
              }
              placeholder="Enter support info "
            />
          </div>
        ))} */}
      </PanelFormSection>
    </div>
  );
});
