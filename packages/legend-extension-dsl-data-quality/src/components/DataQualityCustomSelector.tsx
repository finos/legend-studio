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
  BaseMenuItem,
  CaretDownIcon,
  Checkbox,
  ControlledDropdownMenu,
  CustomSelectorInput,
  MenuContent,
  MenuContentItem,
  TimesIcon,
} from '@finos/legend-art';
import type { MouseEvent, ReactNode } from 'react';

export type Option<T = string> = { value: T; label: string };

export interface DataQualityCustomSelectorProps<T> {
  value?: T | undefined;
  options: T[];
  onChange: (value: T | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  title?: string;
  renderLabel?: (option: T) => ReactNode;
  clearable?: boolean;
}

export const DataQualityCustomSelector = <
  T extends { value: string; label: string },
>(
  props: DataQualityCustomSelectorProps<T>,
): React.ReactElement => {
  const {
    value,
    options,
    onChange,
    disabled = false,
    placeholder = 'Choose option...',
    className,
    title = 'Choose option...',
    renderLabel,
    clearable = false,
  } = props;

  const selectedOption = options.find((opt) => opt.value === value?.value);
  const selectedLabel = selectedOption
    ? (renderLabel?.(selectedOption) ?? selectedOption.label)
    : placeholder;

  return (
    <ControlledDropdownMenu
      className={className ?? 'data-quality-custom-selector'}
      title={title}
      disabled={disabled}
      content={
        <MenuContent>
          {options.map((opt) => (
            <MenuContentItem
              key={String(opt.value)}
              className="data-quality-custom-selector__dropdown__option"
              onClick={() => onChange(opt)}
            >
              {renderLabel?.(opt) ?? opt.label}
            </MenuContentItem>
          ))}
        </MenuContent>
      }
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        elevation: 7,
      }}
    >
      <div className="data-quality-custom-selector__label">{selectedLabel}</div>
      {clearable && selectedOption && (
        <button
          className="data-quality-custom-selector__clear"
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            onChange(undefined);
          }}
        >
          <TimesIcon />
        </button>
      )}
      <div className="data-quality-custom-selector__dropdown__trigger">
        <CaretDownIcon />
      </div>
    </ControlledDropdownMenu>
  );
};

export interface DataQualityMultiCustomSelectorProps<T> {
  value?: T[] | undefined;
  options: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  darkMode: boolean;
  renderLabel?: (option: T) => ReactNode;
}

export const DataQualityMultiCustomSelector = <
  T extends { value: string; label: string },
>(
  props: DataQualityMultiCustomSelectorProps<T>,
): React.ReactElement => {
  const {
    value = [],
    onChange,
    options = [],
    placeholder = 'Select options',
    darkMode,
    disabled,
    renderLabel,
  } = props;

  const CustomOption = ({
    children,
    ...optionProps
  }: {
    children: ReactNode;
    data: T;
    isSelected: boolean;
    isFocused: boolean;
    selectOption: (option: T) => void;
  }) => {
    const { data, isSelected, selectOption } = optionProps;

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
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
    <CustomSelectorInput<T, true>
      value={value}
      placeholder={placeholder}
      isMulti={true}
      options={options}
      hideSelectedOptions={false}
      closeMenuOnSelect={false}
      formatOptionLabel={(option: T) => renderLabel?.(option) ?? option.label}
      components={{
        Option: CustomOption,
        MultiValueContainer: ({ children }: { children: ReactNode }) => {
          return (
            <div className="data-quality-validation-gui-editor__column-list-item">
              {children}
            </div>
          );
        },
        MultiValueLabel: ({ data }: { data: T }) =>
          renderLabel?.(data) ?? data.label,
        MultiValueRemove: () => null,
      }}
      onChange={(newValue: readonly T[] | null) =>
        onChange(newValue ? [...newValue] : [])
      }
      darkMode={darkMode}
      disabled={disabled}
    />
  );
};
