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

import { uuid } from '@finos/legend-shared';
import {
  type RadioGroupProps as MuiRadioGroupProps,
  RadioGroup as MuiRadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material';
import { clsx } from 'clsx';

const transformToMatrix = (arr: unknown[], stepSize: number): unknown[][] => {
  const matrix = [];
  for (let i = 0; i < arr.length; i += stepSize) {
    matrix.push(arr.slice(i, i + stepSize));
  }
  return matrix;
};

export const BaseRadioGroup: React.FC<
  {
    options: unknown[];
    /**
     * Display raidio buttons in a [n, size] matrix
     */
    size: number;
    className?: string | undefined;
  } & MuiRadioGroupProps
> = (props) => {
  const { children, options, size, className, ...otherProps } = props;
  // For displaying avaible options in a [n,size] matrix
  const targetOptionsValuesInMatrix = transformToMatrix(
    options,
    size,
  ) as never[][];

  return (
    <div className={clsx('mui-radio-group', className)}>
      {targetOptionsValuesInMatrix.map((row) => (
        <div key={uuid()}>
          <MuiRadioGroup className="mui-radio-group__group" {...otherProps}>
            {row.map((op) => (
              <FormControlLabel
                className="mui-radio-group__group__column"
                key={op}
                value={op}
                control={
                  <Radio className="mui-radio-group__group__item__radio-btn" />
                }
                label={
                  <div className="mui-radio-group__group__item__label">
                    {op}
                  </div>
                }
              />
            ))}
          </MuiRadioGroup>
        </div>
      ))}
      {children}
    </div>
  );
};
