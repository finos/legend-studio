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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Draggable from 'react-draggable';
import { Resizable, ResizableBox } from 'react-resizable';
import { Rnd } from 'react-rnd';
import { debounce, throttle, type DebouncedFunc } from '@finos/legend-shared';

export { clsx, type ClassValue };
export { Portal, useForkRef } from '@mui/material';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export { Global, css } from '@emotion/react';
export { Draggable };
export { Resizable, ResizableBox };
export { Rnd as ResizableAndDraggableBox };

/**
 * React `setState` used to come with a callback that runs after the state is updated
 * See https://www.robinwieruch.de/react-usestate-callback
 */
export const useStateWithCallback = <T>(
  initialState: T,
  callback: (newState: T) => void,
): [T, (newValue: T) => void] => {
  const [state, setState] = useState(initialState);
  useEffect(() => callback(state), [state, callback]);
  return [state, setState];
};

/**
 * Use ResizeObserver to detect size of an element
 * Adapted from `react-resize-detector`
 *
 * See https://github.com/maslianok/react-resize-detector
 * See https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
 */
export function useResizeDetector<
  T extends HTMLElement = HTMLElement,
>(options?: {
  /**
   * Do not trigger update when a component mounts.
   */
  skipOnMount?: boolean;
  refreshMode?: 'throttle' | 'debounce';
  refreshRate?: number;
  refreshOptions?: { leading?: boolean; trailing?: boolean } | undefined;
  /**
   * NOTE: Make sure to wrap this with `useCallback` to avoid unnecessary re-renders.
   */
  onResize?:
    | ((
        payload:
          | { width: number; height: number; entry: ResizeObserverEntry }
          | { width: undefined; height: undefined; entry: undefined },
      ) => void)
    | undefined;
  targetRef?: React.RefObject<T | null> | undefined;
}): {
  ref: React.RefObject<T | null>;
  width?: number | undefined;
  height?: number | undefined;
} {
  // If `skipOnMount` is enabled, skip the first resize event
  const skipResize = useRef<boolean>(options?.skipOnMount);
  const refreshMode = options?.refreshMode;
  const refreshRate = options?.refreshRate ?? 1000;
  const refreshOptions = useMemo(
    () => ({
      leading: options?.refreshOptions?.leading,
      trailing: options?.refreshOptions?.trailing,
    }),
    [options?.refreshOptions?.leading, options?.refreshOptions?.trailing],
  );

  const [size, setSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });
  const _ref = useRef<T>(null);
  const ref = useMemo(() => options?.targetRef ?? _ref, [options?.targetRef]);

  const onResize = options?.onResize;
  const resizeCallback = useCallback(
    (entries: ResizeObserverEntry[]) => {
      if (skipResize.current) {
        skipResize.current = false;
        return;
      }

      entries.forEach((entry) => {
        const nextSize = {
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        };
        setSize((prevSize) => {
          if (
            prevSize.width === nextSize.width &&
            prevSize.height === nextSize.height
          ) {
            return prevSize;
          }
          onResize?.({
            width: nextSize.width,
            height: nextSize.height,
            entry,
          });
          return nextSize;
        });
      });
    },
    [skipResize, onResize],
  );

  // customize refresh behavior
  const resizeHandler = useMemo(() => {
    switch (refreshMode) {
      case 'debounce':
        return debounce(resizeCallback, refreshRate, refreshOptions);
      case 'throttle':
        return throttle(resizeCallback, refreshRate, refreshOptions);
      default:
        return resizeCallback;
    }
  }, [resizeCallback, refreshMode, refreshRate, refreshOptions]);

  // attach ResizeObserver to the element
  useEffect(() => {
    let resizeObserver: ResizeObserver | undefined;

    if (ref.current) {
      resizeObserver = new window.ResizeObserver(resizeHandler);
      resizeObserver.observe(ref.current);
    } else {
      // if ref element is not registered, reset the size
      onResize?.({
        width: undefined,
        height: undefined,
        entry: undefined,
      });
      setSize({ width: undefined, height: undefined });
    }

    return () => {
      resizeObserver?.disconnect();
      if ('cancel' in resizeHandler) {
        (
          resizeHandler as unknown as DebouncedFunc<ResizeObserverCallback>
        ).cancel();
      }
    };
  }, [resizeHandler, onResize, ref]);

  return { ref, ...size };
}
