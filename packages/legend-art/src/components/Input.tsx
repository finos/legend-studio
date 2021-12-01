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
import styled from '@emotion/styled';
import { css, cx } from '@emotion/css';
import { TimesCircleIcon } from './Icon';

const InputGroup = styled.div`
  position: relative;
`;

const class__InputValidationErrorStyle = css`
  border: 0.1rem solid var(--color-red-300);
  background: var(--color-red-500);
  padding-right: 2.3rem;

  :focus {
    border: 0.1rem solid var(--color-red-300);
  }
`;

const InputValidationErrorIndicator = styled.div`
  position: absolute;
  right: 0.5rem;
  top: calc(50% - 0.7rem);
`;

const class__InputValidationErrorIndicatorIcon = css`
  color: var(--color-red-180);
`;

export const InputWithInlineValidation: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    validationErrorMessage?: string | undefined;
  }
> = (props) => {
  const { validationErrorMessage, className, ...inputProps } = props;
  return (
    <InputGroup>
      <input
        className={cx(className, {
          [class__InputValidationErrorStyle]: Boolean(validationErrorMessage),
        })}
        {...inputProps}
      />
      {validationErrorMessage && (
        <InputValidationErrorIndicator title={validationErrorMessage}>
          <TimesCircleIcon
            className={class__InputValidationErrorIndicatorIcon}
          />
        </InputValidationErrorIndicator>
      )}
    </InputGroup>
  );
};
