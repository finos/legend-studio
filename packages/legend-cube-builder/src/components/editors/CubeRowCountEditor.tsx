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

import { isPositiveWholeNumber, Limit } from '@finos/legend-cube';
import { guaranteeType } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { CubeRowCountDraft } from '../../stores/editors/CubeRowCountDraft.js';
import { CubeIntegerField } from './CubeIntegerField.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/** The field's label for each node type the editor serves */
const ROW_COUNT_LABELS: Readonly<Record<string, string>> = {
  [Limit.TYPE]: 'Rows to keep',
};

/**
 * The editor of a node whose one setting is a number of rows, such as a Limit
 * (spec §17.6: one integer field). Clearing the field leaves the size empty,
 * which the panel reports; it never falls back to the default.
 */
export const CubeRowCountEditor = observer((props: CubeNodeEditorProps) => {
  const { readOnly } = props;
  const draft = guaranteeType(props.draft, CubeRowCountDraft);
  const label = ROW_COUNT_LABELS[draft.original.type] ?? 'Rows';
  return (
    <div className="flex flex-col gap-2 text-base">
      <label className="flex items-center gap-2">
        <span>{label}</span>
        <CubeIntegerField
          label={label}
          text={draft.sizeText}
          invalid={!isPositiveWholeNumber(draft.size)}
          disabled={readOnly}
          onChange={(text) => draft.setSizeText(text)}
        />
      </label>
    </div>
  );
});
