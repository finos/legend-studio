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

export const LegendMarketplaceOptionSelector = <T extends string>(props: {
  options: readonly T[];
  selectedOption: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}): React.ReactElement => {
  const { options, selectedOption, onChange, ariaLabel } = props;

  return (
    <ButtonGroup variant="outlined" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const isSelected = selectedOption === option;
        return (
          <Button
            key={option}
            onClick={() => onChange(option)}
            variant={isSelected ? 'contained' : 'outlined'}
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
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
