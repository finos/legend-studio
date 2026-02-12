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

import { CustomSelectorInput, BaseMenuItem, Checkbox } from '@finos/legend-art';
import { type ReactNode, type MouseEvent } from 'react';
import { DataQualityCustomSelector } from './DataQualityCustomSelector.js';
import type { ColumnOption } from './states/LambdaEditorWithGUIState.js';
import type { ColSpecArray, ColSpecArrayInstance } from '@finos/legend-graph';

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

interface RenderColumnsProps {
  columns: ColSpecArrayInstance;
  onChange: (value: string[]) => void;
  options: ColumnOption[];
  placeholder?: string;
  darkMode: boolean;
  disabled: boolean;
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
      onChange={onChange}
    />
  );
};

export const RenderColumns = (props: RenderColumnsProps) => {
  const {
    columns = [],
    onChange,
    options = [],
    placeholder,
    darkMode,
    disabled,
    ...rest
  } = props;

  const CustomOption = ({
    children,
    ...optionProps
  }: {
    children: ReactNode;
    data: Option;
    isSelected: boolean;
    isFocused: boolean;
    selectOption: (option: Option) => void;
  }) => {
    const { data, isSelected, selectOption } = optionProps;

    const handleClick = (event: unknown) => {
      (event as MouseEvent).preventDefault();
      selectOption(data);
    };

    return (
      <BaseMenuItem
        onClick={handleClick}
        className="data-quality-validation-gui-editor__column-list-item"
        dense={true}
      >
        <Checkbox size="small" checked={isSelected} onClick={handleClick} />
        <div>{children}</div>
      </BaseMenuItem>
    );
  };

  return (
    <CustomSelectorInput
      {...rest}
      value={options.filter(({ value: v }) =>
        (columns.values as ColSpecArray[])[0]?.colSpecs.find(
          (col) => col.name === v,
        ),
      )}
      placeholder={placeholder ?? 'Select columns'}
      isMulti={true}
      options={options}
      hideSelectedOptions={false}
      closeMenuOnSelect={false}
      components={{
        Option: CustomOption,
        MultiValueContainer: ({ children }) => {
          return (
            <div className="data-quality-validation-gui-editor__column-list-item">
              {children}
            </div>
          );
        },
        MultiValueLabel: ({ children }) => children,
        MultiValueRemove: () => null,
      }}
      onChange={(values: Option[]) =>
        onChange(values.map((change) => change.value))
      }
      darkMode={darkMode}
      disabled={disabled}
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
      onChange={(change) => onChange(change.value)}
      placeholder="Select operation"
    />
  );
};
