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

import {
  type StepperProps as MuiStepperProps,
  Stepper as MuiStepper,
  Step as MuiStep,
  StepLabel as MuiStepLabel,
} from '@mui/material';
import { clsx } from '../utils/ComponentUtils.js';

export const BaseStepper: React.FC<
  {
    className?: string | undefined;
    steps: string[];
    stepCompleteStatus?: boolean[];
  } & MuiStepperProps
> = (props) => {
  const { children, className, steps, stepCompleteStatus, ...otherProps } =
    props;
  return (
    <div className={clsx('mui-stepper', className)}>
      <MuiStepper className="mui-stepper__container" {...otherProps}>
        {steps.map((label, index) => {
          const stepProps: { completed?: boolean } = {};
          if (stepCompleteStatus?.[index]) {
            stepProps.completed = false;
          }
          return (
            <MuiStep className="mui-stepper__step" key={label} {...stepProps}>
              <MuiStepLabel className="mui-stepper__step__step-label">
                <div className="mui-stepper__step__step-label__label">
                  {label}
                </div>
              </MuiStepLabel>
            </MuiStep>
          );
        })}
      </MuiStepper>
    </div>
  );
};
