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
import {
  ExclamationCircleIcon,
  PencilIcon,
  TimesCircleIcon,
} from '../icon/Icon.js';
import { forwardRef } from 'react';

type InputWithInlineValidationProps =
  React.InputHTMLAttributes<HTMLInputElement> & {
    error?: string | undefined;
    warning?: string | undefined;
    showEditableIcon?: boolean | undefined;
  };

export const InputWithInlineValidation = forwardRef<
  HTMLInputElement,
  InputWithInlineValidationProps
>(function InputWithInlineValidation(props, ref) {
  const { error, warning, showEditableIcon, className, ...inputProps } = props;

  const showCautionMessage = Boolean(warning) && !error;

  return (
    <div className="input--with-validation">
      <input
        className={clsx(className, {
          'input--caution': showCautionMessage,
          'input--with-validation--error': Boolean(error),
        })}
        {...inputProps}
        ref={ref}
      />
      {showEditableIcon && !error && (
        <div className="input--with-validation__editable" title={error}>
          <PencilIcon className="input--with-validation__editable__indicator" />
        </div>
      )}
      {error && (
        <div className="input--with-validation__error" title={error}>
          <TimesCircleIcon className="input--with-validation__error__indicator" />
        </div>
      )}
      {showCautionMessage && (
        <div className="input--with-validation_caution" title={warning}>
          <ExclamationCircleIcon className="input--with-validation_caution__indicator" />
        </div>
      )}
    </div>
  );
});
