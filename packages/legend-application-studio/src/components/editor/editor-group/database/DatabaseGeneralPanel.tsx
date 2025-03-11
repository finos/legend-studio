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
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';
import { database_setName } from '../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';

export const DatabaseGeneralPanel = observer(
  (props: { databaseEditorState: DatabaseEditorState }) => {
    const { databaseEditorState } = props;
    const database = databaseEditorState.database;
    const isReadOnly = databaseEditorState.isReadOnly;

    const handleNameChange = (value: string | undefined): void => {
      database_setName(database, value ?? '');
    };

    return (
      <BlankPanelContent>
        <div className="database-editor__general-panel">
          <div className="database-editor__general-panel__section">
            <div className="database-editor__general-panel__section__header">
              Database Information
            </div>
            <div className="database-editor__general-panel__section__content">
              <PanelFormTextField
                name="Name"
                value={database.name}
                update={handleNameChange}
                placeholder="Enter name"
                isReadOnly={isReadOnly}
              />
              <div className="database-editor__general-panel__field">
                <div className="database-editor__general-panel__field__label">
                  Path
                </div>
                <div className="database-editor__general-panel__field__value">
                  {database.path}
                </div>
              </div>
              <div className="database-editor__general-panel__field">
                <div className="database-editor__general-panel__field__label">
                  Type
                </div>
                <div className="database-editor__general-panel__field__value">
                  Database
                </div>
              </div>
            </div>
          </div>
        
          <div className="database-editor__general-panel__section">
            <div className="database-editor__general-panel__section__header">
              Database Statistics
            </div>
            <div className="database-editor__general-panel__section__content">
              <div className="database-editor__general-panel__field">
                <div className="database-editor__general-panel__field__label">
                  Schemas
                </div>
                <div className="database-editor__general-panel__field__value">
                  {database.schemas.length}
                </div>
              </div>
              <div className="database-editor__general-panel__field">
                <div className="database-editor__general-panel__field__label">
                  Joins
                </div>
                <div className="database-editor__general-panel__field__value">
                  {database.joins.length}
                </div>
              </div>
              <div className="database-editor__general-panel__field">
                <div className="database-editor__general-panel__field__label">
                  Filters
                </div>
                <div className="database-editor__general-panel__field__value">
                  {database.filters.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </BlankPanelContent>
    );
  },
);
