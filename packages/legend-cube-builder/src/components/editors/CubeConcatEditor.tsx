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

import { clsx } from '@finos/legend-art';
import {
  CONCAT_PORT_LABELS,
  type Schema,
  type SchemaColumn,
} from '@finos/legend-cube';
import { noop } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import {
  CONCAT_EDITOR_TEXT,
  CUBE_TABLE_FLAG_LABELS,
  getColumnTypeLabel,
  getConcatUntypedWarning,
} from '../../__lib__/LegendCubeLabels.js';
import { CubeTableFlag } from '../../graph-manager/CubeEngine.js';
import { isUntypedColumn } from '../../stores/editors/CubeJoinDraft.js';
import type { CubeNodeEditorProps } from './CubeNodeEditorRegistry.js';

const TYPE_UNKNOWN = CUBE_TABLE_FLAG_LABELS[CubeTableFlag.TYPE_UNKNOWN];

/**
 * A column's type as the table shows it: its display name, or its path when
 * the other input's type differs but has the same short name (two
 * enumerations `a::Region` and `b::Region`), with `?` when it takes NULL
 */
const typeLabel = (
  column: SchemaColumn,
  other: SchemaColumn | undefined,
): string =>
  other &&
  !column.type.equals(other.type) &&
  column.type.displayName === other.type.displayName
    ? `${column.type.fullName}${column.nullable ? '?' : ''}`
    : getColumnTypeLabel(column);

/** One input's column at a position, its name and type marked where they differ from the other input's */
const CubeConcatCell = (props: {
  column: SchemaColumn | undefined;
  other: SchemaColumn | undefined;
  otherLabel: string;
}) => {
  const { column, other, otherLabel } = props;
  if (!column) {
    return (
      <td
        className="px-1 py-0.5 text-[var(--color-status-error)]"
        title={`Only the ${otherLabel.toLowerCase()} input has a column here`}
      >
        (none)
      </td>
    );
  }
  const isOtherName = other !== undefined && column.name !== other.name;
  const isOtherType = other !== undefined && !column.type.equals(other.type);
  return (
    <td className="min-w-0 px-1 py-0.5">
      <div
        className={clsx(
          'truncate font-mono',
          isOtherName && 'text-[var(--color-status-error)]',
        )}
        title={
          isOtherName
            ? `The ${otherLabel.toLowerCase()} input has ${other.name} here`
            : column.name
        }
      >
        {column.name}
      </div>
      <div
        className={clsx(
          'truncate text-sm',
          isOtherType
            ? 'text-[var(--color-status-error)]'
            : 'text-[var(--color-text-muted)]',
        )}
        title={
          isOtherType
            ? `The ${otherLabel.toLowerCase()} input has ${typeLabel(other, column)} here`
            : undefined
        }
      >
        {typeLabel(column, other)}
      </div>
    </td>
  );
};

/**
 * The Concat editor (spec §17.6, PLAN §11.5): what Concat requires, then its
 * inputs' columns side by side, by position, each name or type that differs
 * from the other input's marked, and a column only one input has. Nullability
 * is shown, never compared. A column whose real type Cube doesn't know is
 * warned about. Concat has nothing to set until Convert types (M4.13); the
 * panel lists its problems.
 */
export const CubeConcatEditor = observer((props: CubeNodeEditorProps) => {
  const { editorState, draft, inputSchemas } = props;
  const [first, second] = inputSchemas as [Schema, Schema];
  const [firstLabel, secondLabel] = CONCAT_PORT_LABELS as [string, string];
  const { query } = editorState.document;
  const { analysis, modelOutline } = editorState;
  const model = editorState.document.context?.model;
  useEffect(() => {
    flowResult(editorState.loadModelOutline()).catch(noop());
  }, [editorState, model]);
  const inputIds = query.getInputIds(draft.original.id);
  const positions = Array.from(
    { length: Math.max(first.columns.length, second.columns.length) },
    (_, index) => index,
  );
  // each column of either input whose real type Cube doesn't know, once
  const untyped = [first, second].flatMap((schema, side) => {
    const inputId = inputIds[side];
    const label = side ? secondLabel : firstLabel;
    return inputId === undefined
      ? []
      : schema.columns
          .filter((column) =>
            isUntypedColumn(
              modelOutline,
              query,
              analysis,
              inputId,
              column.name,
            ),
          )
          .map((column) => `${column.name} (${label.toLowerCase()} input)`);
  });
  return (
    <div className="flex flex-col gap-2 text-base">
      <div className="text-[var(--color-text-secondary)]">
        {CONCAT_EDITOR_TEXT}
      </div>
      <table
        aria-label="Columns by position"
        className="w-full table-fixed border-collapse"
      >
        <thead>
          <tr className="border-b border-[var(--color-border-subtle)] text-left text-sm text-[var(--color-text-secondary)]">
            <th className="w-8 px-1 font-normal">#</th>
            <th className="px-1 font-normal">{firstLabel}</th>
            <th className="px-1 font-normal">{secondLabel}</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((index) => (
            <tr
              key={index}
              className="border-b border-[var(--color-border-subtle)] align-top"
            >
              <th
                scope="row"
                className="px-1 py-0.5 text-left font-normal text-[var(--color-text-secondary)]"
              >
                {index + 1}
              </th>
              <CubeConcatCell
                column={first.columns[index]}
                other={second.columns[index]}
                otherLabel={secondLabel}
              />
              <CubeConcatCell
                column={second.columns[index]}
                other={first.columns[index]}
                otherLabel={firstLabel}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {untyped.length > 0 && (
        <div
          className="break-words text-sm text-[var(--color-status-warn)]"
          title={TYPE_UNKNOWN.description}
        >
          {getConcatUntypedWarning(untyped)}
        </div>
      )}
    </div>
  );
});
