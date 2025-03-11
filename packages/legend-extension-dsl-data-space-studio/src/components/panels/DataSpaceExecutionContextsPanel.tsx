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
import { BlankPanelContent, Button, PanelDivider } from '@finos/legend-art';
import type { DataSpaceEditorState } from '../../stores/DataSpaceEditorState.js';

export const DataSpaceExecutionContextsPanel = observer(
  (props: { dataSpaceEditorState: DataSpaceEditorState }) => {
    const { dataSpaceEditorState } = props;
    const dataSpace = dataSpaceEditorState.dataSpace;
    const isReadOnly = dataSpaceEditorState.isReadOnly;

    const handleAddExecutionContext = (): void => {
      // Implementation would go here
      console.log('Add execution context');
    };

    return (
      <BlankPanelContent>
        <div className="dataspace-editor__execution-contexts-panel">
          {!isReadOnly && (
            <div className="dataspace-editor__execution-contexts-panel__actions">
              <Button
                className="dataspace-editor__execution-contexts-panel__add-button"
                text="Add Execution Context"
                onClick={handleAddExecutionContext}
              />
            </div>
          )}
          {dataSpace.executionContexts.length === 0 ? (
            <div className="dataspace-editor__execution-contexts-panel__empty">
              No execution contexts defined
            </div>
          ) : (
            dataSpace.executionContexts.map((context, idx) => (
              <div key={idx} className="dataspace-editor__execution-context">
                <div className="dataspace-editor__execution-context__header">
                  <div className="dataspace-editor__execution-context__name">
                    {context.name}
                  </div>
                  {!isReadOnly && (
                    <Button
                      className="dataspace-editor__execution-context__remove-button"
                      text="Remove"
                      onClick={() => console.log('Remove context')}
                    />
                  )}
                </div>
                <div className="dataspace-editor__execution-context__details">
                  <div className="dataspace-editor__execution-context__mapping">
                    Mapping: {context.mapping?.name ?? 'None'}
                  </div>
                  <div className="dataspace-editor__execution-context__runtime">
                    Runtime: {context.runtime?.name ?? 'None'}
                  </div>
                </div>
                {idx < dataSpace.executionContexts.length - 1 && (
                  <PanelDivider />
                )}
              </div>
            ))
          )}
        </div>
      </BlankPanelContent>
    );
  },
);
