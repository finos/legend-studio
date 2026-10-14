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

import type { Schema } from '@finos/legend-cube';
import { guaranteeType, noop } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { DIFFERENCE_EDITOR_NOTES } from '../../__lib__/LegendCubeLabels.js';
import {
  CubeDifferenceDraft,
  getDifferenceColumnUnpickableReason,
} from '../../stores/editors/CubeDifferenceDraft.js';
import { joinKeyListsOf } from '../../stores/editors/CubeJoinKeyPairs.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnChecklist } from './CubeColumnChecklist.js';
import { CubeJoinKeyRows } from './CubeJoinKeyRows.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const DIFFERENCE_COLUMNS = 'Difference columns';

/**
 * The Difference editor (spec §17.6, PLAN §11.7): Swap Inputs, pairs of key
 * columns (`CubeJoinKeyRows`), and the Left input's columns to tick as
 * difference columns, those that can't be one shown with the reason.
 */
export const CubeDifferenceEditor = observer((props: CubeNodeEditorProps) => {
  const { editorState, inputSchemas, readOnly } = props;
  const draft = guaranteeType(props.draft, CubeDifferenceDraft);
  const [leftSchema, rightSchema] = inputSchemas as [Schema, Schema];
  const model = editorState.document.context?.model;
  useEffect(() => {
    flowResult(editorState.loadModelOutline()).catch(noop());
  }, [editorState, model]);
  const joinColumns = joinKeyListsOf(draft.pairs).flat();
  return (
    <div className="flex flex-col gap-2 text-base">
      <div className="flex items-center gap-2">
        <span>Join columns</span>
        <span className="flex-1" />
        <CubeButton
          title="Swap the Left and Right inputs; the join columns follow them, so x_1 is then the other input's. Applies your changes too."
          disabled={!editorState.nodeEditor.canSwapInputs}
          onClick={() => editorState.nodeEditor.swapInputs()}
        >
          Swap Inputs
        </CubeButton>
      </div>
      <CubeJoinKeyRows
        editorProps={props}
        draft={draft}
        leftSchema={leftSchema}
        rightSchema={rightSchema}
      />
      <CubeColumnChecklist
        label={DIFFERENCE_COLUMNS}
        schema={leftSchema}
        picked={draft.differenceColumns}
        unpickableReason={(column) =>
          getDifferenceColumnUnpickableReason(column, rightSchema, joinColumns)
        }
        clearTitle="Untick every difference column"
        readOnly={readOnly}
        onToggle={(name) => draft.toggleDifferenceColumn(name, leftSchema)}
        onClear={() => draft.clearDifferenceColumns()}
      />
      <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-[var(--color-text-secondary)]">
        {DIFFERENCE_EDITOR_NOTES.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
});
