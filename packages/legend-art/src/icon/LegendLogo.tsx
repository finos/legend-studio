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

export const LegendLogo: React.FC<{
  className?: string;
}> = (props) => {
  const { className } = props;
  return (
    <div className={clsx('logo', className)}>
      <svg
        stroke="currentColor"
        fill="currentColor"
        strokeWidth="0"
        width="1em"
        height="1em"
        viewBox="0 0 215 215"
        xmlns="https://www.w3.org/2000/svg"
      >
        <g transform="matrix(1.0246,0,0,0.999998,1.03751,2.43115)">
          <path d="M141.9,86.5L141.9,68.1C141.9,66.5 140.7,65.2 139.1,65.2L66.5,65.2C64.9,65.2 63.7,66.5 63.7,68.1L63.7,86.5C63.7,88.1 64.9,89.4 66.5,89.4L139.1,89.4C140.7,89.4 141.9,88.1 141.9,86.5Z" />
        </g>
        <g transform="matrix(1.0246,0,0,0.999998,1.03751,2.43115)">
          <path d="M118.4,116.9L118.4,98.5C118.4,96.9 117.5,95.6 116.4,95.6L65.7,95.6C64.6,95.6 63.7,96.9 63.7,98.5L63.7,116.9C63.7,118.5 64.6,119.8 65.7,119.8L116.5,119.8C117.6,119.8 118.4,118.6 118.4,116.9Z" />
        </g>
        <g transform="matrix(1.0246,0,0,0.999998,1.03751,2.43115)">
          <path d="M141.9,147.3L141.9,129C141.9,127.4 140.7,126.1 139.1,126.1L66.5,126.1C64.9,126.1 63.7,127.4 63.7,129L63.7,147.4C63.7,149 64.9,150.3 66.5,150.3L139.1,150.3C140.7,150.3 141.9,149 141.9,147.3Z" />
        </g>
        <g transform="matrix(1.0246,0,0,0.999998,1.03751,2.43115)">
          <path d="M205,170.7L152.7,139.1C150,137.4 147.7,138.7 147.7,141.9L147.7,157.9L55.8,157.9L55.8,59.4L67.2,59.4C70.4,59.4 71.7,57.2 70,54.4L38.4,2.1C36.7,-0.6 34.1,-0.6 32.4,2.1L0.7,54.4C-1,57.1 0.3,59.4 3.5,59.4L15.6,59.4L15.6,185.5C15.6,188.5 18,190.9 21,190.9L147.7,190.9L147.7,205.7C147.7,208.9 149.9,210.1 152.7,208.5L205,176.9C207.7,175.1 207.7,172.4 205,170.7Z" />
        </g>
      </svg>
    </div>
  );
};
