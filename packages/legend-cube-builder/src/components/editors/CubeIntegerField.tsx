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

/**
 * A field for a whole number, such as a size or a row index. It shows the
 * text as typed and reports every keystroke, so the panel checks the edited
 * node as the user types. Enter and Escape do nothing special: Apply is the
 * panel's, and Ctrl+Z is the field's own undo.
 */
export const CubeIntegerField: React.FC<{
  label: string;
  text: string;
  invalid: boolean;
  disabled: boolean;
  onChange: (text: string) => void;
}> = (props) => {
  const { label, text, invalid, disabled, onChange } = props;
  return (
    <input
      aria-label={label}
      aria-invalid={invalid}
      className={clsx(
        'h-6 w-24 rounded-sm border bg-[var(--color-bg-input)] px-1 text-base',
        invalid
          ? 'border-[var(--color-status-error)] text-[var(--color-status-error)]'
          : 'border-[var(--color-border-default)]',
      )}
      type="text"
      inputMode="numeric"
      spellCheck={false}
      value={text}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};
