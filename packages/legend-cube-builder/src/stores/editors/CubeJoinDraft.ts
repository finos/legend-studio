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
  getSameNamedJoinKeys,
  Join,
  JoinType,
  type Query,
  RelationalTableSource,
  type SchemaInferenceResult,
} from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import type { CubeModelOutline } from '../../graph-manager/CubeEngine.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** One pair of key columns, matched by position; `''` until a column is picked */
export interface CubeJoinKeyPair {
  /** Identifies the row in the editor */
  readonly key: number;
  readonly left: string;
  readonly right: string;
}

let nextPairKey = 1;

const isSameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((name, index) => name === b[index]);

/** The key lists pairs build: a pair with no column picked is left out */
const toKeyLists = (
  pairs: readonly CubeJoinKeyPair[],
): [string[], string[]] => {
  const kept = pairs.filter((pair) => pair.left || pair.right);
  return [kept.map((pair) => pair.left), kept.map((pair) => pair.right)];
};

/**
 * The Join editor's draft (spec §17.6): the join type and the key column
 * pairs. A pair with no column picked on either side is left out when built,
 * as a Filter's blank rows are (user's choice, 2026-10-07).
 */
export class CubeJoinDraft extends CubeNodeDraft<Join> {
  joinType: JoinType;
  pairs: CubeJoinKeyPair[];
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;
  /**
   * The key lists the pairs built before any edit, so edits undone by hand
   * give the original back, even for saved lists of unequal length
   */
  private readonly initialKeyLists: [string[], string[]];

  constructor(original: Join) {
    super(original);
    makeObservable<CubeJoinDraft, 'touched'>(this, {
      joinType: observable,
      pairs: observable.ref,
      touched: observable,
      setJoinType: action,
      addPair: action,
      removePair: action,
      setLeftColumn: action,
      setRightColumn: action,
    });
    this.joinType = original.joinType;
    this.pairs = Array.from(
      {
        length: Math.max(
          original.leftColumns.length,
          original.rightColumns.length,
        ),
      },
      (_, index) => ({
        key: nextPairKey++,
        left: original.leftColumns[index] ?? '',
        right: original.rightColumns[index] ?? '',
      }),
    );
    this.initialKeyLists = toKeyLists(this.pairs);
  }

  setJoinType(joinType: JoinType): void {
    this.joinType = joinType;
    this.touched = true;
  }

  addPair(): void {
    this.pairs = [...this.pairs, { key: nextPairKey++, left: '', right: '' }];
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

  build(): Join {
    const [leftColumns, rightColumns] = toKeyLists(this.pairs);
    const [initialLeft, initialRight] = this.initialKeyLists;
    const { original } = this;
    return !this.touched ||
      (this.joinType === original.joinType &&
        isSameList(leftColumns, initialLeft) &&
        isSameList(rightColumns, initialRight))
      ? original
      : original.withSettings({
          joinType: this.joinType,
          leftColumns,
          rightColumns,
        });
  }
}

/**
 * The table sources a column of a node's output comes from: followed back
 * through the inputs whose output has the column. A join key of the same name
 * on both sides comes from the side the join keeps (the left for INNER and
 * LEFT OUTER, the right for RIGHT OUTER), and from both for FULL OUTER, which
 * merges them.
 */
export const findColumnSources = (
  query: Query,
  analysis: SchemaInferenceResult,
  nodeId: string,
  columnName: string,
): RelationalTableSource[] => {
  const node = query.getNode(nodeId);
  if (node instanceof RelationalTableSource) {
    return node.resolution.kind === 'resolved' &&
      node.resolution.schema.lookup(columnName)
      ? [node]
      : [];
  }
  const inputIds = query.getInputIds(nodeId);
  const [leftId, rightId] = inputIds;
  const followed =
    node instanceof Join &&
    node.joinType !== JoinType.FULL_OUTER &&
    getSameNamedJoinKeys(node.leftColumns, node.rightColumns).includes(
      columnName,
    )
      ? [node.joinType === JoinType.RIGHT_OUTER ? rightId : leftId]
      : inputIds;
  return followed.flatMap((inputId) =>
    inputId !== undefined && analysis.schemas.get(inputId)?.lookup(columnName)
      ? findColumnSources(query, analysis, inputId, columnName)
      : [],
  );
};

/**
 * Whether the column of the node's output comes from a table column whose
 * type Cube can't read (OTHER or ARRAY), so it was typed as a bare String
 * (PLAN §8.7). Unknown until the model's outline has loaded.
 */
export const isUntypedColumn = (
  outline: CubeModelOutline | undefined,
  query: Query,
  analysis: SchemaInferenceResult,
  nodeId: string,
  columnName: string,
): boolean =>
  outline !== undefined &&
  findColumnSources(query, analysis, nodeId, columnName).some((source) =>
    outline.databases
      .find((database) => database.path === source.database)
      ?.schemas.find((schema) => schema.name === source.schema)
      ?.tables.find((table) => table.name === source.table)
      ?.untypedColumns.includes(columnName),
  );
