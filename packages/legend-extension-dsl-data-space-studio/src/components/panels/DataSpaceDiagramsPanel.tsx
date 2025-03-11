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

export const DataSpaceDiagramsPanel = observer(
  (props: { dataSpaceEditorState: DataSpaceEditorState }) => {
    const { dataSpaceEditorState } = props;
    const dataSpace = dataSpaceEditorState.dataSpace;
    const isReadOnly = dataSpaceEditorState.isReadOnly;

    const handleAddDiagram = (): void => {
      // Implementation would go here
      console.log('Add diagram');
    };

    return (
      <BlankPanelContent>
        <div className="dataspace-editor__diagrams-panel">
          {!isReadOnly && (
            <div className="dataspace-editor__diagrams-panel__actions">
              <Button
                className="dataspace-editor__diagrams-panel__add-button"
                text="Add Diagram"
                onClick={handleAddDiagram}
              />
            </div>
          )}
          {(dataSpace.diagrams?.length ?? 0) === 0 ? (
            <div className="dataspace-editor__diagrams-panel__empty">
              No diagrams defined
            </div>
          ) : (
            dataSpace.diagrams?.map((diagram, idx) => (
              <div key={idx} className="dataspace-editor__diagram">
                <div className="dataspace-editor__diagram__header">
                  <div className="dataspace-editor__diagram__title">
                    {diagram.title}
                  </div>
                  {!isReadOnly && (
                    <Button
                      className="dataspace-editor__diagram__remove-button"
                      text="Remove"
                      onClick={() => console.log('Remove diagram')}
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
