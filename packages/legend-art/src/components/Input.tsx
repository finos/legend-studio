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
import { TimesCircleIcon } from './CJS__Icon.cjs';

export const InputWithInlineValidation: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    validationErrorMessage?: string | undefined;
  }
> = (props) => {
  const { validationErrorMessage, className, ...inputProps } = props;
  return (
    <div className="input--with-validation">
      <input
        className={clsx(className, {
          'input--with-validation--error': Boolean(validationErrorMessage),
        })}
        {...inputProps}
      />
      {validationErrorMessage && (
        <div
          className="input--with-validation__error"
          title={validationErrorMessage}
        >
          <TimesCircleIcon className="input--with-validation__error__indicator" />
        </div>
      )}
    </div>
  );
};
