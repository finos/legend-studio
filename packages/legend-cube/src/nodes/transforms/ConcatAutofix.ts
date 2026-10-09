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
import type { QueryNode } from '../../graph/QueryNode.js';
import { foldColumnName } from '../../schema/ColumnName.js';
import type { Schema } from '../../schema/Schema.js';
import { Concat, validateConcatSchemas } from './Concat.js';
import { Rename, type RenameMapping } from './Rename.js';
import { Restrict } from './Restrict.js';

// Concat's autofixes (PLAN §11.5, Q6): M2 nodes spliced in before an input,
// each offered only when the Concat is valid after it, as one change of the
// query that keeps the selection

/**
 * Plans a Rename before the second input that gives each column whose name
 * differs from the first input's at its position the first input's name, a
 * case-only difference included. `undefined` when the inputs differ in
 * count, or no name differs, or a renamed column's name is the name of
 * another column of the first input (the same columns in another order:
 * renaming would move values silently), or the Rename itself isn't valid, or
 * the Concat still isn't (its types differ).
 */
export const planConcatRename = (
  first: Schema,
  second: Schema,
): RenameMapping[] | undefined => {
  const firstNames = first.names();
  const secondNames = second.names();
  if (firstNames.length !== secondNames.length) {
    return undefined;
  }
  const mappings = secondNames.flatMap((from, index) => {
    const to = firstNames[index] as string;
    return from === to ? [] : [{ from, to }];
  });
  const isMoved = mappings.some(({ from }) =>
    firstNames.some(
      (name, index) =>
        secondNames[index] !== from &&
        foldColumnName(name) === foldColumnName(from),
    ),
  );
  if (!mappings.length || isMoved) {
    return undefined;
  }
  const rename = new Rename('rename', mappings);
  const renamed = rename.validate([second])
    ? rename.schematize([second])
    : undefined;
  return renamed && validateConcatSchemas(first, renamed)
    ? mappings
    : undefined;
};

/** A Restrict before one input of a Concat */
export interface ConcatRestrictFix {
  /** The input it goes before: 0 for the first, 1 for the second (`CONCAT_PORT_LABELS`) */
  readonly input: 0 | 1;
  /** The columns it keeps, the other input's */
  readonly columns: readonly string[];
  /** The columns it drops */
  readonly dropped: readonly string[];
}

/** Whether the names are in the other names, in the same order */
const isInOrderIn = (
  names: readonly string[],
  others: readonly string[],
): boolean => {
  let position = 0;
  others.forEach((other) => {
    if (other === names[position]) {
      position += 1;
    }
  });
  return position === names.length;
};

/**
 * Plans a Restrict before the input with more columns that keeps only the
 * other input's columns, when those are all in it, by name and in the same
 * order. `undefined` when the inputs have as many columns, or the narrower
 * input has none, or its names aren't in the wider one in order, or the
 * Concat still isn't valid after it (its types differ).
 */
export const planConcatRestrict = (
  first: Schema,
  second: Schema,
): ConcatRestrictFix | undefined => {
  const [firstNames, secondNames] = [first.names(), second.names()];
  if (firstNames.length === secondNames.length) {
    return undefined;
  }
  const isFirstWider = firstNames.length > secondNames.length;
  const [wider, narrower] = isFirstWider ? [first, second] : [second, first];
  const columns = narrower.names();
  if (!columns.length || !isInOrderIn(columns, wider.names())) {
    return undefined;
  }
  const restrict = new Restrict('restrict', columns);
  const kept = restrict.validate([wider])
    ? restrict.schematize([wider])
    : undefined;
  if (
    !kept ||
    !validateConcatSchemas(
      isFirstWider ? kept : first,
      isFirstWider ? second : kept,
    )
  ) {
    return undefined;
  }
  return {
    input: isFirstWider ? 0 : 1,
    columns,
    dropped: wider.names().filter((name) => !columns.includes(name)),
  };
};

/** The ids of the concat's inputs, when it is a concat with both */
const concatInputs = (
  query: Query,
  concatId: string,
): { firstId: string; secondId: string } | undefined => {
  const [firstId, secondId] = query.getInputIds(concatId);
  return query.getNode(concatId) instanceof Concat &&
    firstId !== undefined &&
    secondId !== undefined
    ? { firstId, secondId }
    : undefined;
};

/** The query with the node spliced in after the input, its selection kept */
const spliced = (query: Query, node: QueryNode, inputId: string): Query => {
  const fixed = query.add(node, inputId);
  const { selected } = query;
  return selected !== undefined && fixed.selected !== selected
    ? fixed.select(selected)
    : fixed;
};

/**
 * Whether the concat can be fixed by a Rename before its second input
 * (`planConcatRename`). The schemas are its inputs', given by the caller, so
 * an editor can ask about the concat it is editing.
 */
export const canRenameConcatInput = (
  query: Query,
  concatId: string,
  first: Schema | undefined,
  second: Schema | undefined,
): boolean =>
  concatInputs(query, concatId) !== undefined &&
  first !== undefined &&
  second !== undefined &&
  planConcatRename(first, second) !== undefined;

/**
 * Fixes the concat as one change of the query: a Rename spliced in before its
 * second input, on the same port. The selection stays where it was. Throws
 * when `canRenameConcatInput` doesn't hold.
 */
export const renameConcatInput = (
  query: Query,
  concatId: string,
  first: Schema | undefined,
  second: Schema | undefined,
): Query => {
  const inputs = concatInputs(query, concatId);
  const mappings =
    first && second ? planConcatRename(first, second) : undefined;
  if (!inputs || !mappings) {
    throw new Error(`Can't rename the columns of concat "${concatId}"`);
  }
  return spliced(
    query,
    new Rename(query.generateId(Rename.TYPE), mappings),
    inputs.secondId,
  );
};

/**
 * Whether the concat can be fixed by a Restrict before its wider input
 * (`planConcatRestrict`). The schemas are its inputs', given by the caller.
 */
export const canRestrictConcatInput = (
  query: Query,
  concatId: string,
  first: Schema | undefined,
  second: Schema | undefined,
): boolean =>
  concatInputs(query, concatId) !== undefined &&
  first !== undefined &&
  second !== undefined &&
  planConcatRestrict(first, second) !== undefined;

/**
 * Fixes the concat as one change of the query: a Restrict spliced in before
 * its wider input, on the same port, dropping the columns the other input
 * doesn't have. The selection stays where it was. Throws when
 * `canRestrictConcatInput` doesn't hold.
 */
export const restrictConcatInput = (
  query: Query,
  concatId: string,
  first: Schema | undefined,
  second: Schema | undefined,
): Query => {
  const inputs = concatInputs(query, concatId);
  const fix = first && second ? planConcatRestrict(first, second) : undefined;
  if (!inputs || !fix) {
    throw new Error(`Can't restrict the columns of concat "${concatId}"`);
  }
  return spliced(
    query,
    new Restrict(query.generateId(Restrict.TYPE), fix.columns),
    fix.input === 0 ? inputs.firstId : inputs.secondId,
  );
};
