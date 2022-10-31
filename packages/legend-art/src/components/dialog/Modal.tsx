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

import { toTitleCase } from '@finos/legend-shared';
import { clsx } from 'clsx';
import { generateSimpleDIVComponent } from '../ComponentCreatorUtils.js';

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
