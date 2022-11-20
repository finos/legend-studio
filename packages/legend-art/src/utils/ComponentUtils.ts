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

import { useState, useEffect, type WheelEvent } from 'react';

export { clsx, type ClassValue } from 'clsx';
export { Portal } from '@mui/material';

export { useResizeDetector } from 'react-resize-detector';

export function horizontalScroll(event: WheelEvent): void {
  if (event.deltaY === 0) {
    return;
  }
  event.currentTarget.scrollBy(event.deltaY, 0);
}

// React `setState` used to come with a callback that runs after the state is updated
// See https://www.robinwieruch.de/react-usestate-callback
export const useStateWithCallback = <T>(
  initialState: T,
  callback: (newState: T) => void,
): [T, (newValue: T) => void] => {
  const [state, setState] = useState(initialState);
  useEffect(() => callback(state), [state, callback]);
  return [state, setState];
};

export const getRootElement = (): Element => {
  let rootEl = document.getElementsByTagName('root').length
    ? document.getElementsByTagName('root')[0]
    : undefined;
  if (!rootEl) {
    rootEl = document.createElement('root');
    document.body.appendChild(rootEl);
  }
  return rootEl;
};
