/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { DataQualityCustomSelector } from './DataQualityCustomSelector.js';
import type { ColumnOption } from './states/LambdaEditorWithGUIState.js';

type Option = { value: string; label: string };

interface RenderColumnProps {
  column: ColumnOption | undefined;
  onChange: (value: ColumnOption) => void;
  options: ColumnOption[];
  placeholder?: string;
  disabled: boolean;
}

interface FunctionSelectProps {
  value?: string;
  onChange: (val: string) => void;
  disabled: boolean;
  options?: Option[];
}

export const RenderColumn = (props: RenderColumnProps) => {
  const { column, onChange, options, ...rest } = props;

  return (
    <DataQualityCustomSelector<ColumnOption>
      {...rest}
      value={column}
      placeholder="Select column"
      renderLabel={({ label }) => label}
      options={options}
      onChange={(val) => {
        if (val !== undefined) {
          onChange(val);
        }
      }}
    />
  );
};

export const FunctionSelectionHandler = (props: FunctionSelectProps) => {
  const { value, onChange, options = [], ...rest } = props;

  return (
    <DataQualityCustomSelector<{ value: string; label: string }>
      {...rest}
      value={options.find((opt) => opt.value === value)}
      options={options}
      renderLabel={({ label }) => label}
      onChange={(change) => {
        if (change !== undefined) {
          onChange(change.value);
        }
      }}
      placeholder="Select operation"
    />
  );
};
