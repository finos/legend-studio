/**
 * Copyright (c) 2025-present, Goldman Sachs
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
import React, { useState, useRef } from 'react';
import {
  BlankPanelPlaceholder,
  PanelContent,
  PanelHeader,
  PlusIcon,
  TimesIcon,
  LockIcon,
  TrashIcon,
  UploadIcon,
  FileImportIcon,
  Dialog,
  clsx,
  CustomSelectorInput,
} from '@finos/legend-art';
import { RelationElement } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import type {
  RelationElementsDataState,
  RelationElementState,
} from '../../../../stores/editor/editor-state/element-editor-state/data/EmbeddedDataState.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  useApplicationNavigationContext,
} from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { useEditorStore } from '../../EditorStoreProvider.js';

const NewRelationElementModal = observer(
  (props: { dataState: RelationElementsDataState; isReadOnly: boolean }) => {
    const { isReadOnly, dataState } = props;
    const applicationStore = dataState.editorStore.applicationStore;
    const availableAccessorOptions = dataState.availableAccessorOptions;
    const hasAccessorOptions =
      dataState.accessorOptions !== undefined &&
      availableAccessorOptions.length > 0;

    const [selectedAccessor, setSelectedAccessor] = useState<
      string | undefined
    >(availableAccessorOptions[0]?.value);

    enum PathType {
      SCHEMA_TABLE = 'Schema and Table',
    }
    interface PathTypeOption {
      value: PathType;
      label: string;
    }
    const pathTypeOptions = Object.values(PathType).map((type) => ({
      label: type,
      value: type,
    }));
    const [pathType, setPathType] = useState<PathTypeOption | undefined>(
      pathTypeOptions[0],
    );
    const onPathTypeChange = (val: PathTypeOption): void => {
      setPathType(val);
    };

    const [schemaName, setSchemaName] = useState<string | undefined>();
    const [tableName, setTableName] = useState<string | undefined>();
    const changeSchemaValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setSchemaName(event.target.value);
    };
    const changeTableValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      setTableName(event.target.value);
    };

    const closeModal = (): void =>
      dataState.setShowNewRelationElementModal(false);
    const handleSubmit = (): void => {
      if (hasAccessorOptions && selectedAccessor) {
        const option = availableAccessorOptions.find(
          (o) => o.value === selectedAccessor,
        );
        if (option) {
          const relationElement = new RelationElement();
          relationElement.paths = [option.value];
          relationElement.columns = option.columns;
          relationElement.rows = [];
          dataState.addRelationElement(relationElement);
        }
      } else {
        const path: string[] = [];
        if (pathType && schemaName && tableName) {
          path.push(schemaName);
          path.push(tableName);
        }
        const relationElement = new RelationElement();
        relationElement.columns = [];
        relationElement.rows = [];
        relationElement.paths = path;
        dataState.addRelationElement(relationElement);
      }
      closeModal();
    };

    return (
      <Dialog
        open={dataState.showNewRelationElementModal}
        onClose={closeModal}
        classes={{ container: 'search-modal__container' }}
        slotProps={{
          paper: {
            classes: { root: 'search-modal__inner-container' },
          },
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
          className="modal modal--dark search-modal"
        >
          <div className="modal__title">Add Relation Element</div>
          <div className="relational-data-editor__identifier">
            {hasAccessorOptions ? (
              <div className="relational-data-editor__identifier__values">
                <div className="panel__content__form__section__header__label">
                  {dataState.accessorTypeLabel}
                </div>
                <CustomSelectorInput
                  className="explorer__new-element-modal__driver__dropdown"
                  options={availableAccessorOptions.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  onChange={(
                    val: { value: string; label: string } | null,
                  ): void => {
                    setSelectedAccessor(val?.value);
                  }}
                  value={
                    selectedAccessor
                      ? {
                          value: selectedAccessor,
                          label: selectedAccessor,
                        }
                      : null
                  }
                  placeholder={`Select ${dataState.accessorTypeLabel ?? 'option'}...`}
                  isClearable={false}
                  darkMode={
                    !applicationStore.layoutService
                      .TEMPORARY__isLightColorThemeEnabled
                  }
                />
              </div>
            ) : (
              <>
                <div className="relational-data-editor__identifier__values">
                  <CustomSelectorInput
                    className="explorer__new-element-modal__driver__dropdown"
                    options={pathTypeOptions}
                    onChange={onPathTypeChange}
                    value={pathType}
                    isClearable={false}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                  />
                </div>
                <div className="relational-data-editor__identifier__values">
                  <input
                    className="panel__content__form__section__input"
                    disabled={isReadOnly}
                    placeholder="schemaName"
                    value={schemaName}
                    onChange={changeSchemaValue}
                  />
                </div>
                <div className="relational-data-editor__identifier__values">
                  <input
                    className="relational-data-editor__identifier__values panel__content__form__section__input"
                    disabled={isReadOnly}
                    placeholder="tableName"
                    value={tableName}
                    onChange={changeTableValue}
                  />
                </div>
              </>
            )}
          </div>
          <div className="search-modal__actions">
            <button
              className="btn btn--dark"
              disabled={isReadOnly || (hasAccessorOptions && !selectedAccessor)}
            >
              Add
            </button>
          </div>
        </form>
      </Dialog>
    );
  },
);

export const RelationElementEditor = observer(
  (props: {
    relationElementState: {
      relationElement: RelationElement;
      supportsColumnEditing?: boolean;
      addColumn(name: string): void;
      removeColumn(index: number): void;
      updateColumn(index: number, name: string): void;
      addRow(): void;
      removeRow(index: number): void;
      updateRow(rowIndex: number, columnIndex: number, value: string): void;
      clearAllData(): void;
      exportJSON(): string;
      exportCSV(): string;
      exportSQL(): string;
      importCSV(csvContent: string): void;
    };
    isReadOnly: boolean;
  }) => {
    const { relationElementState, isReadOnly } = props;
    const editorStore = useEditorStore();
    const embeddedData = relationElementState.relationElement;
    const canEditColumns =
      !isReadOnly &&
      (!('supportsColumnEditing' in relationElementState) ||
        relationElementState.supportsColumnEditing !== false);
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'sql'>(
      'json',
    );
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addColumn = (): void => {
      if (canEditColumns) {
        const columnName = `column_${embeddedData.columns.length + 1}`;
        relationElementState.addColumn(columnName);
      }
    };

    const removeColumn = (index: number): void => {
      if (canEditColumns) {
        relationElementState.removeColumn(index);
      }
    };

    const updateColumn = (index: number, value: string): void => {
      if (canEditColumns) {
        const column = embeddedData.columns[index];
        if (column) {
          relationElementState.updateColumn(index, value);
        }
      }
    };

    const addRow = (): void => {
      if (!isReadOnly) {
        relationElementState.addRow();
      }
    };

    const removeRow = (index: number): void => {
      if (!isReadOnly) {
        relationElementState.removeRow(index);
      }
    };

    const updateCellValue = (
      rowIndex: number,
      columnIndex: number,
      value: string,
    ): void => {
      if (!isReadOnly) {
        relationElementState.updateRow(rowIndex, columnIndex, value);
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
            relationElementState.importCSV(csvContent);
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
          content = relationElementState.exportJSON();
          filename = 'test_data.json';
          mimeType = 'application/json';
          break;
        case 'csv':
          content = relationElementState.exportCSV();
          filename = 'test_data.csv';
          mimeType = 'text/csv';
          break;
        case 'sql':
          content = relationElementState.exportSQL();
          filename = 'test_data.sql';
          mimeType = 'text/sql';
          break;
        default:
          content = relationElementState.exportJSON();
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

    const handleClearData = (): void => {
      editorStore.applicationStore.alertService.setActionAlertInfo({
        message: 'Are you sure you want to clear all test data?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Confirm',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: (): void => {
              relationElementState.clearAllData();
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    return (
      <div className="relation-test-data-editor__content">
        <div className="relation-test-data-editor__columns">
          <div className="relation-test-data-editor__section-header">
            <div className="relation-test-data-editor__section-title">
              Column Definitions
            </div>
            <button
              className="btn--icon btn--dark btn--sm"
              onClick={addColumn}
              disabled={!canEditColumns}
              title="Add Column"
            >
              <PlusIcon />
            </button>
          </div>
          <div className="relation-test-data-editor__columns-grid">
            {embeddedData.columns.map((column, index) => (
              <div
                key={`column-${guaranteeNonNullable(index)}`}
                className="relation-test-data-editor__column-row"
              >
                <input
                  className="relation-test-data-editor__column-input"
                  type="text"
                  value={column}
                  onChange={(e) => updateColumn(index, e.target.value)}
                  placeholder="Column Name"
                  disabled={!canEditColumns}
                />
                <button
                  className="btn--icon btn--caution btn--dark btn--sm"
                  onClick={() => removeColumn(index)}
                  disabled={!canEditColumns}
                  title="Remove Column"
                >
                  <TimesIcon />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="relation-test-data-editor__data">
          <div className="relation-test-data-editor__section-header">
            <div className="relation-test-data-editor__section-title">
              Test Data ({embeddedData.rows.length} rows)
            </div>
          </div>
          {embeddedData.rows.length === 0 ? (
            <div className="relation-test-data-editor__empty-data">
              <div className="relation-test-data-editor__empty-text">
                No test data rows. Click &quot;+&quot; below to start entering
                data.
              </div>
            </div>
          ) : (
            <div className="relation-test-data-editor__data-grid">
              <div className="relation-test-data-editor__data-header">
                {embeddedData.columns.map((column) => (
                  <div
                    key={column}
                    className="relation-test-data-editor__data-header-cell"
                  >
                    {column}
                    {/* <span className="relation-test-data-editor__data-type">
                  ({column.type})
                </span> */}
                  </div>
                ))}
                <div className="relation-test-data-editor__data-header-cell relation-test-data-editor__data-actions">
                  Actions
                </div>
              </div>
              {embeddedData.rows.map((row, rowIndex) => (
                <div
                  key={`row-${guaranteeNonNullable(rowIndex)}`}
                  className="relation-test-data-editor__data-row"
                >
                  {embeddedData.columns.map((column, columnIndex) => (
                    <div
                      key={column}
                      className="relation-test-data-editor__data-cell"
                    >
                      <input
                        type="text"
                        value={row.values[columnIndex] ?? ''}
                        onChange={(e) =>
                          updateCellValue(rowIndex, columnIndex, e.target.value)
                        }
                        disabled={isReadOnly}
                        className="relation-test-data-editor__data-input"
                      />
                    </div>
                  ))}
                  <div className="relation-test-data-editor__data-cell relation-test-data-editor__data-actions">
                    <button
                      className="btn--icon btn--caution btn--dark btn--sm"
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

          <div className="relation-test-data-editor__export-controls">
            <div className="relation-test-data-editor__export-controls__btn-group">
              <button
                className="btn--icon btn--dark btn--sm"
                onClick={addRow}
                disabled={isReadOnly || embeddedData.columns.length === 0}
                title="Add Row"
              >
                <PlusIcon />
              </button>

              <button
                className="btn--icon btn--caution btn--dark btn--sm"
                onClick={handleClearData}
                disabled={isReadOnly || embeddedData.rows.length === 0}
                title="Clear All Data"
              >
                <TrashIcon />
              </button>
            </div>
            <div className="relation-test-data-editor__export-format">
              <label htmlFor="exportFormat">Export as:</label>
              <select
                id="exportFormat"
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as 'json' | 'csv' | 'sql')
                }
                disabled={isReadOnly}
                className="relation-test-data-editor__export-select"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="sql">SQL INSERT</option>
              </select>
              <button
                className="btn--icon btn--dark btn--sm"
                onClick={exportData}
                disabled={isReadOnly}
                title={`Export as ${exportFormat.toUpperCase()}`}
              >
                <FileImportIcon />
              </button>
            </div>

            <div className="relation-test-data-editor__import-controls">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={isReadOnly}
              />
              <button
                className="btn--icon btn--dark btn--sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadOnly}
                title="Upload a file of CSV"
              >
                <UploadIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export const RelationElementsDataEditor = observer(
  (props: { dataState: RelationElementsDataState; isReadOnly: boolean }) => {
    const { dataState, isReadOnly } = props;

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.EMBEDDED_DATA_RELATIONAL_EDITOR,
    );

    const addRelationElement = (): void => {
      const doAdd = (): void => {
        if (
          dataState.accessorOptions !== undefined &&
          dataState.availableAccessorOptions.length === 0
        ) {
          dataState.editorStore.applicationStore.notificationService.notifyWarning(
            `All referenced ${dataState.accessorTypeLabel === 'Dataset' ? 'dataset' : 'access point'}s' data is already present`,
          );
          return;
        }
        dataState.setShowNewRelationElementModal(true);
      };
      if (dataState.refreshAccessorOptions) {
        dataState.refreshAccessorOptions().then(doAdd).catch(doAdd);
      } else {
        doAdd();
      }
    };

    const changeRelationElement = (
      newRelationElement: RelationElementState,
    ): void => {
      dataState.setActiveRelationElement(newRelationElement);
    };

    return (
      <div className="panel relation-test-data-editor">
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
        </PanelHeader>
        <PanelContent>
          <div className="panel__header service-editor__header--with-tabs">
            <div className="uml-element-editor__tabs">
              {dataState.relationElementStates.map((relationElementState) => (
                <div
                  key={relationElementState.relationElement.paths.join('.')}
                  onClick={(): void =>
                    changeRelationElement(relationElementState)
                  }
                  className={clsx('service-editor__tab', {
                    'service-editor__tab--active':
                      relationElementState === dataState.activeRelationElement,
                  })}
                >
                  {relationElementState.relationElement.paths.length > 1 ? (
                    <span>
                      {relationElementState.relationElement.paths.join('.')}
                    </span>
                  ) : (
                    <span>{relationElementState.relationElement.paths[0]}</span>
                  )}
                  {!isReadOnly && (
                    <button
                      className="service-editor__tab__close-btn"
                      onClick={(e): void => {
                        e.stopPropagation();
                        dataState.deleteRelationElement(relationElementState);
                      }}
                      title="Delete"
                    >
                      <TimesIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addRelationElement}
              disabled={isReadOnly}
              title="Add Relation Element"
            >
              <PlusIcon />
            </button>
          </div>
          {dataState.relationElementStates.length === 0 ||
          dataState.activeRelationElement === undefined ? (
            <BlankPanelPlaceholder
              text="Add a relation element to define your test data structure"
              onClick={addRelationElement}
              clickActionType="add"
              tooltipText="Add Relation Element"
              disabled={isReadOnly}
            />
          ) : (
            <RelationElementEditor
              relationElementState={dataState.activeRelationElement}
              isReadOnly={isReadOnly}
            />
          )}
        </PanelContent>
        {dataState.showNewRelationElementModal && (
          <NewRelationElementModal
            dataState={dataState}
            isReadOnly={isReadOnly}
          />
        )}
      </div>
    );
  },
);
