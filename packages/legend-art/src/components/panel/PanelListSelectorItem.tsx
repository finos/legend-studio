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
  title: string;
  onSelect: () => void;
  isSelected: boolean;
  validationErrorMessage?: string | undefined;
}> = (props) => {
  const { title, onSelect, isSelected, validationErrorMessage } = props;
  return (
    <div
      className={clsx(
        'panel__explorer__item',
        {
          '': !isSelected,
        },
        {
          'panel__explorer__item--selected': isSelected,
        },
        {
          'panel__explorer__item--with-validation--error': Boolean(
            validationErrorMessage,
          ),
        },
        {
          'panel__explorer__item--selected--with-validation--error':
            Boolean(validationErrorMessage) && isSelected,
        },
      )}
      onClick={onSelect}
    >
      <div
        className="panel__explorer__item__label"
        title={validationErrorMessage}
      >
        {title}
      </div>
    </div>
  );
};
