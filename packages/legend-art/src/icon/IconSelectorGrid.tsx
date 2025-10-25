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

import { IconSelectorIcons } from './Icon.js';
import { observer } from 'mobx-react-lite';
import { clsx } from '../utils/ComponentUtils.js';

export const IconSelectorGrid = observer(
  (props: {
    iconId: string | undefined;
    onChange: (value: string | undefined) => void;
    isReadOnly: boolean;
    disableHighlightNoneOption?: boolean;
  }): React.ReactNode => {
    const { iconId, onChange, isReadOnly, disableHighlightNoneOption } = props;

    return (
      <div className="icon-selector__grid">
        <div
          onClick={
            isReadOnly
              ? undefined
              : () => {
                  onChange(undefined);
                }
          }
          className={clsx(
            'icon-selector__grid__option icon-selector__grid__option--none',
            {
              'icon-selector__grid__option--selected':
                !disableHighlightNoneOption && iconId === undefined,
              'icon-selector__grid__option--disabled': isReadOnly,
            },
          )}
        >
          None
        </div>
        {Object.entries(IconSelectorIcons).map(([key, Icon]) => (
          <div
            key={key}
            className={clsx('icon-selector__grid__option', {
              'icon-selector__grid__option--selected': iconId === key,
              'icon-selector__grid__option--disabled': isReadOnly,
            })}
            onClick={
              isReadOnly
                ? undefined
                : () => {
                    onChange(key);
                  }
            }
          >
            <Icon />
          </div>
        ))}
      </div>
    );
  },
);
