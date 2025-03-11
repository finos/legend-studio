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
import { Schema } from '@finos/legend-graph';
import { database_addSchema, database_removeSchema } from '../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';

export const DatabaseSchemasPanel = observer(
  (props: { databaseEditorState: DatabaseEditorState }) => {
    const { databaseEditorState } = props;
    const database = databaseEditorState.database;
    const isReadOnly = databaseEditorState.isReadOnly;

    const handleAddSchema = (): void => {
      // Create a new schema with the database as owner
      const newSchema = new Schema('New Schema', database);
      database_addSchema(database, newSchema);
    };

    const handleRemoveSchema = (schema: Schema): void => {
      database_removeSchema(database, schema);
    };

    const handleSchemaNameChange = (schema: Schema, value: string | undefined): void => {
      schema.name = value ?? '';
    };

    return (
      <BlankPanelContent>
        <div className="database-editor__schemas-panel">
          {!isReadOnly && (
            <div className="database-editor__schemas-panel__actions">
              <Button
                className="database-editor__schemas-panel__add-button"
                text="Add Schema"
                onClick={handleAddSchema}
              />
            </div>
          )}
          {database.schemas.length === 0 ? (
            <div className="database-editor__schemas-panel__empty">
              No schemas defined
            </div>
          ) : (
            database.schemas.map((schema, idx) => (
              <div key={`schema-${idx}`} className="database-editor__schema">
                <div className="database-editor__schema__header">
                  <PanelFormTextField
                    name="Name"
                    className="database-editor__schema__name-input"
                    value={schema.name}
                    update={(val) => handleSchemaNameChange(schema, val)}
                    placeholder="Schema name"
                    isReadOnly={isReadOnly}
                  />
                  {!isReadOnly && (
                    <Button
                      className="database-editor__schema__remove-button"
                      text="Remove"
                      onClick={() => handleRemoveSchema(schema)}
                    />
                  )}
                </div>
                <div className="database-editor__schema__tables">
                  <div className="database-editor__schema__tables__header">
                    Tables
                  </div>
                  {schema.tables.length === 0 ? (
                    <div className="database-editor__schema__tables__empty">
                      No tables defined
                    </div>
                  ) : (
                    schema.tables.map((table, tableIdx) => (
                      <div key={`table-${tableIdx}`} className="database-editor__table">
                        <div className="database-editor__table__name">
                          {table.name}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {idx < database.schemas.length - 1 && <PanelDivider />}
              </div>
            ))
          )}
        </div>
      </BlankPanelContent>
    );
  },
);
