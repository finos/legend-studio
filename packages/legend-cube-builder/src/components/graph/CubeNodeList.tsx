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

import type { QueryNode } from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../../stores/CubeEditorState.js';
import { CubeButton } from '../CubeButton.js';

const CubeNodeRow = observer(
  (props: { editorState: CubeEditorState; node: QueryNode }) => {
    const { editorState, node } = props;
    const { query } = editorState.document;
    const isCapture = query.selected === node.id;
    const hostIssue = editorState.hostIssues.get(node.id);
    const errors = [
      ...(editorState.analysis.validity.get(node.id) ?? []),
      ...(hostIssue ? [hostIssue.firstLine] : []),
    ];
    return (
      <li
        className="flex items-start gap-2 border-b border-[var(--color-border-subtle)] px-2 py-1.5"
        data-testid={LEGEND_CUBE_TEST_ID.NODE_ROW}
        aria-current={isCapture}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-base">{node.describe()}</span>
            <span className="text-sm text-[var(--color-text-muted)]">
              {node.id}
            </span>
          </div>
          {errors.map((error) => (
            <div
              key={error}
              className="text-sm text-[var(--color-status-error)]"
              role="alert"
            >
              {error}
            </div>
          ))}
        </div>
        {isCapture ? (
          <span
            className="h-6 shrink-0 px-2 text-base leading-6 text-[var(--color-text-secondary)]"
            title="Execute runs the query up to this node"
          >
            (Selected)
          </span>
        ) : (
          <CubeButton
            title="Run the query up to this node"
            onClick={() => editorState.select(node.id)}
          >
            Select
          </CubeButton>
        )}
      </li>
    );
  },
);

/**
 * The query's nodes as a list, until the canvas replaces it (PLAN §7.8,
 * Settled before M1.8): each with its description, its errors and engine
 * errors, and Select to make it the node Execute runs.
 */
export const CubeNodeList = observer(
  (props: { editorState: CubeEditorState; emptyState: React.ReactNode }) => {
    const { editorState, emptyState } = props;
    const { nodes } = editorState.document.query;
    if (!nodes.length) {
      return (
        <div className="flex h-full items-center justify-center p-4 text-base text-[var(--color-text-secondary)]">
          {emptyState}
        </div>
      );
    }
    return (
      <ul className="overflow-auto" data-testid={LEGEND_CUBE_TEST_ID.NODE_LIST}>
        {nodes.map((node) => (
          <CubeNodeRow key={node.key} editorState={editorState} node={node} />
        ))}
      </ul>
    );
  },
);
