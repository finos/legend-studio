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

export const Badge: React.FC<{
  title: string;
  tooltip?: string;
  className?: string;
}> = (props) => {
  const { title, className, tooltip } = props;
  return (
    <div className={clsx('badge', className)} title={tooltip}>
      {title.toLowerCase()}
    </div>
  );
};
