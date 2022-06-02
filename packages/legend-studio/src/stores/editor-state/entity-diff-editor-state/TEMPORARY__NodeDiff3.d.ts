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

/**
 * This is extracted from https://github.com/bhousel/node-diff3/blob/main/index.d.ts
 *
 * Temporary workaround due to misconfiguration of typings in `node-diff3`
 * TODO: remove this when we upgrade `node-diff3` with the corrected exports config
 * @workaround ESM
 * See https://github.com/bhousel/node-diff3/pull/57
 */
declare module 'node-diff3' {
  interface MergeRegion<T> {
    ok?: T[];
    conflict?: {
      a: T[];
      aIndex: number;
      b: T[];
      bIndex: number;
      o: T[];
      oIndex: number;
    };
  }

  interface MergeResult {
    conflict: boolean;
    result: string[];
  }

  interface IMergeOptions {
    excludeFalseConflicts?: boolean;
    stringSeparator?: string | RegExp;
  }

  function mergeDiff3<T>(
    a: string | T[],
    o: string | T[],
    b: string | T[],
    options?: IMergeOptions & {
      label?: {
        a?: string;
        o?: string;
        b?: string;
      };
    },
  ): MergeResult;
}
