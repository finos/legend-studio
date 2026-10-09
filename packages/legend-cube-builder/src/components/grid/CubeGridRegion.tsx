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

import { PanelLoadingIndicator } from '@finos/legend-art';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { EXECUTE_SHORTCUT_LABEL } from '../../__lib__/LegendCubeCommand.js';
import { getCubeWarehouseErrorHint } from '../../__lib__/LegendCubeDataProductLabels.js';
import {
  CUBE_PENDING_LABEL,
  formatDisabledReasons,
  getRowLimitError,
  getTruncationMessage,
  ROW_LIMIT_WARNING_THRESHOLD,
} from '../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  CubeDataProductRunErrorKind,
  type CubeDataProductRuntimeState,
} from '../../stores/CubeDataProductRuntimeState.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeButton } from '../CubeButton.js';
import { CubeResultGrid } from './CubeResultGrid.js';
import { formatDuration } from './CubeGridValues.js';

/** The first line of an error is shown, at most this long; the rest is under Details */
const MAX_ERROR_LINE_LENGTH = 500;

const CubeRowLimitInput = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const [draft, setDraft] = useState(String(editorState.rowLimit));
    const [error, setError] = useState<string | undefined>();
    const commit = (): void => {
      const problem = getRowLimitError(draft);
      setError(problem);
      if (!problem) {
        editorState.setRowLimit(Number(draft.trim()));
      }
    };
    return (
      <div className="flex items-center gap-1">
        <label className="flex items-center gap-1 text-base">
          Rows
          <input
            className="h-6 w-20 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-right text-base text-[var(--color-text-primary)]"
            aria-label="Row limit"
            aria-invalid={error !== undefined}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                commit();
              }
            }}
          />
        </label>
        {error !== undefined && (
          <span
            className="text-sm text-[var(--color-status-error)]"
            role="alert"
          >
            {error}
          </span>
        )}
        {error === undefined &&
          editorState.rowLimit > ROW_LIMIT_WARNING_THRESHOLD && (
            <span className="text-sm text-[var(--color-status-warn)]">
              A large row limit can slow the page down.
            </span>
          )}
      </div>
    );
  },
);

const CubeGridToolbar = observer(
  (props: {
    editorState: CubeEditorState;
    showSql: boolean;
    onToggleSql: () => void;
  }) => {
    const { editorState, showSql, onToggleSql } = props;
    const { execution, host } = editorState;
    const { applicationStore } = host;
    const { result } = execution;
    const disabledReasons = execution.disabledReasons;
    const execute = (): void => {
      flowResult(execution.execute()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    return (
      <div
        className="flex h-8 shrink-0 items-center gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-panel-header)] px-2"
        data-testid={LEGEND_CUBE_TEST_ID.GRID_TOOLBAR}
      >
        {execution.isRunning ? (
          <CubeButton title="Stop the run" onClick={() => execution.stop()}>
            Stop
          </CubeButton>
        ) : (
          <CubeButton
            primary={true}
            disabled={!execution.canExecute}
            title={
              disabledReasons.length
                ? `${formatDisabledReasons(disabledReasons)}\n(${EXECUTE_SHORTCUT_LABEL})`
                : `Run the query up to the selected node (${EXECUTE_SHORTCUT_LABEL})`
            }
            onClick={execute}
          >
            Execute
          </CubeButton>
        )}
        <CubeRowLimitInput editorState={editorState} />
        {execution.isRunning && (
          <span className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.EXECUTING_QUERY}
          </span>
        )}
        {execution.isStale && (
          <span
            className="rounded-sm bg-[var(--color-status-warn-bg)] px-1 text-base text-[var(--color-status-warn)]"
            title="The query, the warehouse or the row limit changed since this run"
          >
            Stale: execute again to refresh
          </span>
        )}
        {result && !execution.isRunning && (
          <>
            <span className="text-base text-[var(--color-text-secondary)]">
              {`${result.rows.length.toLocaleString('en-US')} row${result.rows.length === 1 ? '' : 's'} in ${formatDuration(result.durationMs)}`}
            </span>
            {result.limited && (
              <span className="text-base text-[var(--color-status-warn)]">
                {getTruncationMessage(result.rowLimit)}
              </span>
            )}
            {result.sql.length > 0 && (
              <CubeButton aria-expanded={showSql} onClick={onToggleSql}>
                {showSql ? 'Hide SQL' : 'Show SQL'}
              </CubeButton>
            )}
          </>
        )}
      </div>
    );
  },
);

/** The SQL the run's database ran, with Copy */
const CubeSqlPanel = observer((props: { editorState: CubeEditorState }) => {
  const { editorState } = props;
  const { applicationStore } = editorState.host;
  const sql = editorState.execution.result?.sql ?? [];
  if (!sql.length) {
    return null;
  }
  const copySql = (): void => {
    applicationStore.clipboardService
      .copyTextToClipboard(sql.join('\n\n'))
      .catch(applicationStore.alertUnhandledError);
  };
  return (
    <div
      className="flex max-h-40 shrink-0 gap-2 overflow-auto border-b border-[var(--color-border-default)] p-2"
      data-testid={LEGEND_CUBE_TEST_ID.SQL_PANEL}
    >
      <div className="min-w-0 flex-1">
        {sql.map((statement, index) => (
          <pre
            // statements hold no state, and the same one may run twice
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="whitespace-pre-wrap font-mono text-sm"
          >
            {statement}
          </pre>
        ))}
      </div>
      <CubeButton onClick={copySql}>Copy SQL</CubeButton>
    </div>
  );
});

/**
 * On a data product cube, what to do about a run refused for its warehouse,
 * or for lack of access to the data: links to ask for it in the marketplace
 */
const CubeDataProductRunErrorHelp = observer(
  (props: { runtime: CubeDataProductRuntimeState }) => {
    const { runtime } = props;
    if (runtime.runErrorKind === CubeDataProductRunErrorKind.WAREHOUSE) {
      return (
        <div className="mt-1 text-[var(--color-text-secondary)]">
          {getCubeWarehouseErrorHint(runtime.effectiveWarehouse ?? '')}
        </div>
      );
    }
    const links = runtime.accessRequestLinks;
    return links.length ? (
      <div className="mt-1 flex flex-wrap gap-x-3">
        {links.map((link) => (
          <a
            key={link.key}
            className="text-[var(--color-accent)] underline"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {link.label}
          </a>
        ))}
      </div>
    ) : null;
  },
);

const CubeExecutionError = observer(
  (props: { editorState: CubeEditorState }) => {
    const error = props.editorState.execution.error;
    if (!error) {
      return null;
    }
    const isCut = error.firstLine.length > MAX_ERROR_LINE_LENGTH;
    const firstLine = isCut
      ? `${error.firstLine.slice(0, MAX_ERROR_LINE_LENGTH)}…`
      : error.firstLine;
    return (
      <div
        className="m-2 rounded-sm border border-[var(--color-status-error)] bg-[var(--color-status-error-bg)] p-2 text-base"
        data-testid={LEGEND_CUBE_TEST_ID.EXECUTION_ERROR}
        role="alert"
      >
        <div
          className="font-medium text-[var(--color-status-error)]"
          title={isCut ? error.firstLine : undefined}
        >
          {firstLine}
        </div>
        {(isCut || error.detail !== error.firstLine) && (
          <details className="mt-1">
            <summary className="cursor-pointer text-[var(--color-text-secondary)]">
              Details
            </summary>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap text-sm">
              {error.detail}
            </pre>
          </details>
        )}
        <CubeDataProductRunErrorHelp
          runtime={props.editorState.dataProductRuntime}
        />
      </div>
    );
  },
);

/** The results: Execute, the row limit and the run's stats above the grid (PLAN §9) */
export const CubeGridRegion = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { execution, host } = editorState;
    const [showSql, setShowSql] = useState(false);
    const darkMode =
      !host.applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    return (
      <div
        className="flex h-full flex-col bg-[var(--color-bg-panel)]"
        data-testid={LEGEND_CUBE_TEST_ID.GRID_REGION}
      >
        <PanelLoadingIndicator isLoading={execution.isRunning} />
        <CubeGridToolbar
          editorState={editorState}
          showSql={showSql}
          onToggleSql={() => setShowSql(!showSql)}
        />
        {showSql && !execution.isRunning && (
          <CubeSqlPanel editorState={editorState} />
        )}
        <div className="min-h-0 flex-1">
          {execution.error ? (
            <CubeExecutionError editorState={editorState} />
          ) : execution.result ? (
            <CubeResultGrid
              key={execution.result.id}
              editorState={editorState}
              result={execution.result}
              darkMode={darkMode}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-base text-[var(--color-text-secondary)]">
              Execute the query to see its rows.
            </div>
          )}
        </div>
      </div>
    );
  },
);
