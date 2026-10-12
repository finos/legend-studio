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
  AggregationFunction,
  Distinct,
  type LiteralValue,
  parseValue,
  Pivot,
  type PivotAggregation,
  PIVOT_MAX_VALUES,
  Restrict,
  Schema,
  Sort,
  SortDirection,
  TypeFamily,
} from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  CubeEngineError,
  type CubeResultValue,
} from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { type CubeQueryRunResult, runCubeQuery } from '../CubeQueryRun.js';
import { isSameList, toggledColumns } from './CubeAggregationRows.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** The pivot column's values the engine gave, in its order, and whether it had more */
export interface CubePivotLoadedValues {
  readonly column: string;
  readonly values: readonly LiteralValue[];
  readonly more: boolean;
}

const sameValue = (a: LiteralValue, b: LiteralValue): boolean =>
  a.kind === b.kind && a.value === b.value;

/**
 * A value of the column's type from what the engine gave for a cell: a
 * Boolean as itself, else its text read as the type, a date-time's date part
 * for a StrictDate; `undefined` for an empty value, which can't be listed,
 * or text that isn't one
 */
export const toPivotValue = (
  cell: CubeResultValue,
  schema: Schema,
  column: string,
): LiteralValue | undefined => {
  const type = schema.type(column);
  if (cell === null || !type) {
    return undefined;
  }
  if (typeof cell === 'boolean') {
    return { kind: 'boolean', value: cell };
  }
  const text =
    type.family === TypeFamily.STRICT_DATE
      ? String(cell).slice(0, 10)
      : String(cell);
  const value = parseValue(text, type);
  return value === undefined || value.kind === 'invalid' ? undefined : value;
};

/**
 * The Pivot editor's draft (PLAN §11.12): its row columns, ticked, kept in
 * the input's order; its pivot column; its values, loaded from the engine and
 * ticked, kept in the order the engine lists them; its aggregation. Picking
 * another pivot column drops the values, which were the other column's;
 * Count rows takes no column, the other functions one.
 */
export class CubePivotDraft extends CubeNodeDraft<Pivot> {
  readonly editorState: CubeEditorState;
  rows: readonly string[];
  column: string;
  values: readonly LiteralValue[];
  aggregation: PivotAggregation;
  /** The values the engine gave for the pivot column, once loaded */
  loaded: CubePivotLoadedValues | undefined;
  loading = false;
  /** Why the values couldn't be loaded */
  loadError: string | undefined;
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;

  constructor(original: Pivot, editorState: CubeEditorState) {
    super(original);
    makeObservable<CubePivotDraft, 'touched'>(this, {
      rows: observable.ref,
      column: observable,
      values: observable.ref,
      aggregation: observable.ref,
      loaded: observable.ref,
      loading: observable,
      loadError: observable,
      touched: observable,
      toggleRow: action,
      clearRows: action,
      setColumn: action,
      toggleValue: action,
      pickAllValues: action,
      clearValues: action,
      setFunction: action,
      setAggregationColumn: action,
      loadValues: flow,
    });
    this.editorState = editorState;
    this.rows = original.rows;
    this.column = original.column;
    this.values = original.values;
    this.aggregation = original.aggregation;
  }

  toggleRow(name: string, schema: Schema): void {
    this.rows = toggledColumns(this.rows, name, schema);
    this.touched = true;
  }

  clearRows(): void {
    this.rows = [];
    this.touched = true;
  }

  /** Picks the pivot column; another column's values, picked or loaded, are dropped */
  setColumn(column: string): void {
    if (column === this.column) {
      return;
    }
    this.column = column;
    this.values = [];
    this.loaded = undefined;
    this.loadError = undefined;
    this.touched = true;
  }

  /** Values in the order the engine listed them, then those it didn't list, as they were */
  private ordered(values: readonly LiteralValue[]): LiteralValue[] {
    const listed = this.loaded?.values ?? [];
    return [
      ...listed.filter((value) => values.some((v) => sameValue(v, value))),
      ...values.filter((value) => !listed.some((v) => sameValue(v, value))),
    ];
  }

  /** Ticks or unticks a value */
  toggleValue(value: LiteralValue): void {
    this.values = this.ordered(
      this.values.some((picked) => sameValue(picked, value))
        ? this.values.filter((picked) => !sameValue(picked, value))
        : [...this.values, value],
    );
    this.touched = true;
  }

  /** Ticks every value loaded, keeping those picked that weren't */
  pickAllValues(): void {
    this.values = this.ordered([
      ...this.values,
      ...(this.loaded?.values ?? []).filter(
        (value) => !this.values.some((picked) => sameValue(picked, value)),
      ),
    ]);
    this.touched = true;
  }

  clearValues(): void {
    this.values = [];
    this.touched = true;
  }

  /** Picks the function: Count rows takes no column; another function keeps one, or one to pick */
  setFunction(fn: string): void {
    const { column } = this.aggregation;
    this.aggregation = {
      function: fn,
      column:
        fn === AggregationFunction.COUNT_ROWS ? undefined : (column ?? ''),
    };
    this.touched = true;
  }

  setAggregationColumn(column: string): void {
    this.aggregation = { ...this.aggregation, column };
    this.touched = true;
  }

  /**
   * Asks the engine for the pivot column's values (PLAN §11.12): the input's
   * relation, the column alone, each value once, ascending, at most
   * `PIVOT_MAX_VALUES`, run on the cube's runtime as a run is, written for its
   * database. Empty values can't be listed, so they are left out.
   */
  *loadValues(): GeneratorFn<void> {
    const { editorState, column } = this;
    const { context, query } = editorState.document;
    const [inputId] = query.getInputIds(this.original.id);
    const input =
      inputId === undefined
        ? undefined
        : editorState.analysis.schemas.get(inputId);
    const pivotColumn = column ? input?.lookup(column) : undefined;
    if (
      this.loading ||
      context?.runtime === undefined ||
      inputId === undefined ||
      !input ||
      !pivotColumn
    ) {
      return;
    }
    this.loading = true;
    this.loadError = undefined;
    try {
      const restrict = new Restrict(query.generateId(Restrict.TYPE), [column]);
      const distinct = new Distinct(query.generateId(Distinct.TYPE));
      const sort = new Sort(query.generateId(Sort.TYPE), [
        { column, direction: SortDirection.ASC },
      ]);
      // each after the one before, off the pivot's input, the last selected
      // (an add after the selected node selects it); the query isn't kept
      const values = [restrict, distinct, sort].reduce(
        (built, node) => built.add(node, built.selected),
        query.selected === inputId ? query : query.select(inputId),
      );
      const result = (yield runCubeQuery(editorState, {
        query: values,
        model: context.model,
        runtime: context.runtime,
        schema: new Schema([pivotColumn]),
        rowLimit: PIVOT_MAX_VALUES,
        abortController: new AbortController(),
      })) as CubeQueryRunResult;
      this.loaded = {
        column,
        values: result.rows
          .map((row) => toPivotValue(row[0] ?? null, input, column))
          .filter((value): value is LiteralValue => value !== undefined),
        more: result.limited,
      };
    } catch (error) {
      this.loadError =
        error instanceof CubeEngineError
          ? error.firstLine
          : error instanceof Error
            ? error.message
            : String(error);
    } finally {
      this.loading = false;
    }
  }

  build(): Pivot {
    const { original, rows, column, values, aggregation } = this;
    const unchanged =
      isSameList(rows, original.rows) &&
      column === original.column &&
      values.length === original.values.length &&
      values.every((value, index) => {
        const saved = original.values[index];
        return saved !== undefined && sameValue(saved, value);
      }) &&
      aggregation.function === original.aggregation.function &&
      aggregation.column === original.aggregation.column;
    return !this.touched || unchanged
      ? original
      : new Pivot(
          original.id,
          rows,
          column,
          values,
          aggregation,
          original.rest,
        );
  }
}
