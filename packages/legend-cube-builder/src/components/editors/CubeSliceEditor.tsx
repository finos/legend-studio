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

import { isRowIndex } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { SLICE_RANGE_HINT } from '../../__lib__/LegendCubeLabels.js';
import { CubeSliceDraft } from '../../stores/editors/CubeSliceDraft.js';
import { CubeIntegerField } from './CubeIntegerField.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const START = 'Start row index';
const STOP = 'Stop row index';

/**
 * The Slice editor (spec §17.6): the start and stop row indexes, counting
 * from 0, the start row kept and the stop row not (D5). A cleared field
 * leaves its bound empty, which the panel reports.
 */
export const CubeSliceEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeSliceDraft);
  const { start, stop } = draft;
  const validStart = isRowIndex(start);
  const validStop = isRowIndex(stop);
  // the stop is marked when it doesn't come after the start, too
  const outOfOrder =
    validStart && validStop && (start as number) >= (stop as number);
  return (
    <div className="flex flex-col gap-2 text-base">
      <label className="flex items-center gap-2">
        <span className="w-28">{START}</span>
        <CubeIntegerField
          label={START}
          text={draft.startText}
          invalid={!validStart}
          disabled={readOnly}
          onChange={(text) => draft.setStartText(text)}
        />
      </label>
      <label className="flex items-center gap-2">
        <span className="w-28">{STOP}</span>
        <CubeIntegerField
          label={STOP}
          text={draft.stopText}
          invalid={!validStop || outOfOrder}
          disabled={readOnly}
          onChange={(text) => draft.setStopText(text)}
        />
      </label>
      <div className="text-sm text-[var(--color-text-secondary)]">
        {SLICE_RANGE_HINT}
      </div>
    </div>
  );
});
