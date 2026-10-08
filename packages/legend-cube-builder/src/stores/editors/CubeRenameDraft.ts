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

import type { Rename, RenameMapping } from '@finos/legend-cube';
import { action, makeObservable, observable } from 'mobx';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** One row of the Rename editor: an old column and its new name, `''` until picked or typed */
export interface CubeRenameRow {
  /** Identifies the row in the editor */
  readonly key: number;
  readonly from: string;
  readonly to: string;
}

let nextRowKey = 1;

const blankRow = (): CubeRenameRow => ({ key: nextRowKey++, from: '', to: '' });

const isSameMappings = (
  a: readonly RenameMapping[],
  b: readonly RenameMapping[],
): boolean =>
  a.length === b.length &&
  a.every(
    (mapping, index) =>
      mapping.from === b[index]?.from && mapping.to === b[index]?.to,
  );

/**
 * The Rename editor's draft (spec §17.6: a list of old column and new name
 * rows). A new name is kept exactly as typed, never trimmed. A row with
 * neither name is left out when built, as a Filter's blank rows are; a row
 * with only one is kept, so validation reports it.
 */
export class CubeRenameDraft extends CubeNodeDraft<Rename> {
  rows: readonly CubeRenameRow[];
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: Rename) {
    super(original);
    makeObservable<CubeRenameDraft, 'touched'>(this, {
      rows: observable.ref,
      touched: observable,
      addRow: action,
      removeRow: action,
      setFrom: action,
      setTo: action,
    });
    this.rows = original.mappings.length
      ? original.mappings.map(({ from, to }) => ({
          key: nextRowKey++,
          from,
          to,
        }))
      : [blankRow()];
  }

  /** The mappings the rows build, in order: a row with neither name is left out */
  get mappings(): RenameMapping[] {
    return this.rows
      .filter((row) => row.from || row.to)
      .map(({ from, to }) => ({ from, to }));
  }

  addRow(): void {
    this.rows = [...this.rows, blankRow()];
    this.touched = true;
  }

  removeRow(key: number): void {
    this.rows = this.rows.filter((row) => row.key !== key);
    this.touched = true;
  }

  setFrom(key: number, from: string): void {
    this.rows = this.rows.map((row) =>
      row.key === key ? { ...row, from } : row,
    );
    this.touched = true;
  }

  setTo(key: number, to: string): void {
    this.rows = this.rows.map((row) =>
      row.key === key ? { ...row, to } : row,
    );
    this.touched = true;
  }

  build(): Rename {
    const { original, mappings } = this;
    return !this.touched || isSameMappings(mappings, original.mappings)
      ? original
      : original.withMappings(mappings);
  }
}
