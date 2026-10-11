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

import { observer } from 'mobx-react-lite';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { MAX_CUBE_RUN_STATS } from '../../stores/CubeRunStatsState.js';
import { CubeButton } from '../CubeButton.js';
import { formatDuration } from './CubeGridValues.js';

/** A run's time of day, as the viewer's clock shows it */
const formatTime = (finishedAt: number): string =>
  new Date(finishedAt).toLocaleTimeString();

/**
 * The page's latest runs, newest first (spec §12.6, PLAN §11.10): each
 * Execute, fetch of the grid's rows and export, with when it finished, how
 * long it took, and its SQL to read and copy
 */
export const CubeRunStatsPanel = observer(
  (props: { editorState: CubeEditorState }) => {
    const { editorState } = props;
    const { applicationStore } = editorState.host;
    const { entries } = editorState.runStats;
    const copy = (sql: readonly string[]): void => {
      applicationStore.clipboardService
        .copyTextToClipboard(sql.join('\n\n'))
        .catch(applicationStore.alertUnhandledError);
    };
    return (
      <div
        className="max-h-60 shrink-0 overflow-auto border-b border-[var(--color-border-default)] p-2 text-base"
        data-testid={LEGEND_CUBE_TEST_ID.RUN_STATS}
      >
        {!entries.length ? (
          <div className="text-[var(--color-text-secondary)]">
            Nothing has run yet.
          </div>
        ) : (
          <ol className="flex flex-col gap-1" aria-label="Latest runs">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate" title={entry.label}>
                    {entry.label}
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    {formatTime(entry.finishedAt)}
                  </span>
                  <span className="w-16 text-right text-[var(--color-text-secondary)]">
                    {formatDuration(entry.durationMs)}
                  </span>
                  <CubeButton
                    disabled={!entry.sql.length}
                    title={
                      entry.sql.length
                        ? 'Copy the SQL'
                        : 'The engine gave no SQL for this run'
                    }
                    onClick={() => copy(entry.sql)}
                  >
                    Copy SQL
                  </CubeButton>
                </div>
                {entry.sql.length > 0 && (
                  <details>
                    <summary className="cursor-pointer text-sm text-[var(--color-text-secondary)]">
                      SQL
                    </summary>
                    {entry.sql.map((statement, index) => (
                      <pre
                        // statements hold no state, and the same one may run twice
                        // eslint-disable-next-line react/no-array-index-key
                        key={index}
                        className="whitespace-pre-wrap font-mono text-sm"
                      >
                        {statement}
                      </pre>
                    ))}
                  </details>
                )}
              </li>
            ))}
          </ol>
        )}
        <div className="mt-1 text-sm text-[var(--color-text-muted)]">
          {`The latest ${MAX_CUBE_RUN_STATS} runs on this page are kept.`}
        </div>
      </div>
    );
  },
);
