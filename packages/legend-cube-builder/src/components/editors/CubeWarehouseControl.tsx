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

import type { CubeContext } from '@finos/legend-cube';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  CUBE_WAREHOUSE_APPLY_TITLE,
  getCubeWarehouseErrorHint,
} from '../../__lib__/LegendCubeDataProductLabels.js';
import { READ_ONLY_CUBE_TITLE } from '../../__lib__/LegendCubeLabels.js';
import {
  CubeDataProductRunErrorKind,
  type CubeDataProductRuntimeState,
} from '../../stores/CubeDataProductRuntimeState.js';
import { CubeButton } from '../CubeButton.js';

/**
 * The warehouse a lakehouse cube runs on, edited in place: Apply, or Enter,
 * runs the cube on another one, as one undo step. Text typed but not
 * applied belongs to the cube's context it was typed on; once the context
 * changes, e.g. on Undo, the control shows the cube's warehouse again.
 * Below it, after a run the warehouse failed, what to do about it
 */
export const CubeWarehouseControl = observer(
  (props: { runtime: CubeDataProductRuntimeState; readOnly: boolean }) => {
    const { runtime, readOnly } = props;
    const { context } = runtime.editorState.document;
    const current = runtime.effectiveWarehouse ?? '';
    const [draft, setDraft] = useState<
      { context: CubeContext | undefined; text: string } | undefined
    >();
    const text =
      draft !== undefined && draft.context === context ? draft.text : current;
    const disabled = readOnly || !runtime.canEditWarehouse;
    const canApply =
      !disabled && text.trim().length > 0 && text.trim() !== current;
    const apply = (): void => {
      if (canApply && runtime.setWarehouse(text)) {
        setDraft(undefined);
      }
    };
    return (
      <>
        <span className="flex min-w-0 items-center gap-1">
          <input
            className="h-6 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]"
            aria-label="Warehouse"
            spellCheck={false}
            disabled={disabled}
            title={readOnly ? READ_ONLY_CUBE_TITLE : undefined}
            value={text}
            onChange={(event) =>
              setDraft({ context, text: event.target.value })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                apply();
              }
            }}
          />
          <CubeButton
            title={readOnly ? READ_ONLY_CUBE_TITLE : CUBE_WAREHOUSE_APPLY_TITLE}
            disabled={!canApply}
            onClick={apply}
          >
            Apply
          </CubeButton>
        </span>
        {runtime.runErrorKind === CubeDataProductRunErrorKind.WAREHOUSE && (
          <span
            className="mt-1 block text-sm text-[var(--color-status-error)]"
            role="alert"
          >
            {getCubeWarehouseErrorHint(current, runtime.canEditWarehouse)}
          </span>
        )}
      </>
    );
  },
);
