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
import {
  getRelationalDisplayName,
  RelationalTableSource,
} from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  CUBE_DIRECT_CONNECTION_FALLBACK_LABEL,
  getCubeConnectionSummaryLabel,
} from '../../__lib__/LegendCubeDirectConnectionLabels.js';
import {
  CUBE_PENDING_LABEL,
  getColumnTypeLabel,
} from '../../__lib__/LegendCubeLabels.js';
import { getCubeDirectConnection } from '../../graph-manager/CubeDirectConnection.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnTypeIcon } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/**
 * A table source (spec §17.6): where it reads from, its columns as the engine
 * typed them, and Refresh, which types the table again. Nothing here is
 * edited, so a refresh is no undo step.
 */
export const CubeSourceEditor = observer((props: CubeNodeEditorProps) => {
  const { editorState } = props;
  const source = guaranteeType(props.draft.original, RelationalTableSource);
  const refreshing = editorState.isPendingSource(source);
  const { resolution } = source;
  // a direct cube's tables all belong to a Database Cube builds: its
  // connection says where they come from (PLAN §6.8)
  const model = editorState.document.context?.model;
  const connection = model ? getCubeDirectConnection(model) : undefined;
  const description =
    connection &&
    editorState.host.connectionExplorer?.describeConnection(connection);
  return (
    <div className="relative flex flex-col gap-2">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-base">
        {connection ? (
          <>
            <dt className="text-[var(--color-text-secondary)]">Connection</dt>
            <dd className="min-w-0 break-words">
              {description?.supported
                ? getCubeConnectionSummaryLabel(description.summary)
                : CUBE_DIRECT_CONNECTION_FALLBACK_LABEL}
            </dd>
          </>
        ) : (
          <>
            <dt className="text-[var(--color-text-secondary)]">Database</dt>
            <dd className="min-w-0 break-all">{source.database}</dd>
          </>
        )}
        <dt className="text-[var(--color-text-secondary)]">Schema</dt>
        <dd>{getRelationalDisplayName(source.schema)}</dd>
        <dt className="text-[var(--color-text-secondary)]">Table</dt>
        <dd>{getRelationalDisplayName(source.table)}</dd>
      </dl>
      <div className="flex items-center gap-2">
        <CubeButton
          title="Type the table again with the engine, e.g. after its columns changed"
          disabled={refreshing}
          onClick={() => {
            flowResult(editorState.refreshSource(source.id)).catch(
              editorState.host.applicationStore.alertUnhandledError,
            );
          }}
        >
          Refresh
        </CubeButton>
        {refreshing && (
          <span className="text-base text-[var(--color-text-secondary)]">
            {CUBE_PENDING_LABEL.REFRESHING_SOURCE}
          </span>
        )}
      </div>
      <PanelLoadingIndicator isLoading={refreshing} />
      {resolution.kind === 'resolved' ? (
        <table className="w-full text-base" aria-label="Columns">
          <thead>
            <tr className="text-left text-[var(--color-text-secondary)]">
              <th className="font-normal">Column</th>
              <th className="font-normal">Type</th>
            </tr>
          </thead>
          <tbody>
            {resolution.schema.columns.map((column) => (
              <tr key={column.name}>
                <td className="break-all pr-2">{column.name}</td>
                <td title={column.type.fullName}>
                  <span className="flex items-center gap-1">
                    <CubeColumnTypeIcon
                      type={column.type}
                      className="text-[var(--color-text-secondary)]"
                    />
                    {getColumnTypeLabel(column)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-base text-[var(--color-text-secondary)]">
          {resolution.kind === 'failed'
            ? resolution.message
            : 'The table has not been typed yet.'}
        </div>
      )}
    </div>
  );
});
