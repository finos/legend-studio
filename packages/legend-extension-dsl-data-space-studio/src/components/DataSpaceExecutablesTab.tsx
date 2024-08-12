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

import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  CustomSelectorInput,
  PanelFormSection,
  PanelFormTextField,
} from '@finos/legend-art';
import type { DataSpaceEditorState } from '../stores/DataSpaceEditorState.js';

interface DataSpaceExecutablesTabProps {
  dataSpaceEditorState: DataSpaceEditorState;
}

export const DataSpaceExecutablesTab: React.FC<DataSpaceExecutablesTabProps> =
  observer(({ dataSpaceEditorState }) => {
    const { selectedExecutable } = dataSpaceEditorState;

    const handleTitleChange = (value: string | undefined): void => {
      if (selectedExecutable) {
        selectedExecutable.title = value ?? '';
      }
    };

    const handleDescriptionChange = (value: string | undefined): void => {
      if (selectedExecutable) {
        selectedExecutable.description = value ?? '';
      }
    };

    return (
      <div className="data-space-executables-tab">
        {dataSpaceEditorState.dataSpace.executables?.map(
          (executable, index) => (
            <PanelFormSection key={executable.hashCode}>
              <PanelFormTextField
                name={`Executable ${index + 1}`}
                value={executable.title}
                update={handleTitleChange}
                placeholder="Enter executable title"
              />
              <PanelFormTextField
                name="Description"
                value={executable.description}
                update={handleDescriptionChange}
                placeholder="Enter executable description"
              />
            </PanelFormSection>
          ),
        )}
      </div>
    );
  });
