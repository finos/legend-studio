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
import { BlankPanelContent, Button } from '@finos/legend-art';
import type { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';

export const DataSpaceExecutablesPanel = observer(
  (props: { dataSpaceEditorState: DataSpaceEditorState }) => {
    const { dataSpaceEditorState } = props;
    const dataSpace = dataSpaceEditorState.dataSpace;
    const isReadOnly = dataSpaceEditorState.isReadOnly;

    const handleAddExecutable = (): void => {
      // Implementation would go here
      console.log('Add executable');
    };

    return (
      <BlankPanelContent>
        <div className="dataspace-editor__executables-panel">
          {!isReadOnly && (
            <div className="dataspace-editor__executables-panel__actions">
              <Button
                className="dataspace-editor__executables-panel__add-button"
                text="Add Executable"
                onClick={handleAddExecutable}
              />
            </div>
          )}
          {dataSpace.executables.length === 0 ? (
            <div className="dataspace-editor__executables-panel__empty">
              No executables defined
            </div>
          ) : (
            dataSpace.executables.map((executable, idx) => (
              <div key={idx} className="dataspace-editor__executable">
                <div className="dataspace-editor__executable__header">
                  <div className="dataspace-editor__executable__title">
                    {executable.title}
                  </div>
                  {!isReadOnly && (
                    <Button
                      className="dataspace-editor__executable__remove-button"
                      text="Remove"
                      onClick={() => console.log('Remove executable')}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </BlankPanelContent>
    );
  },
);
