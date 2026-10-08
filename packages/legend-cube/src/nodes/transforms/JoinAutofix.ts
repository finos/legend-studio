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

import type { Query } from '../../graph/Query.js';
import { MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS } from '../../messages/CubeMessages.js';
import {
  foldColumnName,
  isValidColumnName,
  MAX_COLUMN_NAME_LENGTH,
} from '../../schema/ColumnName.js';
import type { Schema } from '../../schema/Schema.js';
import { getDuplicateJoinColumns, Join } from './Join.js';
import { Rename, type RenameMapping } from './Rename.js';

/**
 * How to fix a join whose inputs share columns it isn't joined on (spec
 * §7.11's autofix, with the collision fix of PLAN §11.4): the renames before
 * each input, and the join's key lists after them
 */
export interface JoinDuplicateFix {
  /** Renames before the Left input: each shared column `c` to `c_1` */
  readonly left: readonly RenameMapping[];
  /** Renames before the Right input: each shared column `c` to `c_2` */
  readonly right: readonly RenameMapping[];
  /** The join's left keys, through the left renames */
  readonly leftColumns: readonly string[];
  /** The join's right keys, through the right renames */
  readonly rightColumns: readonly string[];
}

/**
 * Plans the fix: each column both inputs have but the join doesn't take as
 * the same key on both sides becomes `c_1` on the Left and `c_2` on the
 * Right, or `c_1_2`, `c_1_3`… when a name is taken, in any case, in either
 * input or already given by this fix (all Left names first). A name is cut to 128 code points.
 * The key lists are rewritten through the same renames, so a shared column
 * that is a key at another position, or crossed keys, still join. Gives
 * `undefined` when nothing is shared, or a name would not be a valid column
 * name.
 */
export const planJoinDuplicateFix = (
  join: Join,
  leftSchema: Schema,
  rightSchema: Schema,
): JoinDuplicateFix | undefined => {
  const duplicates = getDuplicateJoinColumns(
    leftSchema,
    rightSchema,
    join.leftColumns,
    join.rightColumns,
  );
  if (!duplicates.length) {
    return undefined;
  }
  // in any case: a database that compares names without case takes `ID_1`
  // and `id_1` for one column
  const taken = new Set(
    [...leftSchema.names(), ...rightSchema.names()].map(foldColumnName),
  );
  const nameFor = (column: string, side: 1 | 2): string => {
    const named = (suffix: string): string =>
      `${Array.from(column)
        .slice(0, MAX_COLUMN_NAME_LENGTH - Array.from(suffix).length)
        .join('')}${suffix}`;
    let name = named(`_${side}`);
    for (let count = 2; taken.has(foldColumnName(name)); count += 1) {
      name = named(`_${side}_${count}`);
    }
    taken.add(foldColumnName(name));
    return name;
  };
  const left = duplicates.map((from) => ({ from, to: nameFor(from, 1) }));
  const right = duplicates.map((from) => ({ from, to: nameFor(from, 2) }));
  if (![...left, ...right].every(({ to }) => isValidColumnName(to))) {
    return undefined;
  }
  const through =
    (mappings: readonly RenameMapping[]) =>
    (key: string): string =>
      mappings.find(({ from }) => from === key)?.to ?? key;
  return {
    left,
    right,
    leftColumns: join.leftColumns.map(through(left)),
    rightColumns: join.rightColumns.map(through(right)),
  };
};

/** The join's id, its two inputs' ids, and the fix, when the query can take it */
const prepareFix = (
  query: Query,
  joinId: string,
  leftSchema: Schema | undefined,
  rightSchema: Schema | undefined,
):
  | {
      join: Join;
      leftId: string;
      rightId: string;
      fix: JoinDuplicateFix;
    }
  | undefined => {
  const join = query.getNode(joinId);
  const [leftId, rightId] = query.getInputIds(joinId);
  if (
    !(join instanceof Join) ||
    leftId === undefined ||
    rightId === undefined ||
    !leftSchema ||
    !rightSchema
  ) {
    return undefined;
  }
  // the duplicate rule is the join's only problem: its keys are fine
  const errors: string[] = [];
  join.validate([leftSchema, rightSchema], errors);
  const duplicates = getDuplicateJoinColumns(
    leftSchema,
    rightSchema,
    join.leftColumns,
    join.rightColumns,
  );
  if (
    errors.length !== 1 ||
    !duplicates.length ||
    errors[0] !== MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS(duplicates)
  ) {
    return undefined;
  }
  const fix = planJoinDuplicateFix(join, leftSchema, rightSchema);
  return fix ? { join, leftId, rightId, fix } : undefined;
};

/**
 * Whether the join can be fixed by renaming the columns its inputs share: it
 * has both inputs, its only problem is the duplicate rule, and the planned
 * names are valid. The schemas are its inputs', given by the caller, so an
 * editor can ask about the join it is editing.
 */
export const canFixJoinDuplicates = (
  query: Query,
  joinId: string,
  leftSchema: Schema | undefined,
  rightSchema: Schema | undefined,
): boolean => prepareFix(query, joinId, leftSchema, rightSchema) !== undefined;

/**
 * Fixes the join as one change of the query: a Rename spliced in before each
 * input, on the same port, and the join's keys rewritten when a renamed
 * column was a key. The selection stays where it was. Throws when
 * `canFixJoinDuplicates` doesn't hold.
 */
export const fixJoinDuplicates = (
  query: Query,
  joinId: string,
  leftSchema: Schema | undefined,
  rightSchema: Schema | undefined,
): Query => {
  const prepared = prepareFix(query, joinId, leftSchema, rightSchema);
  if (!prepared) {
    throw new Error(`Can't fix the duplicate columns of join "${joinId}"`);
  }
  const { join, leftId, rightId, fix } = prepared;
  const leftRename = new Rename(query.generateId(Rename.TYPE), fix.left);
  let fixed = query.add(leftRename, leftId);
  // a second id from the query that holds the first rename
  const rightRename = new Rename(fixed.generateId(Rename.TYPE), fix.right);
  fixed = fixed.add(rightRename, rightId);
  const keysChanged =
    fix.leftColumns.some((key, index) => key !== join.leftColumns[index]) ||
    fix.rightColumns.some((key, index) => key !== join.rightColumns[index]);
  if (keysChanged) {
    fixed = fixed.replace(
      join.withSettings({
        leftColumns: fix.leftColumns,
        rightColumns: fix.rightColumns,
      }),
    );
  }
  const { selected } = query;
  return selected !== undefined && fixed.selected !== selected
    ? fixed.select(selected)
    : fixed;
};
