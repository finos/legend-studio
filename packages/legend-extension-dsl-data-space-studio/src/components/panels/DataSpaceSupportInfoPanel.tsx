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

export const DataSpaceSupportInfoPanel = observer(
  (props: { dataSpaceEditorState: DataSpaceEditorState }) => {
    const { dataSpaceEditorState } = props;
    const dataSpace = dataSpaceEditorState.dataSpace;
    const isReadOnly = dataSpaceEditorState.isReadOnly;

    const handleSupportContactChange = (value: string | undefined): void => {
      if (!isReadOnly && value !== undefined) {
        dataSpace.supportInfo = {
          ...dataSpace.supportInfo,
          supportContact: value,
        };
      }
    };

    const handleDocumentationUrlChange = (value: string | undefined): void => {
      if (!isReadOnly && value !== undefined) {
        dataSpace.supportInfo = {
          ...dataSpace.supportInfo,
          documentationUrl: value,
        };
      }
    };

    return (
      <BlankPanelContent>
        <div className="dataspace-editor__support-info-panel">
          <div className="dataspace-editor__support-info-panel__section">
            <div className="dataspace-editor__support-info-panel__section__header">
              Support Information
            </div>
            <div className="dataspace-editor__support-info-panel__section__content">
              <PanelFormTextField
                name="Support Contact"
                value={dataSpace.supportInfo?.supportContact ?? ''}
                update={handleSupportContactChange}
                isReadOnly={isReadOnly}
              />
              <PanelFormTextField
                name="Documentation URL"
                value={dataSpace.supportInfo?.documentationUrl ?? ''}
                update={handleDocumentationUrlChange}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      </BlankPanelContent>
    );
  },
);
