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

import React, {
  type CSSProperties,
  useRef,
  useEffect,
  forwardRef,
  type LegacyRef,
} from 'react';
import { CaretDownIcon, TimesIcon, CircleNotchIcon } from './Icon.js';
import { FixedSizeList } from 'react-window';
import type { PlainObject } from '@finos/legend-shared';

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
import { default as ReactSelect } from './CJS__ReactSelect.cjs';
import type { default as CreatableSelect } from 'react-select/creatable';
import type {
  default as Select,
  InputProps,
  Props,
  InputActionMeta,
} from 'react-select';

export type InputActionData = InputActionMeta;

export const createFilter = ReactSelect.Select.createFilter;
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
const CustomMenuList: React.FC<{
  options: PlainObject[];
  children: React.Component<ListChildComponentProps>[];
  getValue: () => [PlainObject];
  selectProps: CustomSelectorInputProps;
}> = (props) => {
  // Get row height in pixel since `react-window` does not support `rem`
  // See https://stackoverflow.com/questions/45001097/convert-rem-to-px-without-reflow
  const ROW_HEIGHT =
    parseInt(getComputedStyle(document.documentElement).fontSize, 10) * 3.5;
  const MAX_OPTIONS_LENGTH = 6;
  const { options, children, getValue, selectProps } = props;
  const [value] = getValue();
  const initialOffset = options.indexOf(value) * ROW_HEIGHT;
  const scrollToIndex = children.length
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
  if (children.length) {
    return (
      <FixedSizeList
        className={
          selectProps.darkMode ? 'scrollbar--light selector-menu--dark' : ''
        }
        ref={listRef}
        width="100%"
        height={Math.min(children.length, MAX_OPTIONS_LENGTH) * ROW_HEIGHT}
        itemCount={children.length}
        itemSize={ROW_HEIGHT}
        initialScrollOffset={initialOffset}
      >
        {({ index, style }): React.ReactElement<ListChildComponentProps> => (
          <div style={style}>{children[index] as React.ReactNode}</div>
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

const STYLE_PREFIX = 'selector-input';
const STYLE_PREFIX__DARK = 'selector-input--dark';

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

const ClearIndicator: React.FC<{
  innerProps: {
    ref: React.RefObject<HTMLDivElement>;
  };
}> = (props) => {
  const {
    innerProps: { ref, ...innerProps },
  } = props;
  return (
    <div {...innerProps} ref={ref}>
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
const CustomInput: React.FC<InputProps> = (props) => (
  <ReactSelect.Select.components.Input {...props} isHidden={false} />
);

export interface SelectOption {
  label: string;
  value?: string;
}

interface CustomSelectorInputProps extends Props<SelectOption, true> {
  className?: string;
  allowCreating?: boolean;
  noMatchMessage?: string;
  disabled?: boolean;
  darkMode?: boolean;
  hasError?: boolean;
  option?: React.Component;
}

export type SelectComponent =
  | CreatableSelect.default<SelectOption>
  | Select.default;

export const CustomSelectorInput = forwardRef<
  SelectComponent,
  CustomSelectorInputProps
>(function CustomSelectorInput(props, ref) {
  const {
    option,
    allowCreating,
    noMatchMessage,
    disabled,
    components,
    className,
    darkMode,
    hasError,
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
  const SelectComponent: React.ElementType = allowCreating
    ? ReactSelect.CreatableSelect.default
    : ReactSelect.Select.default;
  const stylePrefix = darkMode ? STYLE_PREFIX__DARK : STYLE_PREFIX;
  return (
    <SelectComponent
      // Make the menu always on top
      styles={{
        menuPortal: (base: CSSProperties): CSSProperties => ({
          ...base,
          zIndex: 9999,
        }),
      }}
      menuPortalTarget={document.body}
      // coercing a type for ref as we will eventually remove dependency on `react-select`
      // See https://github.com/finos/legend-studio/issues/615
      ref={ref as LegacyRef<any>} // eslint-disable-line @typescript-eslint/no-explicit-any
      isDisabled={Boolean(disabled)}
      className={`${stylePrefix} ${className} ${
        hasError ? 'selector-input--has-error' : ''
      }`}
      classNamePrefix={stylePrefix}
      components={{
        ClearIndicator,
        DropdownIndicator,
        LoadingIndicator,
        MenuList: CustomMenuList,
        Input: CustomInput,
        ...components,
      }}
      {...{ ...innerProps, darkMode, noMatchMessage }}
    />
  );
});

export const compareLabelFn = (
  a: { label: string },
  b: { label: string },
): number => a.label.localeCompare(b.label);
