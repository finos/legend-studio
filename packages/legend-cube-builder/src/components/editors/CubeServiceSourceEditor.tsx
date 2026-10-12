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

import { ServiceSource } from '@finos/legend-cube';
import { PanelLoadingIndicator } from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { CUBE_PENDING_LABEL } from '../../__lib__/LegendCubeLabels.js';
import { CubeButton } from '../CubeButton.js';
import { CubeSchemaColumnsTable } from '../CubeSchemaColumnsTable.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/**
 * A service (PLAN §6.4), in progress: which service it is, its columns once
 * Cube can read services, else why it can't, and Refresh, which types it
 * again
 */
export const CubeServiceSourceEditor = observer(
  (props: CubeNodeEditorProps) => {
    const { editorState } = props;
    const source = guaranteeType(props.draft.original, ServiceSource);
    const { resolution } = source;
    const refreshing = editorState.isPendingSource(source);
    return (
      <div className="relative flex flex-col gap-2">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-base">
          <dt className="text-[var(--color-text-secondary)]">Service</dt>
          <dd className="min-w-0 break-all">{source.service}</dd>
          <dt className="text-[var(--color-text-secondary)]">Pattern</dt>
          <dd className="min-w-0 break-all">{source.pattern}</dd>
        </dl>
        <div className="flex items-center gap-2">
          <CubeButton
            title="Read the service's columns again"
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
          <CubeSchemaColumnsTable schema={resolution.schema} />
        ) : (
          <div className="whitespace-pre-wrap text-base text-[var(--color-text-secondary)]">
            {resolution.kind === 'failed'
              ? resolution.message
              : 'The service has not been typed yet.'}
          </div>
        )}
      </div>
    );
  },
);
