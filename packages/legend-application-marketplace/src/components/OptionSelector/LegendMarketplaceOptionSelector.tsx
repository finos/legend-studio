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

import { Button, ButtonGroup } from '@mui/material';
import { clsx } from '@finos/legend-art';

export const LegendMarketplaceOptionSelector = <T extends string>(props: {
  options: readonly T[];
  selectedOption: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabledOptions?: readonly T[] | undefined;
  disabledOptionTitle?: string | undefined;
  size?: 'small' | 'medium' | undefined;
}): React.ReactElement => {
  const {
    options,
    selectedOption,
    onChange,
    ariaLabel,
    disabledOptions,
    disabledOptionTitle,
    size,
  } = props;
  const isMedium = size === 'medium';

  return (
    <ButtonGroup variant="outlined" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = selectedOption === option;
        const isDisabled = disabledOptions?.includes(option) === true;
        return (
          <Button
            key={option}
            onClick={isDisabled ? undefined : () => onChange(option)}
            variant={isSelected ? 'contained' : 'outlined'}
            role="radio"
            aria-checked={isSelected}
            aria-disabled={isDisabled}
            title={isDisabled ? disabledOptionTitle : undefined}
            tabIndex={isSelected ? 0 : -1}
            className={clsx('legend-marketplace-option-selector__option', {
              'legend-marketplace-option-selector__option--medium': isMedium,
              'legend-marketplace-option-selector__option--unavailable':
                isDisabled,
            })}
            sx={{
              fontSize: '12px',
              backgroundColor: isSelected ? 'primary' : 'white',
            }}
          >
            {option}
          </Button>
        );
      })}
    </ButtonGroup>
  );
};
