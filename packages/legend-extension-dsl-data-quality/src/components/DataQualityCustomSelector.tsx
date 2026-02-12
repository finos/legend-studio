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
  CaretDownIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-art';
import type { ReactNode } from 'react';

export type Option<T = string> = { value: T; label: string };

export interface DataQualityCustomSelectorProps<T> {
  value?: T | undefined;
  options: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  title?: string;
  renderLabel?: (option: T) => ReactNode;
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
  } = props;

  const selectedOption = options.find((opt) => opt.value === value?.value);

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
              {opt.label}
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
      <div className="data-quality-custom-selector__label">
        {selectedOption?.label ?? placeholder}
      </div>
      <div className="data-quality-custom-selector__dropdown__trigger">
        <CaretDownIcon />
      </div>
    </ControlledDropdownMenu>
  );
};
