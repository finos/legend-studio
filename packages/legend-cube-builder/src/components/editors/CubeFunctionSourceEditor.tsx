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
  FunctionSource,
  getFunctionParameterValueError,
} from '@finos/legend-cube';
import { PanelLoadingIndicator } from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useId } from 'react';
import { CUBE_PENDING_LABEL } from '../../__lib__/LegendCubeLabels.js';
import { CubeFunctionDraft } from '../../stores/editors/CubeFunctionDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeSchemaColumnsTable } from '../CubeSchemaColumnsTable.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const INPUT_CLASS =
  'h-7 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]';

const CubeFunctionValueInput = observer(
  (props: { draft: CubeFunctionDraft; index: number; readOnly: boolean }) => {
    const { draft, index, readOnly } = props;
    const id = useId();
    const parameter = draft.original.parameters[index];
    if (!parameter) {
      return null;
    }
    const error = getFunctionParameterValueError(
      parameter,
      draft.values[index],
    );
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <label className="w-24 shrink-0 truncate text-base" htmlFor={id}>
            {parameter.name}
          </label>
          <input
            id={id}
            className={INPUT_CLASS}
            placeholder={`${parameter.type.displayName}${parameter.optional ? ', optional' : ''}`}
            disabled={readOnly}
            aria-invalid={error !== undefined}
            value={draft.valueTexts[index] ?? ''}
            onChange={(event) => draft.setValueText(index, event.target.value)}
          />
        </div>
        {error !== undefined && (
          <span className="pl-[6.5rem] text-sm text-[var(--color-status-error)]">
            {error}
          </span>
        )}
      </div>
    );
  },
);

/**
 * A function source (PLAN §6.5): the function, the runtime the cube runs
 * on, a value for each parameter, which Apply stores, its columns, and
 * Refresh, which types it again
 */
export const CubeFunctionSourceEditor = observer(
  (props: CubeNodeEditorProps) => {
    const { editorState, readOnly } = props;
    const draft = guaranteeType(props.draft, CubeFunctionDraft);
    const source = guaranteeType(draft.original, FunctionSource);
    const { resolution } = source;
    const refreshing = editorState.isPendingSource(source);
    return (
      <div className="relative flex flex-col gap-2">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-base">
          <dt className="text-[var(--color-text-secondary)]">Function</dt>
          <dd className="min-w-0 break-all" title={source.signature}>
            {source.function}
          </dd>
          <dt className="text-[var(--color-text-secondary)]">Runtime</dt>
          <dd className="min-w-0 break-all">
            {editorState.document.context?.runtime ?? ''}
          </dd>
        </dl>
        {source.parameters.map((parameter, index) => (
          <CubeFunctionValueInput
            key={parameter.name}
            draft={draft}
            index={index}
            readOnly={readOnly}
          />
        ))}
        <div className="flex items-center gap-2">
          <CubeButton
            title="Read the function's columns again"
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
              : 'The function has not been typed yet.'}
          </div>
        )}
      </div>
    );
  },
);
