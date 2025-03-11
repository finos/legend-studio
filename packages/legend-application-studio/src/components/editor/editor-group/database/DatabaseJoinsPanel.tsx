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
import { BlankPanelContent, Button, PanelDivider, PanelFormTextField } from '@finos/legend-art';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';
import { Join } from '@finos/legend-graph';
import { database_addJoin, database_removeJoin } from '../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';

export const DatabaseJoinsPanel = observer(
  (props: { databaseEditorState: DatabaseEditorState }) => {
    const { databaseEditorState } = props;
    const database = databaseEditorState.database;
    const isReadOnly = databaseEditorState.isReadOnly;

    const handleAddJoin = (): void => {
      // For now, we'll create a simplified join without an operation
      // In a real implementation, we would need to create a proper Operation object
      const dummyOperation = {} as unknown; // Temporary workaround
      const newJoin = new Join('New Join', dummyOperation);
      database_addJoin(database, newJoin);
    };

    const handleRemoveJoin = (join: Join): void => {
      database_removeJoin(database, join);
    };

    const handleJoinNameChange = (join: Join, value: string | undefined): void => {
      join.name = value ?? '';
    };

    return (
      <BlankPanelContent>
        <div className="database-editor__joins-panel">
          {!isReadOnly && (
            <div className="database-editor__joins-panel__actions">
              <Button
                className="database-editor__joins-panel__add-button"
                text="Add Join"
                onClick={handleAddJoin}
              />
            </div>
          )}
          {database.joins.length === 0 ? (
            <div className="database-editor__joins-panel__empty">
              No joins defined
            </div>
          ) : (
            database.joins.map((join, idx) => (
              <div key={`join-${idx}`} className="database-editor__join">
                <div className="database-editor__join__header">
                  <PanelFormTextField
                    name="Name"
                    className="database-editor__join__name-input"
                    value={join.name}
                    update={(val) => handleJoinNameChange(join, val)}
                    placeholder="Join name"
                    isReadOnly={isReadOnly}
                  />
                  {!isReadOnly && (
                    <Button
                      className="database-editor__join__remove-button"
                      text="Remove"
                      onClick={() => handleRemoveJoin(join)}
                    />
                  )}
                </div>
                <div className="database-editor__join__details">
                  <div className="database-editor__join__operation">
                    {join.operation ? 'Has operation defined' : 'No operation defined'}
                  </div>
                  {join.target && (
                    <div className="database-editor__join__target">
                      Target: {join.target.toString()}
                    </div>
                  )}
                  {join.aliases.length > 0 && (
                    <div className="database-editor__join__aliases">
                      Aliases: {join.aliases.length}
                    </div>
                  )}
                </div>
                {idx < database.joins.length - 1 && <PanelDivider />}
              </div>
            ))
          )}
        </div>
      </BlankPanelContent>
    );
  },
);
