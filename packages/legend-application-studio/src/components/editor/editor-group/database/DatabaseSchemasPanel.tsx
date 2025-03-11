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
import { BlankPanelContent, PanelDivider } from '@finos/legend-art';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';

export const DatabaseSchemasPanel = observer(
  (props: { databaseEditorState: DatabaseEditorState }) => {
    const { databaseEditorState } = props;
    const database = databaseEditorState.database;
    const isReadOnly = databaseEditorState.isReadOnly;

    return (
      <BlankPanelContent>
        <div className="database-editor__schemas-panel">
          {database.schemas.length === 0 ? (
            <div className="database-editor__schemas-panel__empty">
              No schemas defined
            </div>
          ) : (
            database.schemas.map((schema, idx) => (
              <div key={schema.name} className="database-editor__schema">
                <div className="database-editor__schema__header">
                  <div className="database-editor__schema__name">
                    {schema.name}
                  </div>
                  <div className="database-editor__schema__tables-count">
                    {schema.tables.length} tables
                  </div>
                </div>
                <div className="database-editor__schema__tables">
                  {schema.tables.length === 0 ? (
                    <div className="database-editor__schema__tables__empty">
                      No tables defined
                    </div>
                  ) : (
                    schema.tables.map((table) => (
                      <div
                        key={table.name}
                        className="database-editor__schema__table"
                      >
                        <div className="database-editor__schema__table__name">
                          {table.name}
                        </div>
                        <div className="database-editor__schema__table__columns-count">
                          {table.columns.length} columns
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
