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
  CalendarIcon,
  clsx,
  HashtagIcon,
  ListIcon,
  QuestionIcon,
  SitemapIcon,
  StringTypeIcon,
  ToggleIcon,
} from '@finos/legend-art';
import {
  type CubeType,
  type Schema,
  type SchemaColumn,
  TypeFamily,
} from '@finos/legend-cube';
import {
  getColumnTypeLabel,
  getExactColumnTypeLabel,
} from '../../__lib__/LegendCubeLabels.js';

const FAMILY_ICONS: Readonly<
  Partial<Record<TypeFamily, React.FC<{ className?: string }>>>
> = {
  [TypeFamily.STRING]: StringTypeIcon,
  [TypeFamily.BOOLEAN]: ToggleIcon,
  [TypeFamily.INTEGER]: HashtagIcon,
  [TypeFamily.FLOAT]: HashtagIcon,
  [TypeFamily.DECIMAL]: HashtagIcon,
  [TypeFamily.NUMBER]: HashtagIcon,
  [TypeFamily.STRICT_DATE]: CalendarIcon,
  [TypeFamily.DATETIME]: CalendarIcon,
  [TypeFamily.DATE]: CalendarIcon,
  [TypeFamily.ENUM]: ListIcon,
  // a JSON document: its fields as a tree (PLAN §11.20)
  [TypeFamily.VARIANT]: SitemapIcon,
};

/** The icon of a column type's family: text, number, date, ...; a question mark for the rest */
export const CubeColumnTypeIcon: React.FC<{
  type: CubeType;
  className?: string;
}> = (props) => {
  const Icon = FAMILY_ICONS[props.type.family] ?? QuestionIcon;
  return <Icon className={clsx('shrink-0', props.className)} />;
};

/**
 * Picks a column of an input schema, in schema order (spec §17.5: only the
 * columns of the actual input). Each option names its type, e.g.
 * `CUSTOMER_ID: Varchar(5)?`; the picked column's type shows beside, with
 * its family's icon and its full type in the tooltip. A column the input
 * doesn't have stays shown, so the problem can be seen and fixed. A column
 * the editor can't take here is shown, with the reason `isColumnDisabled`
 * gives after its type, but can't be picked.
 */
export const CubeColumnPicker: React.FC<{
  /** What the column is for, e.g. `Left join column 1`: the picker's accessible name */
  label: string;
  schema: Schema;
  /** The picked column's name, `''` or `undefined` for none */
  value: string | undefined;
  onChange: (columnName: string) => void;
  disabled?: boolean | undefined;
  /** Marks the pick as wrong, e.g. a type that doesn't match */
  invalid?: boolean | undefined;
  /**
   * Why a column can't be picked, shown after its type, e.g. a Sort's Variant
   * column, or one another row has; `undefined` when it can be
   */
  isColumnDisabled?: ((column: SchemaColumn) => string | undefined) | undefined;
  /** Columns to list first, under "Suggested", e.g. a Join's suggested join columns; the rest follow */
  suggested?: readonly string[] | undefined;
}> = (props) => {
  const {
    label,
    schema,
    value,
    onChange,
    disabled,
    invalid,
    isColumnDisabled,
    suggested,
  } = props;
  const picked = value ? schema.lookup(value) : undefined;
  const suggestedColumns = (suggested ?? [])
    .map((name) => schema.lookup(name))
    .filter(
      (column, index, all): column is SchemaColumn =>
        column !== undefined && all.indexOf(column) === index,
    );
  const renderOption = (column: SchemaColumn): React.ReactNode => {
    const reason = isColumnDisabled?.(column);
    return (
      <option
        key={column.name}
        value={column.name}
        title={`${getExactColumnTypeLabel(column)} (${column.type.fullName})`}
        disabled={reason !== undefined}
      >
        {`${column.name}: ${getColumnTypeLabel(column)}${reason === undefined ? '' : ` (${reason})`}`}
      </option>
    );
  };
  return (
    <div className="flex min-w-0 items-center gap-1">
      <select
        aria-label={label}
        aria-invalid={Boolean(invalid) || (Boolean(value) && !picked)}
        className={clsx(
          'h-6 min-w-0 flex-1 rounded-sm border bg-[var(--color-bg-input)] px-1 text-base',
          invalid || (value && !picked)
            ? 'border-[var(--color-status-error)]'
            : 'border-[var(--color-border-default)]',
        )}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {!picked && (
          <option value={value ?? ''} disabled={true}>
            {value ? `${value} (not in the input)` : 'Pick a column'}
          </option>
        )}
        {suggestedColumns.length > 0 ? (
          <>
            <optgroup label="Suggested">
              {suggestedColumns.map(renderOption)}
            </optgroup>
            <optgroup label="Other columns">
              {schema.columns
                .filter((column) => !suggestedColumns.includes(column))
                .map(renderOption)}
            </optgroup>
          </>
        ) : (
          schema.columns.map(renderOption)
        )}
      </select>
      {picked && (
        <span
          className="flex shrink-0 items-center gap-1 text-sm text-[var(--color-text-secondary)]"
          title={`${getExactColumnTypeLabel(picked)} (${picked.type.fullName})`}
        >
          <CubeColumnTypeIcon type={picked.type} />
          {getColumnTypeLabel(picked)}
        </span>
      )}
    </div>
  );
};
