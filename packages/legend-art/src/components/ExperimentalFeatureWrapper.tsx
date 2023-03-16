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
import { ExclamationIcon } from './Icon.js';

export const ExperimentalFeatureWrapper: React.FC<{
  children: React.ReactNode;
  className?: string;
  title?: string;
}> = (props) => {
  const { children, className, title } = props;
  return (
    <div
      title={title ?? 'Experimental feature'}
      className={clsx('experimental__feature__container', { className })}
    >
      {children}
      <div
        title="Experimental feature"
        className="experimental__feature__icon__container"
      >
        <div className="experimental__feature__icon">
          <ExclamationIcon />
        </div>
      </div>
    </div>
  );
};
