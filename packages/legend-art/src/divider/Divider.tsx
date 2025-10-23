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

import { clsx } from '../utils/ComponentUtils.js';

export const DividerWithText: React.FC<{
  children?: React.ReactNode;
  className?: string;
}> = (props) => {
  const { children, className } = props;

  return (
    <div className={clsx('divider-with-text', className)}>
      <div className="divider-with-text__border" />
      <span className="divider-with-text__content">{children}</span>
      <div className="divider-with-text__border" />
    </div>
  );
};
