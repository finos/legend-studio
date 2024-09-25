/**
 * Copyright (c) 2020-present, Goldman Sachs
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
  shouldDisplayVirtualAssistantDocumentationEntry,
  useApplicationStore,
} from '@finos/legend-application';
import {
  BasePopover,
  Checkbox,
  cn,
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  HexAlphaColorPicker,
  HexColorInput,
  parseColor,
  TailwindCSSPalette,
  useForkRef,
  type CheckboxProps,
  type DropdownMenuItemProps,
  type DropdownMenuProps,
  type TailwindCSSColorScale,
  type TailwindCSSColorScaleKey,
} from '@finos/legend-art';
import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { isString } from '@finos/legend-shared';
import { useDataCubeStore } from '../DataCubeStoreProvider.js';

export function FormBadge_WIP() {
  return (
    <div
      className="text-2xs ml-1 flex h-2.5 flex-shrink-0 select-none items-center rounded-md bg-sky-500 px-1 font-semibold leading-[10px] text-white"
      title="Work In Progress"
    >
      WIP
    </div>
  );
}

export function FormBadge_Advanced() {
  return (
    <div
      className="text-2xs ml-1 select-none rounded-md bg-amber-500 px-1 py-0.5 font-semibold text-white"
      title="Advanced: Becareful when using this feature!"
    >
      ADV
    </div>
  );
}

export const FormNumberInput = forwardRef(function FormNumberInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    min?: number | undefined;
    max?: number | undefined;
    step?: number | undefined;
    isValid?: (value: number | undefined) => boolean;
    isDecimal?: boolean | undefined;
    defaultValue?: number | undefined;
    value: number | undefined;
    setValue: (value?: number | undefined) => void;
    className?: string | undefined;
  },
  ref: React.Ref<HTMLInputElement>,
) {
  const {
    min,
    max,
    step,
    value,
    setValue,
    isValid,
    isDecimal,
    defaultValue,
    disabled,
    className,
  } = props;
  const [inputValue, setInputValue] = useState<string | number>(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useForkRef(inputRef, ref);

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  return (
    <input
      className={cn(
        'h-5 flex-shrink-0 border border-neutral-400 px-1.5 text-sm disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300',
        className,
      )}
      ref={handleRef}
      inputMode="numeric"
      type="number"
      min={min}
      max={max}
      step={step}
      value={inputValue}
      disabled={Boolean(disabled)}
      onKeyDown={(event) => {
        if (event.code === 'Escape') {
          inputRef.current?.select();
        } else if (event.code === 'ArrowUp') {
          event.preventDefault();
          if (value !== undefined && step !== undefined) {
            const newValue = value + step;
            if (
              (min !== undefined && newValue < min) ||
              (max !== undefined && newValue > max)
            ) {
              return;
            }
            setInputValue(newValue.toString());
            setValue(newValue);
          }
        } else if (event.code === 'ArrowDown') {
          event.preventDefault();
          if (value !== undefined && step !== undefined) {
            const newValue = value - step;
            if (
              (min !== undefined && newValue < min) ||
              (max !== undefined && newValue > max)
            ) {
              return;
            }
            setInputValue(newValue.toString());
            setValue(newValue);
          }
        }
      }}
      onChange={(event) => {
        const newInputValue = event.target.value;
        setInputValue(newInputValue);
        const numericValue = isDecimal
          ? Number(newInputValue)
          : parseInt(newInputValue, 10);
        if (
          isNaN(numericValue) ||
          (isString(newInputValue) && !newInputValue) || // Explicitly check this case since `Number()` parses empty string as `0`
          (isValid !== undefined
            ? !isValid(numericValue)
            : (min !== undefined && numericValue < min) ||
              (max !== undefined && numericValue > max))
        ) {
          return;
        }
        setValue(numericValue);
      }}
      onBlur={() => {
        const numericValue = isDecimal
          ? Number(inputValue)
          : parseInt(inputValue.toString(), 10);
        if (
          isNaN(numericValue) ||
          (isString(inputValue) && !inputValue) || // Explicitly check this case since `Number()` parses empty string as `0`
          (isValid !== undefined
            ? !isValid(numericValue)
            : (min !== undefined && numericValue < min) ||
              (max !== undefined && numericValue > max))
        ) {
          setValue(defaultValue);
          setInputValue(defaultValue ?? '');
        } else {
          setInputValue(value ?? '');
        }
      }}
    />
  );
});

export const FormTextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function FormTextInput(props, ref) {
  const { className, ...otherProps } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useForkRef(inputRef, ref);

  return (
    <input
      ref={handleRef}
      className={cn(
        'h-5 flex-shrink-0 border border-neutral-400 px-1.5 text-sm disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300',
        className,
      )}
      onKeyDown={(event) => {
        if (event.code === 'Escape') {
          inputRef.current?.select();
        }
      }}
      {...otherProps}
    />
  );
});

export function FormCheckbox(
  props: CheckboxProps & {
    label?: React.ReactNode;
    onChange: () => void;
  },
) {
  const { label, className, onChange, disabled, ...otherProps } = props;
  return (
    <>
      <Checkbox
        icon={<DataCubeIcon.Checkbox />}
        checkedIcon={<DataCubeIcon.CheckboxSelected />}
        disableRipple={true}
        classes={{
          root: cn(
            // Make sure the icons used have consistent stroke width with other components' borders
            // and that the left side is offseted to align well with other components
            'p-0 text-neutral-600 [&_*]:stroke-[1.5px] -ml-[1px]',
            className,
          ),
          checked: 'data-cube-editor-checkbox--checked',
          disabled: 'data-cube-editor-checkbox--disabled',
        }}
        onChange={onChange}
        disabled={disabled}
        {...otherProps}
      />
      {Boolean(label) && (
        <button
          className="flex-shrink-0 pl-1 text-sm disabled:text-neutral-300"
          onClick={onChange}
          disabled={disabled}
          tabIndex={-1}
        >
          {label}
        </button>
      )}
    </>
  );
}

export const FormDropdownMenuTrigger = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    open?: boolean | undefined;
  }
>(function FormDropdownMenuTrigger(props, ref) {
  const { children, className, open, ...otherProps } = props;
  return (
    <button
      ref={ref}
      className={cn(
        'group flex h-5 flex-shrink-0 items-center justify-between border border-neutral-400 bg-white pl-1.5 text-sm disabled:select-none disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300',
        {
          'border-sky-600': Boolean(open),
          'bg-sky-100': Boolean(open),
        },
        className,
      )}
      {...otherProps}
    >
      <div className="w-[calc(100%_-_12px)] overflow-hidden overflow-ellipsis whitespace-nowrap text-left">
        {props.children}
      </div>
      <div className="flex h-full w-3 items-center justify-center text-neutral-500 group-disabled:text-neutral-400">
        <DataCubeIcon.CaretDown />
      </div>
    </button>
  );
});

export function FormDropdownMenu(props: DropdownMenuProps) {
  const { className, ...otherProps } = props;
  return (
    <DropdownMenu
      {...otherProps}
      menuProps={{
        classes: {
          paper: 'rounded-none mt-[1px]',
          list: cn(
            'p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto',
            className,
          ),
        },
      }}
    />
  );
}

export function FormDropdownMenuItem(props: DropdownMenuItemProps) {
  const { className, ...otherProps } = props;
  return (
    <DropdownMenuItem
      className={cn(
        'flex h-5 w-full items-center px-1.5 text-sm hover:bg-neutral-100 focus:bg-sky-600 focus:text-white',
        className,
      )}
      {...otherProps}
    />
  );
}

export function FormDropdownMenuItemSeparator() {
  return <div className="my-0.5 h-[1px] w-full bg-neutral-200" />;
}

function FormColorPicker(props: {
  color: string;
  onChange: (value: string) => void;
  onClose: () => void;
  defaultColor?: string | undefined;
}) {
  const { onChange, onClose, defaultColor } = props;
  const [color, setColor] = useState(props.color);
  const submit = () => {
    onChange(
      // if color is completely transparent, set it to #00000000
      parseColor(color).alpha === 0 ? TailwindCSSPalette.transparent : color,
    );
    onClose();
  };

  return (
    <div className="data-cube-color-picker rounded-none border border-neutral-400 bg-white">
      <div className="p-2">
        <HexAlphaColorPicker color={color} onChange={setColor} />
      </div>
      <div className="flex justify-center px-2">
        {(
          [
            'slate',
            'neutral',
            'red',
            'orange',
            'amber',
            'yellow',
            'lime',
            'green',
            'emerald',
            'teal',
            'sky',
            'blue',
            'indigo',
            'violet',
            'purple',
            'fuchsia',
            'pink',
            'rose',
          ] as TailwindCSSColorScaleKey[]
        ).map((scale) => (
          <div
            key={scale}
            className="mr-0.5 flex flex-col border-[0.5px] border-neutral-300 last:mr-0"
          >
            {(
              [
                50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
              ] as (keyof TailwindCSSColorScale)[]
            ).map((level) => (
              <button
                key={`${scale}-${level}`}
                className="h-3 w-3 flex-shrink-0"
                style={{
                  background: TailwindCSSPalette[scale][level],
                }}
                onClick={() => {
                  setColor(TailwindCSSPalette[scale][level]);
                }}
                onDoubleClick={() => {
                  setColor(TailwindCSSPalette[scale][level]);
                  submit();
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex justify-center px-2 pb-1 pt-0.5">
        <div className="flex">
          {[
            // Colors from Better Colors - https://clrs.cc/
            TailwindCSSPalette.transparent,
            '#000000',
            '#aaaaaa',
            '#dddddd',
            '#ffffff',
            '#ff4136',
            '#ff851b',
            '#ffdc00',
            '#01ff70',
            '#2ecc40',
            '#3d9970',
            '#39cccc',
            '#7fdbff',
            '#0074d9',
            '#001f3f',
            '#b10dc9',
            '#f012be',
            '#85144b',
          ].map((_color) => (
            <div
              key={_color}
              className={cn(
                'mr-0.5 border-[0.5px] border-neutral-300 last:mr-0',
                {
                  'data-cube-color-picker--transparent border-neutral-400':
                    _color === TailwindCSSPalette.transparent,
                },
              )}
            >
              <button
                className="flex h-3 w-3 flex-shrink-0"
                style={{
                  background: _color,
                }}
                onClick={() => {
                  setColor(_color);
                }}
                onDoubleClick={() => {
                  setColor(_color);
                  submit();
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="h-[1px] w-full bg-neutral-200" />
      <div className="flex h-6 items-center justify-between p-1">
        <div className="flex">
          <div
            className="h-4 w-4 flex-shrink-0 rounded-sm border-[0.5px] border-neutral-300"
            style={{ background: color }}
          />
          <HexColorInput
            className="ml-0.5 h-4 w-14 border border-neutral-400 px-1 text-sm"
            color={color}
            autoFocus={true}
            tabIndex={0}
            onChange={setColor}
            prefix="#"
            alpha={true}
          />
        </div>
        <div className="flex">
          {defaultColor !== undefined && (
            <button
              className="ml-1 h-4 w-9 border border-neutral-400 bg-neutral-300 px-1 text-xs hover:brightness-95"
              onClick={() => {
                setColor(defaultColor);
              }}
            >
              Reset
            </button>
          )}
          <button
            className="ml-1 h-4 w-9 border border-neutral-400 bg-neutral-300 px-1 text-xs hover:brightness-95"
            onClick={() => {
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="ml-1 h-4 w-9 border border-neutral-400 bg-neutral-300 px-1 text-xs hover:brightness-95"
            onClick={() => {
              submit();
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormColorPickerButton(props: {
  color: string;
  onChange: (value: string) => void;
  className?: string | undefined;
  disabled?: boolean | undefined;
  defaultColor?: string | undefined;
}) {
  const { color, onChange, className, disabled, defaultColor } = props;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  return (
    <>
      <button
        className={cn(
          'group h-5 w-10 border border-neutral-300 p-[1px] disabled:border-neutral-200',
          {
            'data-cube-color-picker--disabled': Boolean(disabled),
            'data-cube-color-picker--transparent':
              !disabled && color === TailwindCSSPalette.transparent,
          },
          className,
        )}
        onClick={(event) => {
          setAnchorEl(event.currentTarget);
        }}
        disabled={disabled}
      >
        <div
          className="h-full w-full group-disabled:hidden"
          style={{
            background: color,
          }}
        />
      </button>
      {Boolean(anchorEl) && (
        <BasePopover
          open={Boolean(anchorEl)}
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
          transformOrigin={{ vertical: 'center', horizontal: 'left' }}
          onClose={() => setAnchorEl(null)}
        >
          <FormColorPicker
            color={color}
            onChange={onChange}
            onClose={() => setAnchorEl(null)}
            defaultColor={defaultColor}
          />
        </BasePopover>
      )}
    </>
  );
}

export const FormDocumentation: React.FC<{
  documentationKey: string;
  title?: string | undefined;
  className?: string | undefined;
}> = ({ documentationKey, title, className }) => {
  const application = useApplicationStore();
  const store = useDataCubeStore();
  const documentationEntry =
    application.documentationService.getDocEntry(documentationKey);
  const openDocLink: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const entry =
      application.documentationService.getDocEntry(documentationKey);
    if (entry) {
      if (shouldDisplayVirtualAssistantDocumentationEntry(entry)) {
        application.assistantService.openDocumentationEntry(documentationKey);
        store.documentationDisplay.open();
      } else if (entry.url) {
        application.navigationService.navigator.visitAddress(entry.url);
      }
    }
  };

  if (
    !documentationEntry ||
    (!documentationEntry.url &&
      !shouldDisplayVirtualAssistantDocumentationEntry(documentationEntry))
  ) {
    return null;
  }
  return (
    <div
      onClick={openDocLink}
      title={title ?? documentationEntry.text ?? 'Click to see documentation'}
      className={cn('cursor-pointer text-xl text-sky-500', className)}
    >
      <DataCubeIcon.DocumentationHint />
    </div>
  );
};
