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
