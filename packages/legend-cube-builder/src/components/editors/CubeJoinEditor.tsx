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

import { TimesIcon } from '@finos/legend-art';
import {
  areCompatibleTypes,
  getDuplicateJoinColumns,
  isDateOrTimestampType,
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
import {
  CUBE_TABLE_FLAG_LABELS,
  DATE_OR_TIMESTAMP_WARNING,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import { CubeTableFlag } from '../../graph-manager/CubeEngine.js';
import {
  type CubeJoinKeyPair,
  CubeJoinDraft,
  isUntypedColumn,
} from '../../stores/editors/CubeJoinDraft.js';
import { CubeButton } from '../CubeButton.js';
import { CubeColumnPicker } from './CubeColumnPicker.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const TYPE_UNKNOWN = CUBE_TABLE_FLAG_LABELS[CubeTableFlag.TYPE_UNKNOWN];

const CubeJoinKeyRow = observer(
  (props: {
    editorProps: CubeNodeEditorProps;
    draft: CubeJoinDraft;
    pair: CubeJoinKeyPair;
    index: number;
    leftSchema: Schema;
    rightSchema: Schema;
  }) => {
    const { editorProps, draft, pair, index, leftSchema, rightSchema } = props;
    const { editorState, readOnly } = editorProps;
    const { query } = editorState.document;
    const { analysis, modelOutline } = editorState;
    const [leftId, rightId] = query.getInputIds(draft.original.id);
    const leftType = leftSchema.type(pair.left);
    const rightType = rightSchema.type(pair.right);
    const isIncompatible =
      leftType !== undefined &&
      rightType !== undefined &&
      !areCompatibleTypes(leftType, rightType);
    const isUntyped =
      (leftId !== undefined &&
        Boolean(pair.left) &&
        isUntypedColumn(modelOutline, query, analysis, leftId, pair.left)) ||
      (rightId !== undefined &&
        Boolean(pair.right) &&
        isUntypedColumn(modelOutline, query, analysis, rightId, pair.right));
    // a converted Date (Convert types): its dates match timestamps only at midnight
    const isDateOrTimestamp =
      !isIncompatible &&
      [leftType, rightType].some(
        (type) => type !== undefined && isDateOrTimestampType(type),
      );
    const position = index + 1;
    return (
      <li className="flex flex-col gap-1 border-b border-[var(--color-border-subtle)] py-1">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1">
          <CubeColumnPicker
            label={`Left join column ${position}`}
            schema={leftSchema}
            value={pair.left}
            invalid={isIncompatible}
            disabled={readOnly}
            onChange={(name) => draft.setLeftColumn(pair.key, name)}
          />
          <span className="text-[var(--color-text-secondary)]">=</span>
          <CubeColumnPicker
            label={`Right join column ${position}`}
            schema={rightSchema}
            value={pair.right}
            invalid={isIncompatible}
            disabled={readOnly}
            onChange={(name) => draft.setRightColumn(pair.key, name)}
          />
          <button
            className="flex h-6 w-6 items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Remove join columns ${position}`}
            title="Remove these join columns"
            disabled={readOnly}
            onClick={() => draft.removePair(pair.key)}
          >
            <TimesIcon />
          </button>
        </div>
        {isIncompatible && (
          <div className="text-sm text-[var(--color-status-error)]">
            {`${leftType.displayName} and ${rightType.displayName} can't be compared`}
          </div>
        )}
        {isDateOrTimestamp && (
          <div className="text-sm text-[var(--color-status-warn)]">
            {DATE_OR_TIMESTAMP_WARNING}
          </div>
        )}
        {isUntyped && (
          <div
            className="text-sm text-[var(--color-status-warn)]"
            title={TYPE_UNKNOWN.description}
          >
            {`${TYPE_UNKNOWN.label}: the column's real type is not known to Cube, so the engine may not match its values`}
          </div>
        )}
      </li>
    );
  },
);

/**
 * The Join editor (spec §17.6): the join type, pairs of key columns, a left
 * one from the Left input and a right one from the Right input, and Swap
 * Inputs. A pair whose types can't be compared is marked; one on a column
 * Cube can't type is warned about, not blocked.
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
  const canAddPair =
    !readOnly &&
    draft.pairs.length <
      Math.min(leftSchema.columns.length, rightSchema.columns.length);
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
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1 text-sm text-[var(--color-text-secondary)]">
        <span>Left</span>
        <span />
        <span>Right</span>
        <span />
      </div>
      <ul aria-label="Join columns">
        {draft.pairs.map((pair, index) => (
          <CubeJoinKeyRow
            key={pair.key}
            editorProps={props}
            draft={draft}
            pair={pair}
            index={index}
            leftSchema={leftSchema}
            rightSchema={rightSchema}
          />
        ))}
      </ul>
      <div>
        <CubeButton
          title={
            canAddPair
              ? 'Add a pair of join columns'
              : 'Every column of an input is already a join column'
          }
          disabled={!canAddPair}
          onClick={() => draft.addPair()}
        >
          Add join columns
        </CubeButton>
      </div>
      {duplicates.length > 0 && (
        <div className="text-sm text-[var(--color-status-warn)]">
          <div>
            In both inputs and not joined on, so the output can&apos;t keep
            both:
          </div>
          <ul aria-label="Columns in both inputs">
            {duplicates.map((name, index) => (
              <li key={name} className="font-mono">
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
