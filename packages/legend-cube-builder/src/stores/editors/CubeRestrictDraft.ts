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

import type { Restrict, Schema } from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/**
 * The columns in the input's order, then those the input doesn't have, in
 * the order they were picked: a saved column the input lost stays listed
 * until it is unticked
 */
const inInputOrder = (names: readonly string[], schema: Schema): string[] => [
  ...schema.names().filter((name) => names.includes(name)),
  ...names.filter((name) => schema.lookup(name) === undefined),
];

const isSameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((name) => b.includes(name));

/**
 * The Restrict editor's draft (spec §17.6: a multi-select of the columns to
 * keep). It keeps the picked columns in the input's order, as the node's
 * output has them.
 */
export class CubeRestrictDraft extends CubeNodeDraft<Restrict> {
  columns: readonly string[];
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: Restrict) {
    super(original);
    makeObservable<CubeRestrictDraft, 'touched'>(this, {
      columns: observable.ref,
      touched: observable,
      toggleColumn: action,
      selectAll: action,
      clear: action,
    });
    this.columns = original.columns;
  }

  /** Ticks or unticks the column */
  toggleColumn(name: string, schema: Schema): void {
    this.columns = this.columns.includes(name)
      ? this.columns.filter((picked) => picked !== name)
      : inInputOrder([...this.columns, name], schema);
    this.touched = true;
  }

  /** Ticks every column of the input */
  selectAll(schema: Schema): void {
    this.columns = inInputOrder([...schema.names(), ...this.columns], schema);
    this.touched = true;
  }

  /** Unticks every column */
  clear(): void {
    this.columns = [];
    this.touched = true;
  }

  /** The original while the same columns are picked, whatever their order */
  build(): Restrict {
    const { original, columns } = this;
    return !this.touched || isSameSet(columns, original.columns)
      ? original
      : original.withColumns(columns);
  }
}
