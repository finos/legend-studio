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

import { capitalize } from '@finos/legend-shared';
import { clsx } from 'clsx';
import { observer } from 'mobx-react-lite';

export const PanelHeaderActionItem: React.FC<{
  tip: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}> = (props) => {
  const { className, onClick, children, disabled, tip } = props;
  return (
    <button
      className={clsx('panel__header__action', className)}
      disabled={Boolean(disabled)}
      onClick={onClick}
      title={tip}
    >
      {children}
    </button>
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
        <div className="panel__header__title__label">{title}</div>
      </div>
      {children && <div className="panel__header__actions">{children}</div>}
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

export const PanelFormRow: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = (props) => {
  const { children } = props;
  return <div className="panel__content__form__row">{children}</div>;
};

export const PanelStringEditor = observer(
  (props: {
    propertyName: string;
    description?: string;
    padding?: boolean;
    value: string | undefined;
    isReadOnly: boolean;
    update: (value: string | undefined) => void;
  }) => {
    const { value, propertyName, description, padding, isReadOnly, update } =
      props;
    const displayValue = value ?? '';
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const stringValue = event.target.value;
      const updatedValue = stringValue ? stringValue : undefined;
      update(updatedValue);
    };

    return (
      <div
        className={clsx('panel__content__form__section', {
          'panel__content__form__section--padding': padding,
        })}
      >
        <div className="panel__content__form__section__header__label">
          {capitalize(propertyName)}
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
      </div>
    );
  },
);
