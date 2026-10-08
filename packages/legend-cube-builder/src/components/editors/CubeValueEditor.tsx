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

import { clsx, TimesIcon } from '@finos/legend-art';
import {
  BLANK_PLACEHOLDER,
  checkValue,
  type CubeType,
  type FilterValue,
  type FilterValueItem,
  type FilterValueShape,
  getLiteralText,
  isEnumType,
  isFilterValueList,
  MESSAGE_FILTER_VALUE_INVALID,
  MESSAGE_FILTER_VALUE_OUT_OF_RANGE,
  parseValue,
  TypeFamily,
} from '@finos/legend-cube';
import { useEffect, useRef, useState } from 'react';

/** Why a value is not one of the type, worded as the validation says it; nothing for a valid one or none */
export const getValueProblem = (
  item: FilterValueItem | undefined,
  type: CubeType,
): string | undefined => {
  const problem = checkValue(item, type);
  if (!problem || problem.reason === 'required') {
    return undefined;
  }
  return problem.reason === 'invalid'
    ? MESSAGE_FILTER_VALUE_INVALID(problem.text, type.displayName)
    : MESSAGE_FILTER_VALUE_OUT_OF_RANGE(problem.text, type.displayName);
};

/** A value as typed and shown: a literal's text, or the text that is not a value */
const getItemText = (item: FilterValueItem | undefined): string =>
  item === undefined
    ? ''
    : item.kind === 'invalid'
      ? item.text
      : getLiteralText(item);

const INPUT_CLASS =
  'h-6 min-w-0 flex-1 rounded-sm border bg-[var(--color-bg-input)] px-1 text-base';

const DATE_TIME_WITHOUT_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/u;

/**
 * The text a date-time input gives, with its seconds: a browser leaves out
 * zero seconds (`1997-01-01T10:30`), and the engine truncates a date-time
 * without them
 */
export const withDateTimeSeconds = (text: string): string =>
  DATE_TIME_WITHOUT_SECONDS.test(text) ? `${text}:00` : text;

/** The input a type's values are typed in (spec §17.7) */
const getInputType = (type: CubeType): string =>
  type.family === TypeFamily.STRICT_DATE
    ? 'date'
    : type.family === TypeFamily.DATETIME
      ? 'datetime-local'
      : 'text';

/**
 * Picks one of a fixed set of values, never typed: an enumeration's values,
 * or true and false. A value that is not one of them (e.g. after the column
 * changed) stays shown, marked.
 */
const CubeValueSelect: React.FC<{
  label: string;
  type: CubeType;
  item: FilterValueItem | undefined;
  onChange: (item: FilterValueItem | undefined) => void;
  disabled: boolean;
}> = (props) => {
  const { label, type, item, onChange, disabled } = props;
  const choices = isEnumType(type) ? type.values : ['true', 'false'];
  const text = getItemText(item);
  const problem = getValueProblem(item, type);
  return (
    <select
      aria-label={label}
      aria-invalid={problem !== undefined}
      title={problem}
      className={clsx(
        INPUT_CLASS,
        problem
          ? 'border-[var(--color-status-error)]'
          : 'border-[var(--color-border-default)]',
      )}
      value={text}
      disabled={disabled}
      onChange={(event) => onChange(parseValue(event.target.value, type))}
    >
      <option value="">{BLANK_PLACEHOLDER}</option>
      {text && !choices.includes(text) && (
        <option value={text} disabled={true}>
          {text}
        </option>
      )}
      {choices.map((choice) => (
        <option key={choice} value={choice}>
          {choice}
        </option>
      ))}
    </select>
  );
};

/**
 * One typed value (spec §17.7): shown as text, or `(blank)`, until clicked;
 * then typed, and read when the input loses focus or on Enter. Text that is
 * not a value of the type is kept, to be fixed, and marked in both modes.
 * Leaving a blank value without typing keeps it blank; Enter on it confirms
 * an empty text, a value of a STRING column. Enter and Escape give the focus
 * back to the value; leaving it by focus leaves the focus where it went.
 */
const CubeValueText: React.FC<{
  label: string;
  type: CubeType;
  item: FilterValueItem | undefined;
  onChange: (item: FilterValueItem | undefined) => void;
  disabled: boolean;
}> = (props) => {
  const { label, type, item, onChange, disabled } = props;
  const [editedText, setEditedText] = useState<string | undefined>(undefined);
  const [returnFocus, setReturnFocus] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Enter and Escape, as the input being typed handles them now */
  const onKeyRef = useRef<(key: string) => void>(() => undefined);
  const isTyping = editedText !== undefined;
  // a native listener: Chrome's date input gives React no Enter keydown
  useEffect(() => {
    const input = inputRef.current;
    if (!isTyping || !input) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        // or the key's press would reach the value it gives the focus to,
        // and open it again
        event.preventDefault();
        onKeyRef.current(event.key);
      }
    };
    input.addEventListener('keydown', onKeyDown);
    return () => input.removeEventListener('keydown', onKeyDown);
  }, [isTyping]);
  const text = getItemText(item);
  const problem = getValueProblem(item, type);
  const markClass = problem
    ? 'border-[var(--color-status-error)] text-[var(--color-status-error)]'
    : 'border-[var(--color-border-default)]';
  if (editedText === undefined) {
    return (
      <button
        aria-label={label}
        aria-invalid={problem !== undefined}
        title={problem ?? 'Click to change'}
        className={clsx(INPUT_CLASS, 'truncate text-left', markClass, {
          'text-[var(--color-text-muted)]': item === undefined,
        })}
        disabled={disabled}
        // back from typing with Enter or Escape
        autoFocus={returnFocus}
        onClick={() => setEditedText(text)}
      >
        {item === undefined
          ? BLANK_PLACEHOLDER
          : item.kind === 'string' && !item.value
            ? '""'
            : text}
      </button>
    );
  }
  const commit = (confirmed: boolean): void => {
    setEditedText(undefined);
    const typed =
      type.family === TypeFamily.DATETIME
        ? withDateTimeSeconds(editedText)
        : editedText;
    if (
      typed !== text ||
      (confirmed && item === undefined && type.family === TypeFamily.STRING)
    ) {
      onChange(parseValue(typed, type));
    }
  };
  onKeyRef.current = (key: string): void => {
    if (key === 'Enter') {
      setReturnFocus(true);
      commit(true);
    } else if (key === 'Escape') {
      setReturnFocus(true);
      setEditedText(undefined);
    }
  };
  return (
    <input
      aria-label={label}
      aria-invalid={problem !== undefined}
      title={problem}
      className={clsx(INPUT_CLASS, markClass)}
      type={getInputType(type)}
      // seconds are needed: the engine truncates a date-time without them
      step={type.family === TypeFamily.DATETIME ? 1 : undefined}
      // the input replaces the button the user just clicked
      autoFocus={true}
      value={editedText}
      onChange={(event) => setEditedText(event.target.value)}
      ref={inputRef}
      onBlur={() => {
        setReturnFocus(false);
        commit(false);
      }}
    />
  );
};

/** One value of a column type, picked or typed as the type wants */
const CubeSingleValueEditor: React.FC<{
  label: string;
  type: CubeType;
  item: FilterValueItem | undefined;
  onChange: (item: FilterValueItem | undefined) => void;
  disabled: boolean;
}> = (props) =>
  props.type.family === TypeFamily.ENUM ||
  props.type.family === TypeFamily.BOOLEAN ? (
    <CubeValueSelect {...props} />
  ) : (
    <CubeValueText {...props} />
  );

/**
 * The value of a condition, as its operator wants it (spec §17.7): none,
 * one, or a list (In and NotIn), each value entered as its column's type
 * wants (`parseValue`): a date input for dates, a picker for an enumeration
 * or a boolean, text for the rest.
 */
export const CubeValueEditor: React.FC<{
  /** What the value is for: the editor's accessible name, e.g. `Filter value` */
  label: string;
  type: CubeType;
  shape: FilterValueShape;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
  disabled?: boolean | undefined;
}> = (props) => {
  const { label, type, shape, value, onChange } = props;
  const disabled = Boolean(props.disabled);
  if (shape === 'none') {
    return null;
  }
  if (shape === 'single') {
    return (
      <CubeSingleValueEditor
        label={label}
        type={type}
        item={isFilterValueList(value) ? undefined : value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }
  const items = isFilterValueList(value) ? value : value ? [value] : [];
  const setItems = (next: readonly FilterValueItem[]): void =>
    onChange(next.length ? next : undefined);
  return (
    <ul aria-label={label} className="flex min-w-0 flex-1 flex-col gap-1">
      {items.map((item, index) => (
        // values can repeat and have no id. A row's only state is its text
        // while typed, which blur commits before another row can be removed
        // eslint-disable-next-line react/no-array-index-key
        <li key={index} className="flex items-center gap-1">
          <CubeSingleValueEditor
            label={`${label} ${index + 1}`}
            type={type}
            item={item}
            disabled={disabled}
            onChange={(changed) =>
              setItems(
                changed === undefined
                  ? items.filter((_, other) => other !== index)
                  : items.map((other, position) =>
                      position === index ? changed : other,
                    ),
              )
            }
          />
          <button
            className="flex h-6 w-6 shrink-0 items-center justify-center text-[var(--color-text-secondary)] disabled:text-[var(--color-text-disabled)]"
            aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
            disabled={disabled}
            onClick={() =>
              setItems(items.filter((_, other) => other !== index))
            }
          >
            <TimesIcon />
          </button>
        </li>
      ))}
      <li className="flex items-center gap-1">
        <CubeSingleValueEditor
          // always blank: what it adds goes to the list above
          label={`Add ${label.toLowerCase()}`}
          type={type}
          item={undefined}
          disabled={disabled}
          onChange={(added) => {
            if (added !== undefined) {
              setItems([...items, added]);
            }
          }}
        />
      </li>
    </ul>
  );
};
