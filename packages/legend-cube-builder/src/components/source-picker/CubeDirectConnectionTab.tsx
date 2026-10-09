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
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import {
  CUBE_DIRECT_HELP_TEXT,
  CUBE_DIRECT_PENDING_LABEL,
  getCubeConnectionSummaryLabel,
  getHiddenColumnsLabel,
} from '../../__lib__/LegendCubeDirectConnectionLabels.js';
import {
  CUBE_PENDING_LABEL,
  CUBE_TABLE_FLAG_LABELS,
} from '../../__lib__/LegendCubeLabels.js';
import { CubeDirectDatabaseType } from '../../graph-manager/CubeConnectionExplorer.js';
import {
  type CubeDirectConnectionTabState,
  isExploredTableSelectable,
} from '../../stores/source-picker/CubeDirectConnectionTabState.js';
import { CubeButton } from '../CubeButton.js';
import { CubePickerStep } from './CubePickerStep.js';

const INPUT_CLASS =
  'rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)]';

/** The databases a direct connection can reach this round, as the form offers them (R44) */
const DATABASE_TYPE_OPTIONS = [
  { value: CubeDirectDatabaseType.H2, label: 'H2' },
  { value: CubeDirectDatabaseType.DUCKDB, label: 'DuckDB' },
];

/** The form of a connection the cube doesn't have yet */
const CubeConnectionForm = observer(
  (props: { tab: CubeDirectConnectionTabState }) => {
    const { tab } = props;
    const setupSqlId = useId();
    const pathId = useId();
    return (
      <div className="flex flex-col gap-2">
        <CubePickerStep
          label="Database"
          value={tab.databaseType}
          options={DATABASE_TYPE_OPTIONS}
          onChange={(value) => {
            if (value) {
              tab.setDatabaseType(value as CubeDirectDatabaseType);
            }
          }}
        />
        {tab.databaseType === CubeDirectDatabaseType.DUCKDB && (
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-base" htmlFor={pathId}>
              File
            </label>
            <input
              id={pathId}
              className={clsx(INPUT_CLASS, 'h-7 min-w-0 flex-1')}
              placeholder="In memory"
              title={CUBE_DIRECT_HELP_TEXT.DUCKDB_PATH}
              spellCheck={false}
              value={tab.duckDbPath}
              onChange={(event) => tab.setDuckDbPath(event.target.value)}
            />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-base" htmlFor={setupSqlId}>
            Setup SQL
          </label>
          <textarea
            id={setupSqlId}
            className={clsx(
              INPUT_CLASS,
              'h-32 w-full resize-y p-1 font-mono text-sm',
            )}
            spellCheck={false}
            value={tab.setupSqlText}
            onChange={(event) => tab.setSetupSqlText(event.target.value)}
          />
          <span className="text-sm text-[var(--color-text-muted)]">
            {CUBE_DIRECT_HELP_TEXT.SETUP_SQL}
          </span>
          {tab.formProblem !== undefined && (
            <span className="text-sm text-[var(--color-status-warn)]">
              {tab.formProblem}
            </span>
          )}
        </div>
      </div>
    );
  },
);

/**
 * The source picker's database connection tab (PLAN §6.8): a connection,
 * tested by listing its schemas, then a schema's tables. The picker's own
 * Add button adds the picked table.
 */
export const CubeDirectConnectionTab = observer(
  (props: { tab: CubeDirectConnectionTabState }) => {
    const { tab } = props;
    const { applicationStore } = tab.editorState.host;
    const { description, fixedConnection } = tab;
    return (
      <div className="flex flex-col gap-2">
        {fixedConnection ? (
          <div className="flex flex-col gap-1">
            <div className="text-base" aria-label="Connection">
              {description?.supported
                ? getCubeConnectionSummaryLabel(description.summary)
                : "Cube can't use the cube's connection:"}
            </div>
            {description && !description.supported && (
              <ul className="list-disc pl-5 text-base text-[var(--color-status-error)]">
                {description.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            )}
            <span className="text-sm text-[var(--color-text-muted)]">
              {CUBE_DIRECT_HELP_TEXT.FIXED_CONNECTION}
            </span>
          </div>
        ) : (
          <CubeConnectionForm tab={tab} />
        )}
        <div className="flex items-center gap-2">
          <CubeButton
            disabled={!tab.canTest}
            onClick={() => {
              flowResult(tab.testConnection()).catch(
                applicationStore.alertUnhandledError,
              );
            }}
          >
            {fixedConnection ? 'List schemas' : 'Test connection'}
          </CubeButton>
          {tab.isTesting && (
            <span className="text-base text-[var(--color-text-secondary)]">
              {CUBE_DIRECT_PENDING_LABEL.TESTING_CONNECTION}
            </span>
          )}
        </div>
        {tab.schemas !== undefined && tab.schemas.length > 0 && (
          <CubePickerStep
            label="Schema"
            value={tab.schemaName}
            options={tab.schemas.map((schema) => ({
              value: schema,
              label: schema,
            }))}
            onChange={(name) => tab.selectSchema(name)}
          />
        )}
        {tab.isListing && (
          <div className="text-base text-[var(--color-text-secondary)]">
            {CUBE_DIRECT_PENDING_LABEL.LISTING_TABLES}
          </div>
        )}
        {tab.schemaTables !== undefined && (
          <div className="flex flex-col gap-1">
            <input
              className={clsx(INPUT_CLASS, 'h-7')}
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
                const selectable = isExploredTableSelectable(table);
                const isPicked = tab.tableName === table.storedName;
                const hidden = getHiddenColumnsLabel(table.hiddenColumnCount);
                return (
                  <li key={table.storedName}>
                    <button
                      type="button"
                      className={clsx(
                        'flex w-full items-center gap-2 px-2 py-1 text-left text-base enabled:hover:bg-[var(--color-bg-hover)] disabled:cursor-not-allowed disabled:text-[var(--color-text-disabled)]',
                        { 'bg-[var(--color-bg-selected)]': isPicked },
                      )}
                      aria-pressed={isPicked}
                      disabled={!selectable}
                      onClick={() => tab.selectTable(table.storedName)}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {table.name}
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
                        {hidden !== undefined && `, ${hidden}`}
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
            className="flex flex-col gap-1 text-base text-[var(--color-status-error)]"
            role="alert"
          >
            <span>{tab.error.message}</span>
            {tab.error.detail !== undefined && (
              <details className="text-sm">
                <summary className="cursor-pointer">Details</summary>
                <pre className="whitespace-pre-wrap break-words">
                  {tab.error.detail}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    );
  },
);
