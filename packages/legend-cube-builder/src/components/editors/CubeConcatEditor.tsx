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
  getConcatConvertedType,
  planConcatRename,
  planConcatRestrict,
  type Schema,
  type SchemaColumn,
  validateConcatSchemas,
} from '@finos/legend-cube';
import { guaranteeType, noop } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import {
  CONCAT_CONVERT_FIX_TEXT,
  CONCAT_CONVERT_FIX_TITLE,
  CONCAT_CONVERT_TYPES_HINT,
  CONCAT_EDITOR_TEXT,
  CONCAT_FIX_NEEDS_CONVERT_TEXT,
  CONCAT_RENAME_FIX_TEXT,
  CONCAT_RENAME_FIX_TITLE,
  CUBE_TABLE_FLAG_LABELS,
  getColumnTypeLabel,
  getConcatRestrictFixText,
  getConcatRestrictFixTitle,
  getConcatUntypedWarning,
  READ_ONLY_CUBE_TITLE,
} from '../../__lib__/LegendCubeLabels.js';
import { CubeTableFlag } from '../../graph-manager/CubeEngine.js';
import { CubeConcatDraft } from '../../stores/editors/CubeConcatDraft.js';
import { isUntypedColumn } from '../../stores/editors/CubeJoinDraft.js';
import { CubeButton } from '../CubeButton.js';
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

/**
 * One input's column at a position, its name and type marked where they
 * differ from the other input's; converting types, a type converted to the
 * one both share is shown with it, not marked
 */
const CubeConcatCell = (props: {
  column: SchemaColumn | undefined;
  other: SchemaColumn | undefined;
  otherLabel: string;
  widenTypes: boolean;
}) => {
  const { column, other, otherLabel, widenTypes } = props;
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
  const converted =
    isOtherType && widenTypes && !isOtherName
      ? getConcatConvertedType(column.type, other.type)
      : undefined;
  const isTypeProblem = isOtherType && !converted;
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
          isTypeProblem
            ? 'text-[var(--color-status-error)]'
            : 'text-[var(--color-text-muted)]',
        )}
        title={
          isOtherType
            ? `The ${otherLabel.toLowerCase()} input has ${typeLabel(other, column)} here${converted ? `: both are converted to ${converted.displayName}` : ''}`
            : undefined
        }
      >
        {converted
          ? `${typeLabel(column, other)} → ${converted.displayName}`
          : typeLabel(column, other)}
      </div>
    </td>
  );
};

/**
 * An autofix the Concat editor offers: what it will do, the columns it
 * changes, and its button
 */
const CubeConcatFix = (props: {
  text: string;
  label: string;
  changes: readonly string[];
  button: string;
  title: string;
  readOnly: boolean;
  disabled: boolean;
  onFix: () => void;
}) => {
  const { text, label, changes, button, title, readOnly, disabled, onFix } =
    props;
  return (
    <div className="break-words text-sm text-[var(--color-status-warn)]">
      <div>{text}</div>
      <ul aria-label={label}>
        {changes.map((change) => (
          <li key={change} className="font-mono">
            {change}
          </li>
        ))}
      </ul>
      <div className="mt-1">
        <CubeButton
          title={readOnly ? READ_ONLY_CUBE_TITLE : title}
          disabled={disabled}
          onClick={onFix}
        >
          {button}
        </CubeButton>
      </div>
    </div>
  );
};

/**
 * The Concat editor (spec §17.6, PLAN §11.5): what Concat requires, then its
 * inputs' columns side by side, by position, each name or type that differs
 * from the other input's marked, and a column only one input has. Nullability
 * is shown, never compared. When an M2 node spliced in before an input makes
 * it valid, a button adds it (Q6): a Rename that gives the second input's
 * columns the first input's names, or a Restrict that drops the columns only
 * the wider input has. Its one setting, Convert types (Q5), converts types
 * that differ within numbers, strings or dates to the type they share, shown
 * in the table; when it would make the inputs match, the editor offers it. A
 * column whose real type Cube doesn't know is warned about. The panel lists
 * the problems.
 */
export const CubeConcatEditor = observer((props: CubeNodeEditorProps) => {
  const { editorState, inputSchemas, readOnly } = props;
  const { nodeEditor } = editorState;
  const draft = guaranteeType(props.draft, CubeConcatDraft);
  const { widenTypes } = draft;
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
  // the fixes the store would make, with the setting as the panel has it
  const rename = planConcatRename(first, second, widenTypes);
  const restrict = planConcatRestrict(first, second, widenTypes);
  const [restrictedInput, otherInput] = (
    restrict?.input === 1
      ? [secondLabel, firstLabel]
      : [firstLabel, secondLabel]
  ).map((label) => label.toLowerCase()) as [string, string];
  // each column of either input whose real type Cube doesn't know
  const untypedNames = [first, second].map((schema, side) => {
    const inputId = inputIds[side];
    return new Set(
      inputId === undefined
        ? []
        : schema
            .names()
            .filter((name) =>
              isUntypedColumn(modelOutline, query, analysis, inputId, name),
            ),
    );
  }) as [Set<string>, Set<string>];
  const untyped = [first, second].flatMap((schema, side) =>
    schema
      .names()
      .filter((name) => untypedNames[side]?.has(name))
      .map(
        (name) =>
          `${name} (${(side ? secondLabel : firstLabel).toLowerCase()} input)`,
      ),
  );
  // each type that differs, which converting types would make match; never
  // offered for a column whose real type Cube doesn't know, which the
  // database may not convert
  const converts = first.columns.flatMap((column, index) => {
    const other = second.columns[index];
    const converted = other && getConcatConvertedType(column.type, other.type);
    return other && converted && !column.type.equals(other.type)
      ? [{ column, other, converted }]
      : [];
  });
  const conversions =
    !widenTypes &&
    !validateConcatSchemas(first, second) &&
    validateConcatSchemas(first, second, undefined, true) &&
    converts.every(
      ({ column, other }) =>
        !untypedNames[0].has(column.name) && !untypedNames[1].has(other.name),
    )
      ? converts.map(
          ({ column, other, converted }) =>
            `${column.name}: ${column.type.displayName} and ${other.type.displayName} → ${converted.displayName}`,
        )
      : [];
  // a Rename or Restrict the inputs would get only with Convert types ticked:
  // the problems name the names or counts, never the types, so say so
  const isFixOnceConverted =
    !widenTypes &&
    !rename &&
    !restrict &&
    !conversions.length &&
    !untyped.length &&
    (planConcatRename(first, second, true) !== undefined ||
      planConcatRestrict(first, second, true) !== undefined);
  return (
    <div className="flex flex-col gap-2 text-base">
      <div className="text-[var(--color-text-secondary)]">
        {CONCAT_EDITOR_TEXT}
      </div>
      <label
        className="flex items-center gap-2"
        title={CONCAT_CONVERT_TYPES_HINT}
      >
        <input
          type="checkbox"
          checked={widenTypes}
          disabled={readOnly}
          onChange={(event) => draft.setWidenTypes(event.target.checked)}
        />
        Convert types
      </label>
      {isFixOnceConverted && (
        <div className="text-sm text-[var(--color-status-warn)]">
          {CONCAT_FIX_NEEDS_CONVERT_TEXT}
        </div>
      )}
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
                widenTypes={widenTypes}
              />
              <CubeConcatCell
                column={second.columns[index]}
                other={first.columns[index]}
                otherLabel={firstLabel}
                widenTypes={widenTypes}
              />
            </tr>
          ))}
        </tbody>
      </table>
      {conversions.length > 0 && (
        <CubeConcatFix
          text={CONCAT_CONVERT_FIX_TEXT}
          label="Types to convert"
          changes={conversions}
          button="Convert types"
          title={CONCAT_CONVERT_FIX_TITLE}
          readOnly={readOnly}
          disabled={readOnly}
          onFix={() => draft.setWidenTypes(true)}
        />
      )}
      {rename && (
        <CubeConcatFix
          text={CONCAT_RENAME_FIX_TEXT}
          label="Columns to rename"
          changes={rename.map(({ from, to }) => `${from} → ${to}`)}
          button="Rename them"
          title={CONCAT_RENAME_FIX_TITLE}
          readOnly={readOnly}
          disabled={!nodeEditor.canRenameConcatInput}
          onFix={() => nodeEditor.renameConcatInput()}
        />
      )}
      {restrict && (
        <CubeConcatFix
          text={getConcatRestrictFixText(restrictedInput, otherInput)}
          label="Columns to drop"
          changes={restrict.dropped}
          button="Drop them"
          title={getConcatRestrictFixTitle(restrictedInput, otherInput)}
          readOnly={readOnly}
          disabled={!nodeEditor.canRestrictConcatInput}
          onFix={() => nodeEditor.restrictConcatInput()}
        />
      )}
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
