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

import { prettyCONSTName, toTitleCase } from '@finos/legend-shared';
import { clsx } from 'clsx';
import { generateSimpleDIVComponent } from '../utils/ComponentCreatorUtils.js';

export const Modal: React.FC<{
  children?: React.ReactNode;
  className?: string;
  darkMode?: boolean;
}> = (props) => {
  const { children, darkMode, className } = props;
  return (
    <div className={clsx('modal', { 'modal--dark': darkMode }, className)}>
      {children}
    </div>
  );
};

export const ModalTitle: React.FC<{
  title: string;
  icon?: React.ReactNode;
  className?: string;
}> = (props) => {
  const { title, icon, className } = props;
  return (
    <div className={clsx('modal__title', className)}>
      {icon && <div className="modal__title__icon">{icon}</div>}
      <div className="modal__title__label">{toTitleCase(title)}</div>
    </div>
  );
};

export const ModalHeader: React.FC<{
  title?: string;
  children?: React.ReactNode;
  className?: string;
}> = (props) => {
  const { title, children, className } = props;

  if (!children && title) {
    return (
      <div className={clsx('modal__header', className)}>
        <ModalTitle title={title} />
      </div>
    );
  }
  return <div className={clsx('modal__header', className)}>{children}</div>;
};

export const ModalHeaderActions = generateSimpleDIVComponent(
  'ModalHeaderActions',
  'modal__header__actions',
);

export const ModalBody = generateSimpleDIVComponent('ModalBody', 'modal__body');

export const ModalFooter = generateSimpleDIVComponent(
  'ModalFooter',
  'modal__footer',
);

export const ModalFooterStatus = generateSimpleDIVComponent(
  'ModalFooterStatus',
  'modal__footer__status',
);

export const ModalFooterButton: React.FC<{
  title?: string;
  text?: string;
  darkMode?: boolean;
  disabled?: boolean;
  inProgressText?: string | undefined;
  children?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  formatText?: boolean | undefined;
  type?: 'primary' | 'secondary';
  preventFormSubmit?: boolean;
}> = (props) => {
  const {
    onClick,
    inProgressText,
    text,
    title,
    children,
    disabled,
    className,
    darkMode,
    formatText,
    type,
    preventFormSubmit,
  } = props;
  const isDarkMode = darkMode ?? true;
  const isFormatText = formatText ?? true;
  const isSecondary = type === 'secondary';
  const isPreventFormSubmit = preventFormSubmit ?? false;

  return (
    <button
      className={clsx(
        'btn',
        'modal__footer__btn',
        {
          'btn--dark': isDarkMode,
          'btn--light': !isDarkMode,
          'modal__footer__btn--primary': !isSecondary,
          'modal__footer__btn--secondary': isSecondary,
        },
        className,
      )}
      title={title}
      onClick={onClick}
      disabled={Boolean(inProgressText) || disabled}
      type={isPreventFormSubmit ? 'button' : undefined}
    >
      {inProgressText
        ? prettyCONSTName(inProgressText)
        : isFormatText
          ? prettyCONSTName(text)
          : text}
      {children}
    </button>
  );
};
