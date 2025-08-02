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
import { useState, useRef } from 'react';
import {
  BlankPanelPlaceholder,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  PanelContent,
  PanelHeader,
  PlusIcon,
  TimesIcon,
  UploadIcon,
  DownloadIcon,
  LockIcon,
} from '@finos/legend-art';
import type { RelationalTestDataState } from '../../../../stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';

const DATA_TYPES = ['VARCHAR', 'INTEGER', 'DECIMAL', 'DATE', 'BOOLEAN'];

export const RelationalTestDataEditor = observer(
  (props: { dataState: RelationalTestDataState; isReadOnly: boolean }) => {
    const { dataState, isReadOnly } = props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql'>(
      'json',
    );

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_DATA_RELATIONAL_EDITOR,
    );

    const addColumn = (): void => {
      if (!isReadOnly) {
        const columnName = `column_${dataState.columns.length + 1}`;
        dataState.addColumn(columnName, 'VARCHAR');
      }
    };

    const removeColumn = (index: number): void => {
      if (!isReadOnly) {
        dataState.removeColumn(index);
      }
    };

    const updateColumn = (
      index: number,
      field: 'name' | 'type',
      value: string,
    ): void => {
      if (!isReadOnly) {
        const column = dataState.columns[index];
        if (column) {
          if (field === 'name') {
            dataState.updateColumn(index, value, column.type);
          } else {
            dataState.updateColumn(index, column.name, value);
          }
        }
      }
    };

    const addRow = (): void => {
      if (!isReadOnly) {
        dataState.addRow();
      }
    };

    const removeRow = (index: number): void => {
      if (!isReadOnly) {
        dataState.removeRow(index);
      }
    };

    const updateCellValue = (
      rowIndex: number,
      columnName: string,
      value: string,
    ): void => {
      if (!isReadOnly) {
        dataState.updateRow(rowIndex, columnName, value);
      }
    };

    const handleFileUpload = (
      event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
      const file = event.target.files?.[0];
      if (file && file.type === 'text/csv') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvContent = e.target?.result as string;
          if (csvContent) {
            dataState.importCSV(csvContent);
          }
        };
        reader.readAsText(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const exportData = (): void => {
      let content = '';
      let filename = '';
      let mimeType = '';

      switch (exportFormat) {
        case 'json':
          content = dataState.exportJSON();
          filename = 'test_data.json';
          mimeType = 'application/json';
          break;
        case 'csv':
          content = dataState.exportCSV();
          filename = 'test_data.csv';
          mimeType = 'text/csv';
          break;
        case 'sql':
          content = dataState.exportSQL();
          filename = 'test_data.sql';
          mimeType = 'text/sql';
          break;
        default:
          content = dataState.exportJSON();
          filename = 'test_data.json';
          mimeType = 'application/json';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    return (
      <div className="panel relational-test-data-editor">
        <PanelHeader>
          <div className="panel__header__title">
            {isReadOnly && (
              <div className="panel__header__lock">
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">
              {dataState.label()}
            </div>
          </div>
          <div className="panel__header__actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isReadOnly}
            />
            <button
              className="panel__header__action"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadOnly}
              title="Import CSV"
              tabIndex={-1}
            >
              <UploadIcon />
            </button>
            <ControlledDropdownMenu
              className="panel__header__action"
              disabled={isReadOnly}
              content={
                <MenuContent>
                  <MenuContentItem onClick={() => setExportFormat('json')}>
                    Export as JSON
                  </MenuContentItem>
                  <MenuContentItem onClick={() => setExportFormat('csv')}>
                    Export as CSV
                  </MenuContentItem>
                  <MenuContentItem onClick={() => setExportFormat('sql')}>
                    Export as SQL
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <button
                className="panel__header__action"
                onClick={exportData}
                disabled={isReadOnly}
                title={`Export as ${exportFormat.toUpperCase()}`}
                tabIndex={-1}
              >
                <DownloadIcon />
              </button>
            </ControlledDropdownMenu>
          </div>
        </PanelHeader>
        <PanelContent>
          {dataState.columns.length === 0 ? (
            <BlankPanelPlaceholder
              text="Add columns to define your test data structure"
              onClick={addColumn}
              clickActionType="add"
              tooltipText="Add Column"
              disabled={isReadOnly}
            />
          ) : (
            <div className="relational-test-data-editor__content">
              <div className="relational-test-data-editor__columns">
                <div className="relational-test-data-editor__section-header">
                  <div className="relational-test-data-editor__section-title">
                    Column Definitions
                  </div>
                  <button
                    className="btn btn--dark btn--sm"
                    onClick={addColumn}
                    disabled={isReadOnly}
                    title="Add Column"
                  >
                    <PlusIcon />
                    Add Column
                  </button>
                </div>
                <div className="relational-test-data-editor__columns-grid">
                  {dataState.columns.map((column, index) => (
                    <div
                      key={`column-${index}`}
                      className="relational-test-data-editor__column-row"
                    >
                      <input
                        className="relational-test-data-editor__column-input"
                        type="text"
                        value={column.name}
                        onChange={(e) =>
                          updateColumn(index, 'name', e.target.value)
                        }
                        placeholder="Column Name"
                        disabled={isReadOnly}
                      />
                      <select
                        className="relational-test-data-editor__column-select"
                        value={column.type}
                        onChange={(e) =>
                          updateColumn(index, 'type', e.target.value)
                        }
                        disabled={isReadOnly}
                      >
                        {DATA_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn--icon btn--dark btn--sm"
                        onClick={() => removeColumn(index)}
                        disabled={isReadOnly}
                        title="Remove Column"
                      >
                        <TimesIcon />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relational-test-data-editor__data">
                <div className="relational-test-data-editor__section-header">
                  <div className="relational-test-data-editor__section-title">
                    Test Data ({dataState.rows.length} rows)
                  </div>
                  <button
                    className="btn btn--dark btn--sm"
                    onClick={addRow}
                    disabled={isReadOnly || dataState.columns.length === 0}
                    title="Add Row"
                  >
                    <PlusIcon />
                    Add Row
                  </button>
                </div>
                {dataState.rows.length === 0 ? (
                  <div className="relational-test-data-editor__empty-data">
                    <div className="relational-test-data-editor__empty-text">
                      No test data rows. Click &quot;Add Row&quot; to start
                      entering data.
                    </div>
                  </div>
                ) : (
                  <div className="relational-test-data-editor__data-grid">
                    <div className="relational-test-data-editor__data-header">
                      {dataState.columns.map((column) => (
                        <div
                          key={column.name}
                          className="relational-test-data-editor__data-header-cell"
                        >
                          {column.name}
                          <span className="relational-test-data-editor__data-type">
                            ({column.type})
                          </span>
                        </div>
                      ))}
                      <div className="relational-test-data-editor__data-header-cell relational-test-data-editor__data-actions">
                        Actions
                      </div>
                    </div>
                    {dataState.rows.map((row, rowIndex) => (
                      <div
                        key={`row-${rowIndex}`}
                        className="relational-test-data-editor__data-row"
                      >
                        {dataState.columns.map((column) => (
                          <div
                            key={column.name}
                            className="relational-test-data-editor__data-cell"
                          >
                            <input
                              type="text"
                              value={row[column.name] ?? ''}
                              onChange={(e) =>
                                updateCellValue(
                                  rowIndex,
                                  column.name,
                                  e.target.value,
                                )
                              }
                              disabled={isReadOnly}
                              className="relational-test-data-editor__data-input"
                            />
                          </div>
                        ))}
                        <div className="relational-test-data-editor__data-cell relational-test-data-editor__data-actions">
                          <button
                            className="btn--icon btn--dark btn--sm"
                            onClick={() => removeRow(rowIndex)}
                            disabled={isReadOnly}
                            title="Remove Row"
                          >
                            <TimesIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </PanelContent>
      </div>
    );
  },
);
