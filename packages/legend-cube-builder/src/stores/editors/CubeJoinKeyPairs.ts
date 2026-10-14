/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { QueryNode } from '@finos/legend-cube';

// The key column pairs of the editors that join two inputs (Join, spec §17.6;
// Difference, PLAN §11.7)

/** One pair of key columns, matched by position; `''` until a column is picked */
export interface CubeJoinKeyPair {
  /** Identifies the row in the editor */
  readonly key: number;
  readonly left: string;
  readonly right: string;
}

let nextPairKey = 1;

export const blankJoinKeyPair = (): CubeJoinKeyPair => ({
  key: nextPairKey++,
  left: '',
  right: '',
});

/** The pairs of saved key lists, by position; a list longer than the other pairs its extra columns with `''` */
export const joinKeyPairsOf = (
  leftColumns: readonly string[],
  rightColumns: readonly string[],
): CubeJoinKeyPair[] =>
  Array.from(
    { length: Math.max(leftColumns.length, rightColumns.length) },
    (_, index) => ({
      key: nextPairKey++,
      left: leftColumns[index] ?? '',
      right: rightColumns[index] ?? '',
    }),
  );

/** The key lists pairs build: a pair with no column picked is left out */
export const joinKeyListsOf = (
  pairs: readonly CubeJoinKeyPair[],
): [string[], string[]] => {
  const kept = pairs.filter((pair) => pair.left || pair.right);
  return [kept.map((pair) => pair.left), kept.map((pair) => pair.right)];
};

/** A draft whose node joins its inputs on pairs of key columns: a Join's or a Difference's */
export interface CubeJoinKeysDraft {
  readonly original: QueryNode;
  readonly pairs: readonly CubeJoinKeyPair[];
  addPair(): void;
  removePair(key: number): void;
  setLeftColumn(key: number, left: string): void;
  setRightColumn(key: number, right: string): void;
}
