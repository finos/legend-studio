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
import { clsx } from 'clsx';

export const PanelListSelectorItem: React.FC<{
  title?: string;
  badgeTitle?: string | undefined;
  onSelect: () => void;
  isSelected: boolean;
  validationErrorMessage?: string | undefined;
}> = (props) => {
  const { title, badgeTitle, onSelect, isSelected, validationErrorMessage } =
    props;
  return (
    <div
      className={clsx(
        'panel__list-selector__item',
        {
          '': !isSelected,
        },
        {
          'panel__list-selector__item--selected': isSelected,
        },
        {
          'panel__list-selector__item--with-validation--error': Boolean(
            validationErrorMessage,
          ),
        },
        {
          'panel__list-selector__item--selected--with-validation--error':
            Boolean(validationErrorMessage) && isSelected,
        },
      )}
      onClick={onSelect}
    >
      {badgeTitle && (
        <div className="panel__header__title__label">
          {' '}
          {badgeTitle.toLowerCase()}{' '}
        </div>
      )}

      <div
        className="panel__list-selector__item__label"
        title={validationErrorMessage}
      >
        {title}
      </div>
    </div>
  );
};
