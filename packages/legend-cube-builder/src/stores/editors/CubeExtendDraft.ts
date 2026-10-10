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
  type CubeType,
  type Extend,
  type ExtendColumn,
  type ExtendTyping,
  foldColumnName,
  getExtendSignature,
  type JsonObject,
  type Query,
  QueryEmitter,
  type Schema,
} from '@finos/legend-cube';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  EXTEND_APPLY_DISABLED_REASON,
  EXTEND_TO_ONE_HINT,
  getExtendPlanProblem,
} from '../../__lib__/LegendCubeLabels.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeParsedExpression,
  type CubeSourceLocation,
  type NodeId,
} from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import {
  buildCubeExtendTypingLambdas,
  readCubeExtendTyping,
  withoutEngineContext,
} from '../CubeExtendTyping.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** What the engine made of a row's code the last time it was validated */
export interface CubeExtendCheckedCode {
  readonly code: string;
  readonly lambda: JsonObject;
  readonly located: JsonObject;
}

/** A row's problem from the last Validate: the engine's message, where it is in the code, and a hint */
export interface CubeExtendRowProblem {
  readonly message: string;
  readonly location?: CubeSourceLocation | undefined;
  readonly hint?: string | undefined;
}

/** One new column in the editor */
export interface CubeExtendRow {
  /** Identifies the row in the editor, and its code to the engine */
  readonly key: number;
  readonly name: string;
  readonly code: string;
  readonly checked?: CubeExtendCheckedCode | undefined;
  readonly problem?: CubeExtendRowProblem | undefined;
  /** The type the engine gave, while the row is as it was typed */
  readonly type?: CubeType | undefined;
}

/** What a new column's code starts as (PLAN §11.7 Q2) */
export const NEW_EXPRESSION_CODE = 'x | ';

let nextRowKey = 1;

/** An engine message about a column that can be empty in arithmetic, which `->toOne()` fixes */
const NEEDS_TO_ONE =
  /must have a multiplicity \[1\]|Can't find a match for function '[^']*\[0\.\.1\]/u;

const problemOf = (error: CubeEngineError): CubeExtendRowProblem => ({
  message: withoutEngineContext(error.firstLine),
  location: error.location,
  hint: NEEDS_TO_ONE.test(error.detail) ? EXTEND_TO_ONE_HINT : undefined,
});

/**
 * The Extend editor's draft (PLAN §11.7): a row per new column, its name and
 * its code, `x | …`. Validate (F10) has the engine check each changed code,
 * type the columns as a chain after the input, located so an error points
 * into the code, and plan the query for the cube's database. Apply waits
 * until every row's code is the one validated; the node then holds the
 * engine's lambdas and their typing, so it needn't be typed again.
 */
export class CubeExtendDraft extends CubeNodeDraft<Extend> {
  readonly editorState: CubeEditorState;
  rows: readonly CubeExtendRow[];
  /** The typing the last Validate gave, for the rows as they were then */
  typing: ExtendTyping | undefined;
  validating = false;
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;
  /** The database type the last plan was for, named in its problem */
  private planDatabaseType: string | undefined;

  constructor(original: Extend, editorState: CubeEditorState) {
    super(original);
    makeObservable<CubeExtendDraft, 'touched'>(this, {
      rows: observable.ref,
      typing: observable.ref,
      validating: observable,
      touched: observable,
      columns: computed,
      isValidated: computed,
      applyDisabledReason: computed,
      addRow: action,
      removeRow: action,
      moveRow: action,
      setName: action,
      setCode: action,
      validate: flow,
    });
    this.editorState = editorState;
    const types = original.typing.kind === 'typed' ? original.typing.types : [];
    this.rows = original.columns.map(({ name, code, lambda }, index) => ({
      key: nextRowKey++,
      name,
      code,
      checked: lambda ? { code, lambda, located: lambda } : undefined,
      type: types[index],
    }));
    if (!this.rows.length) {
      this.rows = [this.newRow()];
    }
  }

  /** The input's schema, when the input is valid */
  get inputSchema(): Schema | undefined {
    const { query } = this.editorState.document;
    const [inputId] = query.getInputIds(this.original.id);
    return inputId === undefined
      ? undefined
      : this.editorState.analysis.schemas.get(inputId);
  }

  /** A row named `col_<n>`, the first such name no column has, in any case */
  private newRow(): CubeExtendRow {
    const taken = new Set(
      [
        ...(this.inputSchema?.names() ?? []),
        ...((this.rows as readonly CubeExtendRow[] | undefined) ?? []).map(
          ({ name }) => name,
        ),
      ].map(foldColumnName),
    );
    let index = 1;
    while (taken.has(foldColumnName(`col_${index}`))) {
      index += 1;
    }
    return {
      key: nextRowKey++,
      name: `col_${index}`,
      code: NEW_EXPRESSION_CODE,
    };
  }

  /** The columns the rows build: a row's lambda only while its code is the one validated */
  get columns(): ExtendColumn[] {
    return this.rows.map(({ name, code, checked }) => ({
      name,
      code,
      lambda: checked?.code === code ? checked.lambda : undefined,
    }));
  }

  /** Every row's code is the one the engine last checked */
  get isValidated(): boolean {
    return this.rows.every(({ code, checked }) => checked?.code === code);
  }

  /** Why Apply waits: a validation running, or a code not validated yet */
  override get applyDisabledReason(): string | undefined {
    return this.validating
      ? EXTEND_APPLY_DISABLED_REASON.VALIDATING
      : this.isValidated
        ? undefined
        : EXTEND_APPLY_DISABLED_REASON.NOT_VALIDATED;
  }

  private change(rows: readonly CubeExtendRow[]): void {
    this.rows = rows;
    this.touched = true;
  }

  addRow(): void {
    this.change([...this.rows, this.newRow()]);
  }

  removeRow(key: number): void {
    this.change(this.rows.filter((row) => row.key !== key));
  }

  /** Moves a row up (-1) or down (+1); a later column may use it, so its typing waits */
  moveRow(key: number, offset: number): void {
    const index = this.rows.findIndex((row) => row.key === key);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= this.rows.length) {
      return;
    }
    const rows = [...this.rows];
    const [moved] = rows.splice(index, 1);
    rows.splice(target, 0, moved as CubeExtendRow);
    this.change(rows);
  }

  setName(key: number, name: string): void {
    this.change(
      this.rows.map((row) =>
        row.key === key ? { ...row, name, problem: undefined } : row,
      ),
    );
  }

  /** A code edit drops the row's problem and type, until the next Validate */
  setCode(key: number, code: string): void {
    this.change(
      this.rows.map((row) =>
        row.key === key && row.code !== code
          ? { key: row.key, name: row.name, code, checked: row.checked }
          : row,
      ),
    );
  }

  build(): Extend {
    if (!this.touched) {
      return this.original;
    }
    return this.original
      .withColumns(this.columns)
      .withTyping(this.typing ?? this.original.typing);
  }

  /**
   * Checks every row with the engine (F10): parses each code changed since
   * the last Validate, then, when every code parses and the input is valid,
   * types the columns after the input, located in their codes, and plans the
   * query up to this node for the cube's database; a plan that fails is
   * planned again column by column to find the first that fails. Each
   * problem goes on its row.
   */
  *validate(): GeneratorFn<void> {
    const { editorState } = this;
    const { context } = editorState.document;
    if (this.validating || !context) {
      return;
    }
    this.validating = true;
    try {
      const nodeId = this.original.id;
      const sourceIdOf = (row: CubeExtendRow): string => `${nodeId}:${row.key}`;
      // 1. parse the changed codes
      const parsed = (yield Promise.all(
        this.rows.map(async (row) =>
          row.checked?.code === row.code
            ? row.checked
            : editorState.host.engine
                .parseExpression(row.code, sourceIdOf(row))
                .then(
                  (expression: CubeParsedExpression) => ({
                    code: row.code,
                    ...expression,
                  }),
                  (error: unknown) =>
                    error instanceof CubeEngineError
                      ? error
                      : new CubeEngineError(
                          CubeEngineErrorKind.NETWORK,
                          error instanceof Error
                            ? error.message
                            : String(error),
                        ),
                ),
        ),
      )) as (CubeExtendCheckedCode | CubeEngineError)[];
      const rows = this.rows.map((row, index) => {
        const result = parsed[index];
        return result instanceof CubeEngineError
          ? {
              key: row.key,
              name: row.name,
              code: row.code,
              problem: problemOf(result),
            }
          : { key: row.key, name: row.name, code: row.code, checked: result };
      });
      this.rows = rows;
      this.touched = true;
      const input = this.inputSchema;
      if (!input || rows.some((row) => row.checked === undefined)) {
        return;
      }
      // 2. type the columns, located in their codes
      const candidate = this.original.withColumns(this.columns);
      const query = editorState.document.query.replace(candidate);
      const located = rows.map((row) => ({
        name: row.name,
        lambda: (row.checked as CubeExtendCheckedCode).located,
      }));
      const answers = (yield editorState.host.engine.typeLambdas(
        context.model,
        buildCubeExtendTypingLambdas(
          query,
          candidate,
          located,
          editorState.registry,
          true,
        ),
      )) as ReadonlyMap<NodeId, Schema | CubeEngineError>;
      const { typing, error } = readCubeExtendTyping(
        answers,
        candidate,
        input,
        located,
      );
      this.typing = typing;
      if (typing.kind !== 'typed') {
        this.putProblem(
          typing.kind === 'failed' ? typing.column : undefined,
          error,
        );
        return;
      }
      this.rows = this.rows.map((row, index) => ({
        ...row,
        type: typing.types[index],
      }));
      // 3. plan the query up to this node, for the cube's database
      const failure = (yield this.planFrom(
        query.replace(candidate.withTyping(typing)),
        candidate,
        typing,
        input,
      )) as { column: number | undefined; error: CubeEngineError } | undefined;
      if (failure) {
        this.putProblem(failure.column, failure.error, true);
      }
    } finally {
      this.validating = false;
    }
  }

  /** The problem on its row, or on every row when the engine named none */
  private putProblem(
    column: number | undefined,
    error: CubeEngineError | undefined,
    planned = false,
  ): void {
    if (!error) {
      return;
    }
    const problem = problemOf(error);
    const shown = planned
      ? {
          message: getExtendPlanProblem(this.planDatabaseType, error.firstLine),
        }
      : problem;
    this.rows = this.rows.map((row, index) =>
      column === undefined || index === column
        ? { ...row, problem: shown }
        : row,
    );
  }

  /**
   * Plans the query up to the typed candidate, as a run would; when it
   * fails with several columns, the first k columns for every k, to name
   * the column the database can't run
   */
  private async planFrom(
    query: Query,
    candidate: Extend,
    typing: Extract<ExtendTyping, { kind: 'typed' }>,
    input: Schema,
  ): Promise<
    { column: number | undefined; error: CubeEngineError } | undefined
  > {
    const { editorState } = this;
    const { context } = editorState.document;
    const runtime = context?.runtime;
    // a cube with no runtime yet can't be planned
    if (!context || runtime === undefined) {
      return undefined;
    }
    await flowResult(editorState.loadModelOutline(context.model));
    this.planDatabaseType = editorState.getRunDatabaseType(
      query,
      candidate.id,
      context.model,
      runtime,
    );
    const plan = async (
      count: number,
    ): Promise<CubeEngineError | undefined> => {
      const columns = candidate.columns.slice(0, count);
      const prefix = candidate.withColumns(columns).withTyping({
        kind: 'typed',
        signature: getExtendSignature(input, columns),
        types: typing.types.slice(0, count),
      });
      const replaced = query.replace(prefix);
      const lambda = new QueryEmitter(
        // run up to this node, as Execute would with it selected
        replaced.selected === prefix.id ? replaced : replaced.select(prefix.id),
        editorState.registry,
      ).emitExecutionLambda({
        rowLimit: 1,
        runtime,
        databaseType: this.planDatabaseType,
      });
      return editorState.host.engine.planLambda(context.model, lambda).then(
        () => undefined,
        (error: unknown) =>
          error instanceof CubeEngineError
            ? error
            : new CubeEngineError(
                CubeEngineErrorKind.NETWORK,
                error instanceof Error ? error.message : String(error),
              ),
      );
    };
    const error = await plan(candidate.columns.length);
    if (!error) {
      return undefined;
    }
    if (
      candidate.columns.length < 2 ||
      error.kind === CubeEngineErrorKind.NETWORK
    ) {
      return { column: candidate.columns.length < 2 ? 0 : undefined, error };
    }
    for (let count = 1; count < candidate.columns.length; count += 1) {
      const failed = await plan(count);
      if (failed) {
        return { column: count - 1, error: failed };
      }
    }
    return { column: candidate.columns.length - 1, error };
  }
}
