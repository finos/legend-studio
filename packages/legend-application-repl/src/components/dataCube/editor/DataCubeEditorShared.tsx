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
  BasePopover,
  Checkbox,
  cn,
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  HexAlphaColorPicker,
  HexColorInput,
  TailwindCSSPalette,
  type CheckboxProps,
  type DropdownMenuItemProps,
  type DropdownMenuProps,
  type TailwindCSSColorScale,
  type TailwindCSSColorScaleKey,
} from '@finos/legend-art';
import { useState } from 'react';

export function WIP_Badge() {
  return (
    <div
      className="color-neutral-700 text-2xs ml-1 select-none rounded-md bg-sky-500 px-1 py-0.5 font-semibold text-white"
      title="Work In Progress"
    >
      WIP
    </div>
  );
}

export function DataCubeEditorInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className, ...otherProps } = props;
  return (
    <input
      className={cn(
        'h-6 w-full border border-neutral-400 px-1.5 disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300',
        className,
      )}
      {...otherProps}
    />
  );
}

export function DataCubeEditorCheckbox(
  props: CheckboxProps & { label?: React.ReactNode },
) {
  const { label, className, ...otherProps } = props;
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
            'p-0 text-neutral-400 [&_*]:stroke-[1.5px] -ml-[1px]',
            className,
          ),
          checked: '!text-neutral-600',
          disabled: '!text-neutral-300',
        }}
        {...otherProps}
      />
      {Boolean(label) && (
        <div className="flex-shrink-0 pl-1 text-sm">{label}</div>
      )}
    </>
  );
}

export function DataCubeEditorDropdownMenuTrigger(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { children, className, ...otherProps } = props;
  return (
    <button
      className={cn(
        'group flex h-6 items-center justify-between border border-neutral-400 px-1.5 pr-0.5 text-sm disabled:select-none disabled:border-neutral-300 disabled:bg-neutral-50 disabled:text-neutral-300',
        className,
      )}
      {...otherProps}
    >
      {props.children}
      <div className="text-neutral-500 group-disabled:text-neutral-400">
        <DataCubeIcon.CaretDown />
      </div>
    </button>
  );
}

export function DataCubeEditorDropdownMenu(props: DropdownMenuProps) {
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

export function DataCubeEditorDropdownMenuItem(props: DropdownMenuItemProps) {
  const { className, ...otherProps } = props;
  return (
    <DropdownMenuItem
      className={cn(
        'flex h-5 items-center px-1.5 text-sm hover:bg-neutral-100 focus-visible:bg-neutral-100',
        className,
      )}
      {...otherProps}
    />
  );
}

export function DataCubeEditorDropdownMenuItemSeparator() {
  return <div className="my-0.5 h-[1px] w-full bg-neutral-200" />;
}

function DataCubeEditorColorPicker(props: {
  color: string;
  onChange: (value: string) => void;
  onClose: () => void;
  defaultColor?: string | undefined;
}) {
  const { onChange, onClose, defaultColor } = props;
  const [color, setColor] = useState(props.color);

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
                onClick={(): void => {
                  setColor(TailwindCSSPalette[scale][level]);
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
            '#000000',
            '#111111',
            '#AAAAAA',
            '#DDDDDD',
            '#FFFFFF',
            '#FF4136',
            '#FF851B',
            '#FFDC00',
            '#01FF70',
            '#2ECC40',
            '#3D9970',
            '#39CCCC',
            '#7FDBFF',
            '#0074D9',
            '#001F3F',
            '#B10DC9',
            '#F012BE',
            '#85144B',
          ].map((_color) => (
            <div
              key={_color}
              className="mr-0.5 border-[0.5px] border-neutral-300 last:mr-0"
            >
              <button
                className="flex h-3 w-3 flex-shrink-0"
                style={{
                  background: _color,
                }}
                onClick={(): void => {
                  setColor(_color);
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
            className="h-4 w-4 flex-shrink-0 rounded-sm"
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
              onClick={(): void => {
                setColor(defaultColor);
              }}
            >
              Reset
            </button>
          )}
          <button
            className="ml-1 h-4 w-9 border border-neutral-400 bg-neutral-300 px-1 text-xs hover:brightness-95"
            onClick={(): void => {
              onClose();
            }}
          >
            Cancel
          </button>
          <button
            className="ml-1 h-4 w-9 border border-neutral-400 bg-neutral-300 px-1 text-xs hover:brightness-95"
            onClick={(): void => {
              onChange(color);
              onClose();
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export function DataCubeEditorColorPickerButton(props: {
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
          <DataCubeEditorColorPicker
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
