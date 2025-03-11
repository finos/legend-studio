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
import {
  BlankPanelContent,
  Button,
  PanelDivider,
  PanelFormTextField,
} from '@finos/legend-art';
import type { DatabaseEditorState } from '../../../../stores/editor/editor-state/element-editor-state/database/DatabaseEditorState.js';
import {
  database_addFilter,
  database_removeFilter,
} from '../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';

// Create a Filter interface to match the structure
interface Filter {
  name: string;
  operation: any;
}

export const DatabaseFiltersPanel = observer(
  (props: { databaseEditorState: DatabaseEditorState }) => {
    const { databaseEditorState } = props;
    const database = databaseEditorState.database;
    const isReadOnly = databaseEditorState.isReadOnly;

    const handleAddFilter = (): void => {
      // For now, we'll create a simplified filter
      // In a real implementation, we would need to create a proper Filter object
      const dummyOperation = {} as unknown; // Temporary workaround
      const newFilter = {
        name: 'New Filter',
        operation: dummyOperation,
      } as Filter;
      database_addFilter(database, newFilter);
    };

    const handleRemoveFilter = (filter: Filter): void => {
      database_removeFilter(database, filter);
    };

    const handleFilterNameChange = (
      filter: Filter,
      value: string | undefined,
    ): void => {
      filter.name = value ?? '';
    };

    return (
      <BlankPanelContent>
        <div className="database-editor__filters-panel">
          {!isReadOnly && (
            <div className="database-editor__filters-panel__actions">
              <Button
                className="database-editor__filters-panel__add-button"
                text="Add Filter"
                onClick={handleAddFilter}
              />
            </div>
          )}
          {database.filters.length === 0 ? (
            <div className="database-editor__filters-panel__empty">
              No filters defined
            </div>
          ) : (
            database.filters.map((filter, idx) => (
              <div key={`filter-${idx}`} className="database-editor__filter">
                <div className="database-editor__filter__header">
                  <PanelFormTextField
                    name="Name"
                    className="database-editor__filter__name-input"
                    value={filter.name}
                    update={(val) => handleFilterNameChange(filter, val)}
                    placeholder="Filter name"
                    isReadOnly={isReadOnly}
                  />
                  {!isReadOnly && (
                    <Button
                      className="database-editor__filter__remove-button"
                      text="Remove"
                      onClick={() => handleRemoveFilter(filter)}
                    />
                  )}
                </div>
                <div className="database-editor__filter__details">
                  <div className="database-editor__filter__operation">
                    {filter.operation
                      ? 'Has operation defined'
                      : 'No operation defined'}
                  </div>
                </div>
                {idx < database.filters.length - 1 && <PanelDivider />}
              </div>
            ))
          )}
        </div>
      </BlankPanelContent>
    );
  },
);
