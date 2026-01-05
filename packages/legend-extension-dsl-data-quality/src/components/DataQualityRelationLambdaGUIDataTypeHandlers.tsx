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
import { type DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS } from './constants/DataQualityConstants.js';
import { useApplicationStore } from '@finos/legend-application';
import { type ReactNode, type MouseEvent, type FC } from 'react';
import { DataQualityValidationHelperUtils } from './utils/DataQualityValidationHelperUtils.js';

export type Option = { value: string; label: string };

export interface HandlerProps<T> {
  value: T;
  onChange: (value: T) => void;
}

export interface ColumnHandlerProps<T> {
  value: string | string[];
  onChange: (value: T) => void;
  options: Option[];
  placeholder?: string;
}

export interface FunctionSelectProps {
  type?: string;
  value?: string;
  onChange: (val: string) => void;
  options: {
    label: string;
    value: DATA_QUALITY_FILTER_VALIDATION_HELPER_FUNCTIONS;
  }[];
  disabled: boolean;
}

const StringHandler = (props: HandlerProps<string>) => {
  const { value, onChange, ...rest } = props;
  return (
    <input
      type="text"
      className="data-quality-validation-gui-editor__function__string-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
      placeholder="Enter text"
    />
  );
};

const NumberHandler = (props: HandlerProps<number>) => {
  const { value, onChange, ...rest } = props;
  return (
    <input
      {...rest}
      type="number"
      className="data-quality-validation-gui-editor__function__number-input"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder="Enter number"
    />
  );
};

const ColumnHandler = (props: ColumnHandlerProps<Option>) => {
  const { value, onChange, options, ...rest } = props;
  const applicationStore = useApplicationStore();

  return (
    <CustomSelectorInput
      {...rest}
      value={options.find(({ value: v }) => v === value)}
      placeholder="Select column"
      options={options}
      onChange={onChange}
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    />
  );
};

const ColumnListHandler = (props: ColumnHandlerProps<string[]>) => {
  const { value = [], onChange, options = [], placeholder, ...rest } = props;
  const applicationStore = useApplicationStore();

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
      value={options.filter(({ value: v }) => value.includes(v))}
      placeholder={placeholder || 'Select columns'}
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
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    />
  );
};

const NoneHandler = () => null;

const PARAMETER_COMPONENT_HANDLERS = {
  list: ColumnListHandler,
  number: NumberHandler,
  string: StringHandler,
  column: ColumnHandler,
  'column-list': ColumnListHandler,
  'type-selector': NoneHandler,
  none: NoneHandler,
};

export const FunctionParameterHandler = ({
  parameter,
  onChange,
  index,
  ...rest
}: {
  parameter: {
    type: string;
  };
  index?: number;
  onChange: (value: unknown, type: string, index?: number) => void;
  options: unknown[];
  placeholder?: string;
  disabled: boolean;
}) => {
  const { type } = parameter;
  const handleChange = (val: unknown) => {
    onChange(val, parameter.type, index);
  };

  const props = {
    ...rest,
    ...parameter,
    onChange: handleChange,
  };

  const Handler = (PARAMETER_COMPONENT_HANDLERS[
    DataQualityValidationHelperUtils.getComponentType(type)
  ] || NoneHandler) as FC<typeof props>;

  return <Handler {...props} />;
};

export const FunctionSelectionHandler = (props: FunctionSelectProps) => {
  const { value, onChange, options = [], ...rest } = props;
  const applicationStore = useApplicationStore();

  return (
    <CustomSelectorInput
      {...rest}
      value={options.find(({ value: v }) => v === value)}
      options={options}
      onChange={(change: FunctionSelectProps['options'][number]) =>
        onChange(change.value)
      }
      placeholder="Select function"
      darkMode={
        !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
      }
    />
  );
};
