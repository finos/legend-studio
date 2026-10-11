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

import {
  type Difference,
  isNumericFamily,
  type Schema,
  type SchemaColumn,
} from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CUBE_DIFFERENCE_COLUMN_REASONS } from '../../__lib__/LegendCubeLabels.js';
import { isSameList, toggledColumns } from './CubeAggregationRows.js';
import {
  blankJoinKeyPair,
  type CubeJoinKeyPair,
  type CubeJoinKeysDraft,
  joinKeyListsOf,
  joinKeyPairsOf,
} from './CubeJoinKeyPairs.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/**
 * The Difference editor's draft (spec §17.6, PLAN §11.7): pairs of key
 * columns, as a Join's (a pair with no column picked is left out when built),
 * and the difference columns, stored in the Left input's order but kept in a
 * saved order until the picks change (M4's Q2). Until something changes,
 * `build()` gives the original back.
 */
export class CubeDifferenceDraft
  extends CubeNodeDraft<Difference>
  implements CubeJoinKeysDraft
{
  pairs: readonly CubeJoinKeyPair[];
  differenceColumns: readonly string[];
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;
  /** The key lists the pairs built before any edit, so edits undone by hand give the original back */
  private readonly initialKeyLists: [string[], string[]];

  constructor(original: Difference) {
    super(original);
    makeObservable<CubeDifferenceDraft, 'touched'>(this, {
      pairs: observable.ref,
      differenceColumns: observable.ref,
      touched: observable,
      addPair: action,
      removePair: action,
      setLeftColumn: action,
      setRightColumn: action,
      toggleDifferenceColumn: action,
      clearDifferenceColumns: action,
    });
    this.pairs = joinKeyPairsOf(original.leftColumns, original.rightColumns);
    this.initialKeyLists = joinKeyListsOf(this.pairs);
    this.differenceColumns = original.differenceColumns;
  }

  addPair(): void {
    this.pairs = [...this.pairs, blankJoinKeyPair()];
    this.touched = true;
  }

  removePair(key: number): void {
    this.pairs = this.pairs.filter((pair) => pair.key !== key);
    this.touched = true;
  }

  setLeftColumn(key: number, left: string): void {
    this.pairs = this.pairs.map((pair) =>
      pair.key === key ? { ...pair, left } : pair,
    );
    this.touched = true;
  }

  setRightColumn(key: number, right: string): void {
    this.pairs = this.pairs.map((pair) =>
      pair.key === key ? { ...pair, right } : pair,
    );
    this.touched = true;
  }

  /** Ticks or unticks a difference column; the columns then follow the Left input's order */
  toggleDifferenceColumn(name: string, leftSchema: Schema): void {
    this.differenceColumns = toggledColumns(
      this.differenceColumns,
      name,
      leftSchema,
    );
    this.touched = true;
  }

  clearDifferenceColumns(): void {
    this.differenceColumns = [];
    this.touched = true;
  }

  build(): Difference {
    const [leftColumns, rightColumns] = joinKeyListsOf(this.pairs);
    const [initialLeft, initialRight] = this.initialKeyLists;
    const { original } = this;
    return !this.touched ||
      (isSameList(leftColumns, initialLeft) &&
        isSameList(rightColumns, initialRight) &&
        isSameList(this.differenceColumns, original.differenceColumns))
      ? original
      : original.withSettings({
          leftColumns,
          rightColumns,
          differenceColumns: this.differenceColumns,
        });
  }
}

/**
 * Why a column of the Left input can't be a difference column, `undefined`
 * when it can: it is a join column on either side, or not a number, or not in
 * the Right input with the same type (PLAN §11.7)
 */
export const getDifferenceColumnUnpickableReason = (
  column: SchemaColumn,
  rightSchema: Schema,
  joinColumns: readonly string[],
): string | undefined => {
  const rightType = rightSchema.type(column.name);
  return joinColumns.includes(column.name)
    ? CUBE_DIFFERENCE_COLUMN_REASONS.JOIN_COLUMN
    : !isNumericFamily(column.type.family)
      ? CUBE_DIFFERENCE_COLUMN_REASONS.NOT_NUMERIC
      : rightType === undefined
        ? CUBE_DIFFERENCE_COLUMN_REASONS.NOT_IN_RIGHT
        : !rightType.equals(column.type)
          ? CUBE_DIFFERENCE_COLUMN_REASONS.TYPE_DIFFERS(rightType.displayName)
          : undefined;
};
