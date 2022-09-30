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
import React from 'react';
import { CheckSquareIcon, SquareIcon, TimesCircleIcon } from '../CJS__Icon.cjs';

export const PanelHeaderActionItem: React.FC<{
  title: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}> = (props) => {
  const { className, onClick, children, disabled, title } = props;
  return (
    <div className="panel__header__actions">
      <button
        className={clsx('panel__header__action', className)}
        disabled={Boolean(disabled)}
        onClick={onClick}
        title={title}
      >
        {children}
      </button>
    </div>
  );
};

export const PanelHeader: React.FC<{
  title: string;
  children?: React.ReactNode;
  className?: string;
}> = (props) => {
  const { title, children } = props;
  return (
    <div className="panel__header">
      <div className="panel__header__title">
        <div className="panel__header__title__label">{title.toLowerCase()}</div>
      </div>
      {children}
    </div>
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
    <div className="panel__header">
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

export const PanelForm: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = (props) => {
  const { children } = props;
  return <div className="panel__content__form">{children}</div>;
};

export const PanelSection: React.FC<{
  children: React.ReactNode;
}> = (props) => {
  const { children } = props;
  const addElementSections = (
    sectionChildren: React.ReactNode,
  ): JSX.Element[] | JSX.Element => {
    const section = React.Children.map(sectionChildren, (child) => {
      if (React.isValidElement(child)) {
        const elementChild: React.ReactElement = child;
        return (
          <div className="panel__content__form__section">{elementChild}</div>
        );
      } else {
        return <></>;
      }
    });
    if (section) {
      return section;
    } else {
      return <></>;
    }
  };

  return <> {addElementSections(children)} </>;
};

export const PanelContent: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = (props) => {
  const { children, className } = props;
  return <div className={clsx('panel__content', className)}>{children}</div>;
};

export const PanelList: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = (props) => {
  const { children, className } = props;
  return (
    <div className={clsx('panel__content__form__list', className)}>
      {children}
    </div>
  );
};

export const PanelListItem: React.FC<{
  className?: string;
  children: React.ReactNode;
}> = (props) => {
  const { children, className } = props;
  return (
    <div className={clsx('panel__content__form__list__item', className)}>
      {children}
    </div>
  );
};

export const Panel: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = (props) => {
  const { children, className } = props;
  return <div className={clsx('panel', className)}>{children}</div>;
};

export const PanelFullContent: React.FC<{
  children?: React.ReactNode;
}> = (props) => {
  const { children } = props;
  return <div className="panel__content--full">{children}</div>;
};

export const PanelFormTextEditor = observer(
  (props: {
    name: string;
    description?: string;
    value: string | undefined;
    isReadOnly: boolean;
    update: (value: string | undefined) => void;
  }) => {
    const { value, name, description, isReadOnly, update } = props;
    const displayValue = value ?? '';
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const stringValue = event.target.value;
      const updatedValue = stringValue ? stringValue : undefined;
      update(updatedValue);
    };

    return (
      <>
        <div className="panel__content__form__section__header__label">
          {capitalize(name)}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <input
          className="panel__content__form__section__input"
          spellCheck={false}
          disabled={isReadOnly}
          value={displayValue}
          onChange={changeValue}
        />
      </>
    );
  },
);

export const PanelFormTextEditorWithValidation = observer(
  (props: {
    name: string;
    description?: string;
    value: string | undefined;
    isReadOnly: boolean;
    validationErrorMessage?: string | undefined;
    update: (value: string | undefined) => void;
  }) => {
    const {
      validationErrorMessage,
      value,
      name,
      description,
      isReadOnly,
      update,
    } = props;
    const displayValue = value ?? '';
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const stringValue = event.target.value;
      const updatedValue = stringValue ? stringValue : undefined;
      update(updatedValue);
    };

    return (
      <>
        <div className="panel__content__form__section__header__label">
          {capitalize(name)}
        </div>
        <div className="panel__content__form__section__header__prompt">
          {description}
        </div>
        <div className="panel__content__form__section__input--with-validation">
          <input
            className={clsx('panel__content__form__section__input', {
              'input--with-validation--error': Boolean(validationErrorMessage),
            })}
            spellCheck={false}
            disabled={isReadOnly}
            value={displayValue}
            onChange={changeValue}
          />
          {validationErrorMessage && (
            <div
              className="panel__content__form__section__input--with-validation__error"
              title={validationErrorMessage}
            >
              <TimesCircleIcon className="panel__content__form__section__input--with-validation__error__indicator" />
            </div>
          )}
        </div>
      </>
    );
  },
);

/**
 * NOTE: this is a WIP we did to quickly assemble a modular UI for relational database connection editor
 * This is subjected to change and review, especially in terms in UX.
 */
export const PanelFormBooleanEditor = observer(
  (props: {
    name: string;
    description?: string;
    value: boolean | undefined;
    isReadOnly: boolean;
    update: (value: boolean | undefined) => void;
  }) => {
    const { value, name, description, isReadOnly, update } = props;
    const toggle = (): void => {
      if (!isReadOnly) {
        update(!value);
      }
    };

    return (
      <>
        <div className="panel__content__form__section__header__label">
          {capitalize(name)}
        </div>
        <div
          className={clsx('panel__content__form__section__toggler', {
            'panel__content__form__section__toggler--disabled': isReadOnly,
          })}
          onClick={toggle}
        >
          <button
            className={clsx('panel__content__form__section__toggler__btn', {
              'panel__content__form__section__toggler__btn--toggled': value,
            })}
            disabled={isReadOnly}
            tabIndex={-1}
          >
            {value ? <CheckSquareIcon /> : <SquareIcon />}
          </button>
          <div className="panel__content__form__section__toggler__prompt">
            {description}
          </div>
        </div>
      </>
    );
  },
);

export const PanelFormToogleEditor = observer(
  (props: {
    isToogled: boolean;
    prompt: string;
    update: (value: boolean | undefined) => void;
  }) => {
    const { isToogled, prompt, update } = props;
    const toggleValue: React.MouseEventHandler<HTMLInputElement> = () => {
      update(!isToogled);
    };

    return (
      <div
        className={clsx('panel__content__form__section__toggler')}
        onClick={toggleValue}
      >
        <button
          className={clsx('panel__content__form__section__toggler__btn', {
            'panel__content__form__section__toggler__btn--toggled': isToogled,
          })}
        >
          {!isToogled ? <SquareIcon /> : <CheckSquareIcon />}
        </button>
        <div className="panel__content__form__section__toggler__prompt">
          {prompt}
        </div>
      </div>
    );
  },
);
