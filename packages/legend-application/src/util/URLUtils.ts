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

import { useEffect, useRef } from 'react';
import type { SetURLSearchParams } from 'react-router';

/**
 * Module-level queue for pending search param updates.
 * This ensures all instances of the hook share the same queue,
 * allowing updates to be batched together and applied in a single
 * setSearchParams call.
 *
 * This is necessary because react-router's setSearchParams does not
 * support queueing like React's setState does. Multiple calls to
 * setSearchParams in the same tick will not build on the prior value.
 * See: https://github.com/remix-run/react-router/issues/9304
 */
const pendingUpdates: Map<string, string | null> = new Map();
let flushScheduled = false;
let currentSetSearchParams: SetURLSearchParams | null = null;

const flushUpdates = (): void => {
  if (pendingUpdates.size === 0 || !currentSetSearchParams) {
    flushScheduled = false;
    return;
  }

  const setSearchParams = currentSetSearchParams;
  const updates = new Map(pendingUpdates);
  pendingUpdates.clear();
  flushScheduled = false;

  setSearchParams((params) => {
    const newParams = new URLSearchParams(params);
    updates.forEach((value, key) => {
      if (value !== null) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    return newParams;
  });
};

const queueUpdate = (
  key: string,
  value: string | null,
  setSearchParams: SetURLSearchParams,
): void => {
  pendingUpdates.set(key, value);
  currentSetSearchParams = setSearchParams;

  if (!flushScheduled) {
    flushScheduled = true;
    // Use queueMicrotask to batch updates in the same tick
    queueMicrotask(flushUpdates);
  }
};

/**
 * Util hook to keep a state variable in sync with a URL search parameter.
 * This hook syncs from URL to state if the state is null/undefined (so
 * initial value is set from URL) and from state to URL otherwise.
 *
 * This hook properly queues setSearchParams calls to ensure all updates
 * are applied, working around react-router's limitation where multiple
 * calls to setSearchParams in the same tick don't build on each other.
 * See: https://github.com/remix-run/react-router/issues/9304
 *
 * @param stateVar the state variable to sync
 * @param updateStateVar setter function to update the state variable (should be memoized with useCallback)
 * @param searchParamKey the key of the URL search parameter to sync with
 * @param searchParamValue the current URL search parameter value (i.e., from useSearchParams)
 * @param setSearchParams function to update the URL search parameters (i.e., from useSearchParams)
 * @param initializedCallback function to check if the underlying state is initialized and ready to sync with URL (should be memoized with useCallback)
 */
export const useSyncStateAndSearchParam = (
  stateVar: string | boolean | number | null | undefined,
  updateStateVar: (val: string | null) => void,
  searchParamKey: string,
  searchParamValue: string | null,
  setSearchParams: SetURLSearchParams,
  initializedCallback: () => boolean,
): void => {
  // Use a ref to make setSearchParams stable
  // react-router's setSearchParams is not stable and changes on every render
  // See: https://github.com/remix-run/react-router/issues/9304
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  // Sync state with URL search param if state is null/undefined
  useEffect(() => {
    if (
      initializedCallback() &&
      (stateVar === null || stateVar === undefined)
    ) {
      updateStateVar(searchParamValue);
    }
  }, [initializedCallback, searchParamValue, stateVar, updateStateVar]);

  // Sync URL search param with state
  useEffect(() => {
    if (initializedCallback()) {
      // When state changes, queue URL param update
      // Using the queueing mechanism ensures all updates are applied
      // even when multiple hooks call setSearchParams in the same tick
      if (stateVar !== null && stateVar !== undefined) {
        queueUpdate(
          searchParamKey,
          String(stateVar),
          setSearchParamsRef.current,
        );
      } else {
        queueUpdate(searchParamKey, null, setSearchParamsRef.current);
      }
    }
  }, [initializedCallback, searchParamKey, stateVar]);
};
