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

import { capitalize, prettyCONSTName, toTitleCase } from '@finos/legend-shared';
import { clsx } from 'clsx';
import { observer } from 'mobx-react-lite';
import { forwardRef, useEffect, useState } from 'react';
import { CheckSquareIcon, SquareIcon } from '../icon/Icon.js';
import { generateSimpleDIVComponent } from '../utils/ComponentCreatorUtils.js';

export const Panel = generateSimpleDIVComponent('Panel', 'panel');
export const PanelFullContent = generateSimpleDIVComponent(
  'PanelFullContent',
  'panel__content--full',
);

export const PanelHeader: React.FC<{
  title?: string;
  keepTitleFormat?: boolean | undefined;
  darkMode?: boolean | undefined;
  className?: string;
  labelClassName?: string;
  children?: React.ReactNode;
}> = (props) => {
  const {
    title,
    keepTitleFormat,
    labelClassName,
    darkMode,
    className,
    children,
  } = props;
  const isLightMode = Boolean(darkMode);
  const isKeepTitleFormat = Boolean(keepTitleFormat);
  return (
    <div className={clsx('panel__header', className)}>
      {title && (
        <div className="panel__header__title">
          <div
            className={clsx('panel__header__title__label', labelClassName, {
              'panel__header__title__label--light': isLightMode,
            })}
          >
            {isKeepTitleFormat ? title : title.toLowerCase()}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export const PanelSideBarHeader: React.FC<{
  title?: string;
  children?: React.ReactNode;
  className?: string;
  darkMode?: boolean;
}> = (props) => {
  const { title, children, className, darkMode } = props;
  return (
    <div
      className={clsx('panel__header side-bar__header', className, {
        'panel__header--dark': darkMode,
      })}
    >
      {title && (
        <div className="panel__header__title">
          <div className="panel__header__title__content side-bar__header__title__content">
            {title.toUpperCase()}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

export const PanelHeaderActions = generateSimpleDIVComponent(
  'PanelHeaderActions',
  'panel__header__actions',
);

export const PanelHeaderActionItem: React.FC<{
  title: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}> = (props) => {
  const { className, onClick, children, disabled, title } = props;
  return (
    <button
      className={clsx('panel__header__action', className)}
      disabled={Boolean(disabled)}
      onClick={onClick}
      title={title}
      tabIndex={-1}
    >
      {children}
    </button>
  );
};

export const PanelTabs: React.FC<{
  tabTitles: string[];
  changeTheTab: <T>(
    tab: T,
  ) => (event: React.MouseEvent<HTMLDivElement>) => void;
  selectedTab: string;
  className?: string;
  tabClassName: string;
}> = (props) => {
  const { tabTitles, changeTheTab, selectedTab, tabClassName } = props;

  return (
    <div className="panel__header panel__header--dark">
      <div className="panel__header__tabs">
        {tabTitles.map((tab) => (
          <div
            key={tab}
            onClick={changeTheTab(tab)}
            className={clsx(tabClassName, {
              [`${tabClassName}--active`]: tab === selectedTab,
            })}
          >
            {toTitleCase(prettyCONSTName(tab))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PanelContent: React.FC<{
  darkMode?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = (props) => {
  const { className, darkMode, children } = props;
  return (
    <div
      className={clsx('panel__content', className, {
        'panel__content--dark': darkMode,
      })}
    >
      {children}
    </div>
  );
};

export const PanelContentLists = generateSimpleDIVComponent(
  'PanelContentLists',
  'panel__content__lists',
);

export const PanelList = generateSimpleDIVComponent(
  'PanelList',
  'panel__content__form__list',
);

export const PanelListItem = generateSimpleDIVComponent(
  'PanelListItem',
  'panel__content__form__list__item',
);

export const PanelListItemTitle = generateSimpleDIVComponent(
  'PanelListItemTitle',
  'panel__content__form__list__item__title',
);

export const PanelListItemLabel = generateSimpleDIVComponent(
  'PanelListItemLabel',
  'panel__content__form__list__item__label',
);

export const PanelForm = generateSimpleDIVComponent(
  'PanelForm',
  'panel__content__form',
);

export const PanelDivider = generateSimpleDIVComponent(
  'PanelDivider',
  'panel__content__form__divider',
);

export const PanelFormDescription = generateSimpleDIVComponent(
  'PanelFormDescription',
  'panel__content__form__description',
);

export const PanelFormSection = generateSimpleDIVComponent(
  'PanelFormSection',
  'panel__content__form__section',
);

export const PanelFormValidatedTextField = forwardRef<
  HTMLInputElement,
  {
    name?: string;
    value: string | undefined;
    update: (value: string | undefined) => void;
    validate?: ((input: string) => string | undefined) | undefined;
    onValidate?: ((issue: string | undefined) => void) | undefined;
    onBlur?: React.ChangeEventHandler<HTMLInputElement> | undefined;
    prompt?: string | React.ReactNode;
    placeholder?: string;
    isReadOnly?: boolean;
    className?: string | undefined;
    errorMessageClassName?: string | undefined;
    inputType?: string | undefined;
    darkMode?: boolean;
    fullWidth?: boolean;
  }
>(function PanelFormValidatedTextField(props, ref) {
  const {
    name,
    value,
    update,
    prompt,
    errorMessageClassName,
    placeholder,
    validate,
    onValidate,
    onBlur,
    isReadOnly,
    className,
    darkMode,
    fullWidth,
    inputType,
  } = props;
  const [inputValue, setInputValue] = useState(value ?? '');
  const validationErrorMessage = validate?.(inputValue) ?? undefined;

  const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setInputValue(event.target.value);
  };

  useEffect(() => {
    if (!validationErrorMessage && value !== inputValue) {
      update(inputValue);
    }
    onValidate?.(validationErrorMessage);
  }, [value, inputValue, validationErrorMessage, onValidate, update]);

  return (
    <PanelFormSection>
      {name && (
        <div className="panel__content__form__section__header__label">
          {capitalize(name)}
        </div>
      )}
      {prompt && (
        <div className="panel__content__form__section__header__prompt">
          {prompt}
        </div>
      )}
      <div className="input-group">
        <input
          className={clsx(
            'input input-group__input panel__content__form__section__input',
            className,
            { 'input--dark': darkMode ? darkMode : true },
            { 'input--small': !fullWidth },
          )}
          ref={ref}
          type={inputType ? inputType : 'text'}
          spellCheck={false}
          disabled={isReadOnly}
          placeholder={placeholder}
          value={inputValue}
          onChange={changeValue}
          onBlur={onBlur}
        />
        {validationErrorMessage && (
          <div
            className={clsx(
              'panel__content__form__section__input-group__error-message input-group__error-message',
              { 'input--small': !fullWidth },
              errorMessageClassName,
            )}
          >
            {validationErrorMessage}
          </div>
        )}
      </div>
    </PanelFormSection>
  );
});

export const PanelFormTextField = forwardRef<
  HTMLInputElement,
  {
    name: string;
    value: string | undefined;
    update: (value: string | undefined) => void;
    prompt?: string;
    placeholder?: string;
    errorMessage?: string | undefined;
    isReadOnly?: boolean;
    className?: string | undefined;
    inputType?: string | undefined;
    darkMode?: boolean;
    fullWidth?: boolean;
  }
>(function PanelFormTextField(props, ref) {
  const {
    name,
    value,
    update,
    prompt,
    placeholder,
    isReadOnly,
    errorMessage,
    className,
    darkMode,
    fullWidth,
    inputType,
  } = props;

  const inputValue = value ?? '';
  const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const stringValue = event.target.value;
    const updatedValue = stringValue ? stringValue : undefined;
    update(updatedValue);
  };

  return (
    <PanelFormSection>
      <div className="panel__content__form__section__header__label">
        {capitalize(name)}
      </div>
      <div className="panel__content__form__section__header__prompt">
        {prompt}
      </div>
      <div className="input-group">
        <input
          className={clsx(
            'input input-group__input panel__content__form__section__input',
            className,
            { 'input--dark': darkMode ? darkMode : true },
            { 'input--small': !fullWidth },
          )}
          ref={ref}
          type={inputType ? inputType : 'text'}
          spellCheck={false}
          disabled={isReadOnly}
          placeholder={placeholder}
          value={inputValue}
          onChange={changeValue}
        />
        {errorMessage && (
          <div
            className={clsx(
              'panel__content__form__section__input-group__error-message input-group__error-message',
              { 'input--small': !fullWidth },
            )}
          >
            {errorMessage}
          </div>
        )}
      </div>
      {errorMessage && <PanelDivider />}
    </PanelFormSection>
  );
});

/**
 * NOTE: this is a WIP we did to quickly assemble a modular UI for relational database connection editor
 * This is subjected to change and review, especially in terms in UX.
 */
export const PanelFormBooleanField = observer(
  (props: {
    name?: string;
    prompt?: string;
    value: boolean | undefined;
    children?: React.ReactNode;
    isReadOnly: boolean;
    update: (value: boolean | undefined) => void;
  }) => {
    const { value, name, prompt, children, isReadOnly, update } = props;
    const toggle = (): void => {
      if (!isReadOnly) {
        update(!value);
      }
    };

    return (
      <PanelFormSection>
        {name && (
          <div className="panel__content__form__section__header__label">
            {capitalize(name)}
          </div>
        )}
        <div
          className={clsx('panel__content__form__section__toggler', {
            'panel__content__form__section__toggler--disabled': isReadOnly,
          })}
          onClick={toggle}
        >
          <button
            type="button"
            className={clsx('panel__content__form__section__toggler__btn', {
              'panel__content__form__section__toggler__btn--toggled': value,
            })}
            disabled={isReadOnly}
            tabIndex={-1}
          >
            {value ? <CheckSquareIcon /> : <SquareIcon />}
          </button>
          <div className="panel__content__form__section__toggler__prompt">
            {prompt} {children}
          </div>
        </div>
      </PanelFormSection>
    );
  },
);

export const PanelFormListItems: React.FC<{
  title?: string;
  prompt?: string;
  children: React.ReactNode;
}> = (props) => {
  const { children, title, prompt } = props;
  return (
    <PanelFormSection>
      {title && (
        <div className="panel__content__form__section__header__label">
          {title}
        </div>
      )}
      {prompt && (
        <div className="panel__content__form__section__header__prompt">
          {prompt}
        </div>
      )}
      <div className="panel__content__form__section__list__items">
        {children}
      </div>
    </PanelFormSection>
  );
};

export const PanelFormActions = generateSimpleDIVComponent(
  'PanelFormActions',
  'panel__content__form__actions',
);
