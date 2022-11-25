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

import { toTitleCase } from '@finos/legend-shared';
import { clsx } from 'clsx';

export const Button: React.FC<{
  title?: string;
  className?: string;
  darkMode?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
  tabIndex?: number;
  onClick?: (() => void) | undefined;
}> = (props) => {
  const { title, disabled, tabIndex, darkMode, className, children, onClick } =
    props;
  return (
    <button
      className={clsx('btn', className, {
        'btn--dark': darkMode ? darkMode : true,
      })}
      onClick={onClick}
      disabled={Boolean(disabled)}
      title={toTitleCase(title)}
      tabIndex={tabIndex}
    >
      {children}
      {/* button labels should be Title Case */}
    </button>
  );
};
