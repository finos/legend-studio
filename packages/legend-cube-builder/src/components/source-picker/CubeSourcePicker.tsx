/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import {
  clsx,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  ModalHeader,
} from '@finos/legend-art';
import { getRelationalDisplayName } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import {
  CUBE_PENDING_LABEL,
  CUBE_TABLE_FLAG_LABELS,
} from '../../__lib__/LegendCubeLabels.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { isTableSelectable } from '../../stores/CubeSourcePickerState.js';

/** One step of the picker: a labelled list of choices, read-only when the cube fixes it */
const CubePickerStep: React.FC<{
  label: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}> = ({ label, value, options, disabled, onChange }) => {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label className="w-20 shrink-0 text-base" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="h-7 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]"
        value={value ?? ''}
        disabled={Boolean(disabled) || !options.length}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        {value === undefined && <option value="">Choose…</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Adds a table to the cube (PLAN §6.2.7): a minimal dialog, which M3
 * redesigns. The table lands with its schema; the first one fixes the cube's
 * model and runtime.
 */
export const CubeSourcePicker = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const picker = editorState.sourcePicker;
    const { applicationStore } = editorState.host;
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const isFixed = picker.fixedContext !== undefined;
    const fixedModelLabel =
      picker.models.find(
        (model) =>
          JSON.stringify(model.model) ===
          JSON.stringify(picker.fixedContext?.model),
      )?.label ?? "The cube's model";
    const confirm = (): void => {
      flowResult(picker.confirm()).catch(applicationStore.alertUnhandledError);
    };

    return (
      <Dialog open={picker.isOpen} onClose={() => picker.close()}>
        <Modal darkMode={darkMode} className="w-[640px] max-w-full">
          <ModalHeader>
            <div className="modal__title">Add a table</div>
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-2">
              <CubePickerStep
                label="Model"
                value={
                  isFixed
                    ? 'fixed'
                    : picker.models.find(
                        (model) => model.model === picker.model,
                      )?.id
                }
                options={
                  isFixed
                    ? [{ value: 'fixed', label: fixedModelLabel }]
                    : picker.models.map((model) => ({
                        value: model.id,
                        label: model.label,
                      }))
                }
                disabled={isFixed}
                onChange={(id) => {
                  const model = picker.models.find(
                    (candidate) => candidate.id === id,
                  );
                  if (model) {
                    flowResult(picker.selectModel(model.model)).catch(
                      applicationStore.alertUnhandledError,
                    );
                  }
                }}
              />
              {picker.isLoadingModel && (
                <div className="text-base text-[var(--color-text-secondary)]">
                  {CUBE_PENDING_LABEL.LOADING_MODEL}
                </div>
              )}
              <CubePickerStep
                label="Database"
                value={picker.databasePath}
                options={picker.databases.map((database) => ({
                  value: database.path,
                  label: database.path,
                }))}
                disabled={picker.fixedDatabasePath !== undefined}
                onChange={(path) => picker.selectDatabase(path)}
              />
              <CubePickerStep
                label="Runtime"
                value={picker.runtimePath}
                options={picker.runtimes.map((runtime) => ({
                  value: runtime.path,
                  label: runtime.path,
                }))}
                disabled={picker.fixedContext?.runtime !== undefined}
                onChange={(path) => picker.selectRuntime(path)}
              />
              <CubePickerStep
                label="Schema"
                value={picker.schemaName}
                options={picker.schemas.map((schema) => ({
                  value: schema.name,
                  label: getRelationalDisplayName(schema.name),
                }))}
                onChange={(name) => picker.selectSchema(name)}
              />
              {picker.schemaName !== undefined && (
                <div className="flex flex-col gap-1">
                  <input
                    className="h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]"
                    placeholder="Search tables"
                    aria-label="Search tables"
                    value={picker.tableSearch}
                    onChange={(event) =>
                      picker.setTableSearch(event.target.value)
                    }
                  />
                  <ul
                    className="h-56 overflow-auto rounded-sm border border-[var(--color-border-subtle)]"
                    aria-label="Tables"
                  >
                    {picker.tables.map((table) => {
                      const selectable = isTableSelectable(table);
                      const isPicked = picker.tableName === table.name;
                      return (
                        <li key={table.name}>
                          <button
                            type="button"
                            className={clsx(
                              'flex w-full items-center gap-2 px-2 py-1 text-left text-base enabled:hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]',
                              { 'bg-[var(--color-bg-selected)]': isPicked },
                            )}
                            aria-pressed={isPicked}
                            disabled={!selectable}
                            onClick={() => picker.selectTable(table.name)}
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {getRelationalDisplayName(table.name)}
                            </span>
                            {table.flags.map((flag) => (
                              <span
                                key={flag}
                                className="rounded-sm bg-[var(--color-status-warn-bg)] px-1 text-sm text-[var(--color-status-warn)]"
                                title={CUBE_TABLE_FLAG_LABELS[flag].description}
                              >
                                {CUBE_TABLE_FLAG_LABELS[flag].label}
                              </span>
                            ))}
                            <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                              {table.columnCount} columns
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {picker.isResolving && (
                <div className="text-base text-[var(--color-text-secondary)]">
                  {CUBE_PENDING_LABEL.RESOLVING_SOURCE}
                </div>
              )}
              {picker.error !== undefined && (
                <div
                  className="text-base text-[var(--color-status-error)]"
                  role="alert"
                >
                  {picker.error}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              text="Add"
              disabled={!picker.canConfirm}
              onClick={confirm}
            />
            <ModalFooterButton
              darkMode={darkMode}
              formatText={false}
              type="secondary"
              text="Cancel"
              onClick={() => picker.close()}
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);
