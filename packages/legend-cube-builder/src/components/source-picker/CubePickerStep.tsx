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

import { useId } from 'react';

/** One step of the picker: a labelled list of choices, read-only when the cube fixes it */
export const CubePickerStep: React.FC<{
  label: string;
  value: string | undefined;
  options: readonly { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}> = ({ label, value, options, disabled, onChange }) => {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <label className="w-20 shrink-0 text-base" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="h-7 min-w-0 flex-1 rounded-sm border border-[var(--color-border-default)] bg-[var(--color-bg-input)] px-1 text-base text-[var(--color-text-primary)] disabled:text-[var(--color-text-secondary)]"
        value={value ?? ''}
        disabled={Boolean(disabled) || !options.length}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        {value === undefined && <option value="">Choose…</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
