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
import React from 'react';
import { BlankPanelContent, PanelFormTextField } from '@finos/legend-art';
import type { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';

export const DataSpaceGeneralPanel = observer(
  (props: { dataSpaceEditorState: DataSpaceEditorState }) => {
    const { dataSpaceEditorState } = props;
    const dataSpace = dataSpaceEditorState.dataSpace;
    const isReadOnly = dataSpaceEditorState.isReadOnly;

    const handleNameChange = (value: string | undefined): void => {
      if (!isReadOnly && value !== undefined) {
        dataSpace.name = value;
      }
    };

    const handleDescriptionChange = (value: string | undefined): void => {
      if (!isReadOnly && value !== undefined) {
        dataSpace.description = value;
      }
    };

    return (
      <BlankPanelContent>
        <div className="dataspace-editor__general-panel">
          <div className="dataspace-editor__general-panel__section">
            <div className="dataspace-editor__general-panel__section__header">
              Basic Information
            </div>
            <div className="dataspace-editor__general-panel__section__content">
              <PanelFormTextField
                name="Name"
                value={dataSpace.name}
                update={handleNameChange}
                isReadOnly={isReadOnly}
              />
              <PanelFormTextField
                name="Description"
                value={dataSpace.description ?? ''}
                update={handleDescriptionChange}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      </BlankPanelContent>
    );
  },
);
