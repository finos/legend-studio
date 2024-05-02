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

import { forwardRef } from 'react';
import { clsx } from 'clsx';
import { generateSimpleDIVComponent } from '../utils/ComponentCreatorUtils.js';

export const MenuContent = forwardRef<
  HTMLDivElement,
  { className?: string; children: React.ReactNode }
>(function MenuContent(props, ref) {
  const { className, children, ...otherProps } = props;
  return (
    <div ref={ref} className={clsx('menu', className)} {...otherProps}>
      {children}
    </div>
  );
});

export const MenuContentItem: React.FC<{
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string | undefined;
  onClick?: () => void;
}> = (props) => {
  const { className, onClick, title, disabled, children, ...otherProps } =
    props;
  return (
    <button
      className={clsx('menu__item', className)}
      disabled={Boolean(disabled)}
      title={title}
      onClick={onClick}
      {...otherProps}
    >
      {children}
    </button>
  );
};

export const MenuContentDivider = generateSimpleDIVComponent(
  'MenuContentDivider',
  'menu__divider',
);

export const MenuContentItemIcon = generateSimpleDIVComponent(
  'MenuContentItemIcon',
  'menu__item__icon',
);

export const MenuContentItemBlankIcon: React.FC<{
  className?: string;
}> = (props) => {
  const { className, ...otherProps } = props;
  return (
    <div className={clsx('menu__item__icon', className)} {...otherProps} />
  );
};

export const MenuContentItemLabel = generateSimpleDIVComponent(
  'MenuContentItemLabel',
  'menu__item__label',
);
