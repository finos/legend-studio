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

import { clsx } from '@finos/legend-art';
import { getRelationalDisplayName } from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  CUBE_PENDING_LABEL,
  CUBE_TABLE_FLAG_LABELS,
} from '../../__lib__/LegendCubeLabels.js';
import {
  type CubeInlineModelTabState,
  isTableSelectable,
} from '../../stores/source-picker/CubeInlineModelTabState.js';
import { CubeButton } from '../CubeButton.js';
import { CubePickerStep } from './CubePickerStep.js';

/** The Model option that offers a text box for Pure text */
const PASTE_MODEL_OPTION = 'paste';

/**
 * The source dialog's Model tab (PLAN §6.2.7): a model, then a database, a
 * runtime keyed by it, a schema and a table. The dialog's Add adds the table.
 */
export const CubeInlineModelTab = observer(
  (props: { tab: CubeInlineModelTabState }) => {
    const { tab } = props;
    const { applicationStore } = tab.editorState.host;
    const isFixed = tab.fixedContext !== undefined;
    const fixedModelLabel =
      tab.models.find(
        (model) =>
          JSON.stringify(model.model) ===
          JSON.stringify(tab.fixedContext?.model),
      )?.label ?? "The cube's model";
    return (
      <div className="flex flex-col gap-2">
        <CubePickerStep
          label="Model"
          value={
            isFixed
              ? 'fixed'
              : tab.isPastingModel
                ? PASTE_MODEL_OPTION
                : tab.models.find((model) => model.model === tab.model)?.id
          }
          options={
            isFixed
              ? [{ value: 'fixed', label: fixedModelLabel }]
              : [
                  ...tab.models.map((model) => ({
                    value: model.id,
                    label: model.label,
                  })),
                  {
                    value: PASTE_MODEL_OPTION,
                    label: 'Paste Pure model…',
                  },
                ]
          }
          disabled={isFixed}
          onChange={(id) => {
            if (id === PASTE_MODEL_OPTION) {
              tab.startPastingModel();
              return;
            }
            const model = tab.models.find((candidate) => candidate.id === id);
            if (model) {
              flowResult(tab.selectModel(model.model)).catch(
                applicationStore.alertUnhandledError,
              );
            }
          }}
        />
        {tab.isPastingModel && !isFixed && (
          <div className="flex flex-col gap-1">
            <textarea
              className="h-40 w-full resize-y rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] p-1 font-mono text-sm text-[var(--color-text-primary)]"
              aria-label="Pure model"
              placeholder={
                '###Relational\nDatabase my::Database ( … )\n\n###Runtime\nRuntime my::Runtime { … }'
              }
              spellCheck={false}
              value={tab.pastedModelText}
              onChange={(event) => tab.setPastedModelText(event.target.value)}
            />
            <div className="flex items-center gap-2">
              <CubeButton
                disabled={!tab.pastedModelText.trim() || tab.isLoadingModel}
                onClick={() => {
                  flowResult(tab.loadPastedModel()).catch(
                    applicationStore.alertUnhandledError,
                  );
                }}
              >
                Load model
              </CubeButton>
              <span className="text-sm text-[var(--color-text-muted)]">
                The cube keeps the model&apos;s text, which counts towards the 1
                MiB a cube spec can hold.
              </span>
            </div>
          </div>
        )}
        {tab.isLoadingModel && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.LOADING_MODEL}
          </div>
        )}
        <CubePickerStep
          label="Database"
          value={tab.databasePath}
          options={tab.databases.map((database) => ({
            value: database.path,
            label: database.path,
          }))}
          disabled={tab.fixedDatabasePath !== undefined}
          onChange={(path) => tab.selectDatabase(path)}
        />
        <CubePickerStep
          label="Runtime"
          value={tab.runtimePath}
          options={tab.runtimes.map((runtime) => ({
            value: runtime.path,
            label: runtime.path,
          }))}
          disabled={tab.fixedContext?.runtime !== undefined}
          onChange={(path) => tab.selectRuntime(path)}
        />
        <CubePickerStep
          label="Schema"
          value={tab.schemaName}
          options={tab.schemas.map((schema) => ({
            value: schema.name,
            label: getRelationalDisplayName(schema.name),
          }))}
          onChange={(name) => tab.selectSchema(name)}
        />
        {tab.schemaName !== undefined && (
          <div className="flex flex-col gap-1">
            <input
              className="h-7 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]"
              placeholder="Search tables"
              aria-label="Search tables"
              value={tab.tableSearch}
              onChange={(event) => tab.setTableSearch(event.target.value)}
            />
            <ul
              className="h-56 overflow-auto rounded-sm border border-[var(--color-border-subtle)]"
              aria-label="Tables"
            >
              {tab.tables.map((table) => {
                const selectable = isTableSelectable(table);
                const isPicked = tab.tableName === table.name;
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
                      onClick={() => tab.selectTable(table.name)}
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
        {tab.isResolving && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.RESOLVING_SOURCE}
          </div>
        )}
        {tab.error !== undefined && (
          <div
            className="text-base text-[var(--color-status-error)]"
            role="alert"
          >
            {tab.error}
          </div>
        )}
      </div>
    );
  },
);
