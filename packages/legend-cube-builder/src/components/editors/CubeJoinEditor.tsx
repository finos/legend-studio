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
  getDuplicateJoinColumns,
  isJoinType,
  JOIN_TYPE_LABELS,
  JOIN_TYPES,
  planJoinDuplicateFix,
  type Schema,
} from '@finos/legend-cube';
import { guaranteeType, noop } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { READ_ONLY_CUBE_TITLE } from '../../__lib__/LegendCubeLabels.js';
import { CubeJoinDraft } from '../../stores/editors/CubeJoinDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeJoinKeyRows } from './CubeJoinKeyRows.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

/**
 * The Join editor (spec §17.6): the join type, pairs of key columns
 * (`CubeJoinKeyRows`), and Swap Inputs.
 */
export const CubeJoinEditor = observer((props: CubeNodeEditorProps) => {
  const { editorState, inputSchemas, readOnly } = props;
  const draft = guaranteeType(props.draft, CubeJoinDraft);
  const [leftSchema, rightSchema] = inputSchemas as [Schema, Schema];
  const model = editorState.document.context?.model;
  useEffect(() => {
    flowResult(editorState.loadModelOutline()).catch(noop());
  }, [editorState, model]);
  const edited = draft.build();
  const duplicates = getDuplicateJoinColumns(
    leftSchema,
    rightSchema,
    edited.leftColumns,
    edited.rightColumns,
  );
  // the names the autofix would give, to show beside each shared column
  const fix = duplicates.length
    ? planJoinDuplicateFix(edited, leftSchema, rightSchema)
    : undefined;
  return (
    <div className="flex flex-col gap-2 text-base">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2">
          Join type
          <select
            className="h-6 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base"
            value={draft.joinType}
            disabled={readOnly}
            onChange={(event) => {
              if (isJoinType(event.target.value)) {
                draft.setJoinType(event.target.value);
              }
            }}
          >
            {JOIN_TYPES.map((joinType) => (
              <option key={joinType} value={joinType}>
                {JOIN_TYPE_LABELS[joinType]}
              </option>
            ))}
          </select>
        </label>
        <span className="flex-1" />
        <CubeButton
          title="Swap the Left and Right inputs; the join columns follow them. Applies your changes too."
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
      {duplicates.length > 0 && (
        <div className="text-sm text-[var(--color-status-warn)]">
          <div>
            In both inputs and not joined on, so the output can&apos;t keep
            both:
          </div>
          <ul aria-label="Columns in both inputs">
            {duplicates.map((name, index) => (
              <li key={name} className="break-all font-mono">
                {fix
                  ? `${name} → ${fix.left[index]?.to} (Left), ${fix.right[index]?.to} (Right)`
                  : name}
              </li>
            ))}
          </ul>
          <div className="mt-1">
            <CubeButton
              title={
                readOnly
                  ? READ_ONLY_CUBE_TITLE
                  : 'Add a Rename before each input that gives these columns new names. Applies your changes too, as one step to undo.'
              }
              disabled={!editorState.nodeEditor.canRenameDuplicateColumns}
              onClick={() => editorState.nodeEditor.renameDuplicateColumns()}
            >
              Rename them
            </CubeButton>
          </div>
        </div>
      )}
    </div>
  );
});
