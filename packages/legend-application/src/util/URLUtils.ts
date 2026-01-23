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

import { useEffect } from 'react';
import type { SetURLSearchParams } from 'react-router';

/**
 * Util hook to keep a state variable in sync with a URL search parameter.
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
  // Sync state with URL search param
  useEffect(() => {
    if (initializedCallback()) {
      // On mount or when search param value changes, update state from URL
      const urlParamValue = searchParamValue;
      updateStateVar(urlParamValue);
    }
  }, [initializedCallback, searchParamKey, searchParamValue, updateStateVar]);

  // Sync URL search param with state
  useEffect(() => {
    if (initializedCallback()) {
      // When state changes, update URL param
      if (stateVar) {
        setSearchParams((params) => {
          const newParams = new URLSearchParams(params);
          newParams.set(searchParamKey, String(stateVar));
          return newParams;
        });
      } else {
        setSearchParams((params) => {
          const newParams = new URLSearchParams(params);
          newParams.delete(searchParamKey);
          return newParams;
        });
      }
    }
  }, [initializedCallback, searchParamKey, stateVar, setSearchParams]);
};
