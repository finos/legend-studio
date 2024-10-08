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

import React, { useRef, useEffect } from 'react';
import { CaretDownIcon, TimesIcon, CircleNotchIcon } from '../icon/Icon.js';
import { FixedSizeList } from 'react-window';

/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 * so we have to workaround by importing these and re-export them from CJS
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 */
// import { default as ReactSelect } from './CJS__ReactSelect.cjs';
import Select, {
  type Props,
  type PropsValue,
  type OnChangeValue,
  type InputProps,
  type InputActionMeta,
  type ActionMeta,
  type OptionProps,
  type SelectInstance,
  components as ReactSelectComponents,
  type MenuListProps,
  type ClearIndicatorProps,
  createFilter,
  type CSSObjectWithLabel,
} from 'react-select';
import { clsx } from '../utils/ComponentUtils.js';
import CreatableSelect, { type CreatableProps } from 'react-select/creatable';

export type InputActionData = InputActionMeta;
export type SelectActionData<T extends SelectOption> = ActionMeta<T>;
export { createFilter };

interface ListChildComponentProps {
  index: number;
  style: React.CSSProperties;
  isFocused?: boolean;
}

// Create props for buttons within selector input option to ensure
// we don't trigger selector dropdown menu when clicking on these buttons
// NOTE: react-selector uses `mousedown` event instead of `onclick`
// See https://stackoverflow.com/a/55663995
export const getSelectorInputOptionEmbeddedButtonProps = (): {
  onMouseDown: React.MouseEventHandler;
} => ({
  onMouseDown: (event) => event.stopPropagation(),
});

/**
 * This custom list component uses virtualization from `react-window` to help improve performance of
 * `react-select` with large list
 * See https://github.com/bvaughn/react-window/issues/83
 * See https://react-window.now.sh/#/examples/list/fixed-size
 */
const CustomMenuList = <Option extends SelectOption, IsMulti extends boolean>(
  props: MenuListProps<Option, IsMulti> & {
    children: React.ReactNode;
    selectProps: CustomSelectorInputProps<Option, IsMulti>;
  },
) => {
  const { options, children, getValue, selectProps } = props;
  // Get row height in pixel since `react-window` does not support `rem`
  // See https://stackoverflow.com/questions/45001097/convert-rem-to-px-without-reflow
  let rowHeight =
    selectProps.optionCustomization?.rowHeight ??
    parseInt(getComputedStyle(document.documentElement).fontSize, 10) * 3.5;
  rowHeight = isNaN(rowHeight) ? 35 : rowHeight;
  const MAX_OPTIONS_LENGTH = 6;
  const [value] = getValue();
  const initialOffset = value ? options.indexOf(value) * rowHeight : 0;
  const scrollToIndex =
    Array.isArray(children) && children.length
      ? children.findIndex((child) => child.props.isFocused)
      : 0;
  // We use `scrollToItem` function to make it possible for react-select to focus on item within `react-window`
  // If we don't have this, if we search and use up/down arrow and once we get past the initial view-able values
  // the list doesn't auto scroll
  // See https://github.com/JedWatson/react-select/issues/2850
  const listRef = useRef<FixedSizeList>(null);

  useEffect(() => {
    listRef.current?.scrollToItem(scrollToIndex);
  }, [scrollToIndex]);

  // Checking for the children list in case there is no match and the list height shrinks down to 0
  // which causes `react-window` to throw an error
  if (Array.isArray(children) && children.length) {
    return (
      <FixedSizeList
        className={
          selectProps.darkMode ? 'scrollbar--light selector-menu--dark' : ''
        }
        ref={listRef}
        width="100%"
        height={Math.min(children.length, MAX_OPTIONS_LENGTH) * rowHeight}
        itemCount={children.length}
        itemSize={rowHeight}
        initialScrollOffset={initialOffset}
      >
        {({ index, style }): React.ReactElement<ListChildComponentProps> => (
          <div style={style} className="selector-input__option-wrapper">
            {children[index] as React.ReactNode}
          </div>
        )}
      </FixedSizeList>
    );
  }
  // TODO: Maybe a no option thing here
  return (
    <div
      className={`selector-menu--no-match ${
        selectProps.darkMode ? 'selector-menu--dark' : ''
      }`}
    >
      {selectProps.noMatchMessage ?? 'No match found'}
    </div>
  );
};

const CustomOption = <Option extends SelectOption, IsMulti extends boolean>(
  props: OptionProps<Option, IsMulti> & {
    selectProps: CustomSelectorInputProps<Option, IsMulti>;
  },
) => {
  const { children, selectProps } = props;
  return (
    <ReactSelectComponents.Option
      {...props}
      className={clsx(
        !selectProps.darkMode
          ? {
              'selector-input__option': true,
              'selector-input__option--is-focused': props.isFocused,
              'selector-input__option--is-selected': props.isSelected,
            }
          : {
              'selector-input--dark__option': true,
              'selector-input--dark__option--is-focused': props.isFocused,
              'selector-input--dark__option--is-selected': props.isSelected,
            },
        {
          'selector-input__option--custom': Boolean(
            selectProps.optionCustomization,
          ),
        },
      )}
    >
      {children}
    </ReactSelectComponents.Option>
  );
};

export const STYLE_PREFIX = 'selector-input';
export const STYLE_PREFIX__DARK = 'selector-input--dark';

const LoadingIndicator: React.FC = () => (
  <div
    className={`${STYLE_PREFIX}__indicator ${STYLE_PREFIX}__loading-indicator ${STYLE_PREFIX__DARK}__loading-indicator`}
  >
    <CircleNotchIcon />
  </div>
);

const DropdownIndicator: React.FC = () => (
  <div
    className={`${STYLE_PREFIX}__indicator ${STYLE_PREFIX}__dropdown-indicator`}
  >
    <CaretDownIcon />
  </div>
);

const ClearIndicator = <Option extends SelectOption, IsMulti extends boolean>(
  props: ClearIndicatorProps<Option, IsMulti>,
) => {
  const {
    innerProps: { ref, ...restInnerProps },
  } = props;
  return (
    <div {...restInnerProps} ref={ref}>
      <div
        className={`${STYLE_PREFIX}__indicator ${STYLE_PREFIX}__clear-indicator`}
      >
        <TimesIcon />
      </div>
    </div>
  );
};

// Enable edit of the selected tag
// See https://github.com/JedWatson/react-select/issues/1558
const CustomInput = <Option extends SelectOption, IsMulti extends boolean>(
  props: InputProps<Option, IsMulti> & {
    selectProps: CustomSelectorInputProps<Option, IsMulti>;
  },
) => {
  return (
    <ReactSelectComponents.Input
      {...props}
      onPaste={props.selectProps.onPaste}
      name={props.selectProps.inputName}
      isHidden={false}
    />
  );
};

export interface SelectOption {
  label: string | React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
}

type CustomSelectorInputProps<
  Option extends SelectOption,
  IsMulti extends boolean,
> = Props<Option, IsMulti> &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CreatableProps<Option, IsMulti, any> & {
    className?: string;
    allowCreating?: boolean | undefined;
    noMatchMessage?: string | undefined;
    disabled?: boolean | undefined;
    darkMode?: boolean | undefined;
    hasError?: boolean | undefined;
    optionCustomization?: { rowHeight?: number | undefined } | undefined;
    onPaste?: React.ClipboardEventHandler<HTMLInputElement> | undefined;
    inputName?: string | undefined;
  };

export type SelectComponent = SelectInstance<SelectOption>;

export const CustomSelectorInput = <
  Option extends SelectOption = SelectOption,
  IsMulti extends boolean = false,
>(
  props: Omit<
    CustomSelectorInputProps<Option, IsMulti>,
    'value' | 'onChange'
  > & {
    inputRef?: React.Ref<SelectComponent>;
    value?: PropsValue<Option> | undefined;
    onChange:
      | ((
          newValue: OnChangeValue<Option, IsMulti>,
          actionMeta: ActionMeta<Option>,
        ) => void)
      | ((
          newValue: IsMulti extends true ? Option[] : Option,
          actionMeta: ActionMeta<Option>,
        ) => void);
  },
) => {
  const {
    allowCreating,
    noMatchMessage,
    disabled,
    components,
    className,
    darkMode,
    hasError,
    value,
    onChange,
    inputRef,
    ...innerProps
  } = props;
  // Typescript cannot union the 2 types due to many dissimilarities, this goes on to confuse React.createElement
  // See https://github.com/Microsoft/TypeScript/issues/28631
  // See https://github.com/microsoft/TypeScript/issues/28768
  // The issue is addressed better here
  // See https://github.com/microsoft/TypeScript/issues/28795
  // And the root problem as mentioned
  // See https://github.com/microsoft/TypeScript/issues/7294
  //
  // NOTE: since we're using an outdated version of `react-select`, we would get type issue
  // when we update to `react@18`
  // See https://github.com/finos/legend-studio/issues/615
  const Component = allowCreating ? CreatableSelect : Select;
  const stylePrefix: string = darkMode ? STYLE_PREFIX__DARK : STYLE_PREFIX;
  return (
    <Component<Option, IsMulti>
      // Make the menu always on top
      styles={{
        menuPortal: (base: CSSObjectWithLabel): CSSObjectWithLabel => ({
          ...base,
          zIndex: 9999,
        }),
      }}
      menuPortalTarget={document.body}
      // coercing a type for ref as we will eventually remove dependency on `react-select`
      // See https://github.com/finos/legend-studio/issues/615
      ref={inputRef as any} // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      value={value === undefined ? null : value}
      onChange={
        onChange as (
          newValue: OnChangeValue<Option, IsMulti>,
          actionMeta: ActionMeta<Option>,
        ) => void
      }
      isDisabled={Boolean(disabled)}
      className={clsx(stylePrefix, className, {
        'selector-input--has-error': hasError,
        'selector-input--custom': Boolean(props.optionCustomization),
      })}
      classNamePrefix={stylePrefix}
      components={{
        Option: CustomOption,
        ClearIndicator,
        DropdownIndicator,
        LoadingIndicator,
        MenuList: CustomMenuList,
        Input: CustomInput,
        ...components,
      }}
      {...{
        ...innerProps,
        darkMode,
        noMatchMessage,
      }}
    />
  );
};

export const compareLabelFn = (
  a: { label: string },
  b: { label: string },
): number => a.label.localeCompare(b.label);
