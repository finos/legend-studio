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
  Extend,
  type ExtendColumn,
  type ExtendTyping,
  foldColumnName,
  getExtendSignature,
  type IR,
  type JsonObject,
  type Query,
  QueryEmitter,
  type QueryNode,
  type Schema,
  UNTYPED,
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
  type CubeCodeCompletion,
  type CubeParsedExpression,
  type CubeSourceLocation,
  type NodeId,
} from '../../graph-manager/CubeEngine.js';
import type { CubeEditorState } from '../CubeEditorState.js';
import { CubeJsonFieldsState } from '../variant/CubeJsonFieldsState.js';
import { getFreeCubeColumnName } from '../variant/CubeJsonOffers.js';
import {
  buildCubeExtendTypingLambdas,
  getCubeExtendUpstream,
  readCubeExtendTyping,
  withoutEngineContext,
} from '../CubeExtendTyping.js';
import {
  CubeCodeCheckStatus,
  CubeExpressionAutoCheck,
} from './CubeExpressionAutoCheck.js';
import {
  colSpecOf,
  getCubeEngineCompletions,
} from './CubeEngineCompletions.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** What the engine made of a row's code the last time it was validated */
export interface CubeExtendCheckedCode {
  readonly code: string;
  readonly lambda: JsonObject;
  readonly located: JsonObject;
}

/** A row's problem from the last check: the engine's message, where it is in the code, and a hint */
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

/** The rows as the engine is asked about them: their names and codes, in order */
const askedOf = (rows: readonly CubeExtendRow[]): string =>
  JSON.stringify(rows.map(({ key, name, code }) => [key, name, code]));

/**
 * The Extend editor's draft (PLAN §11.7): a row per new column, its name and
 * its code, `x | …`, checked once typing pauses (user, 2026-10-16), or at
 * once on F10: the engine checks each changed code, types the columns as a
 * chain after the input, located so an error points into the code, and
 * plans the query for the cube's database. Apply waits until every row's
 * code is the one checked; the node then holds the engine's lambdas and
 * their typing, so it needn't be typed again.
 */
export class CubeExtendDraft extends CubeNodeDraft<Extend> {
  readonly editorState: CubeEditorState;
  /** A Variant input column's fields, opened from its chip (PLAN §11.20, V.9) */
  readonly jsonFields: CubeJsonFieldsState;
  rows: readonly CubeExtendRow[];
  /** The typing the last check gave, for the rows as they were then */
  typing: ExtendTyping | undefined;
  validating = false;
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;
  /** A row's code was never checked, e.g. a cube's spec imported: the rows are checked as the editor opens */
  private readonly checksOnOpen: boolean;
  /** The database type the last plan was for, named in its problem */
  private planDatabaseType: string | undefined;
  /** Checks the rows once typing pauses */
  private readonly autoCheck: CubeExpressionAutoCheck;

  constructor(original: Extend, editorState: CubeEditorState) {
    super(original);
    makeObservable<CubeExtendDraft, 'touched'>(this, {
      original: observable.ref,
      rows: observable.ref,
      typing: observable.ref,
      validating: observable,
      touched: observable,
      columns: computed,
      isValidated: computed,
      applyDisabledReason: computed,
      addRow: action,
      addColumn: action,
      removeRow: action,
      moveRow: action,
      setName: action,
      setCode: action,
      validate: flow,
      follow: action,
    });
    this.editorState = editorState;
    this.jsonFields = new CubeJsonFieldsState(editorState, original.id);
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
    this.autoCheck = new CubeExpressionAutoCheck(() =>
      flowResult(this.validate()).catch(
        editorState.host.applicationStore.alertUnhandledError,
      ),
    );
    this.checksOnOpen =
      !editorState.readOnly &&
      this.rows.some(
        (row) => !row.checked && row.code.trim() !== NEW_EXPRESSION_CODE.trim(),
      );
    if (this.checksOnOpen) {
      this.autoCheck.schedule();
    }
  }

  /**
   * Where a row's check stands, for its code box's border: a new row never
   * edited isn't checked until it is
   */
  getRowCheckStatus(row: CubeExtendRow): CubeCodeCheckStatus {
    if (row.problem) {
      return CubeCodeCheckStatus.PROBLEM;
    }
    if (this.validating || row.checked?.code !== row.code) {
      return !this.touched && !row.checked && !this.checksOnOpen
        ? CubeCodeCheckStatus.UNEDITED
        : CubeCodeCheckStatus.CHECKING;
    }
    return row.type !== undefined || !this.inputSchema
      ? CubeCodeCheckStatus.READY
      : CubeCodeCheckStatus.CHECKING;
  }

  /**
   * Whether a row's code was read but waits on another row's problem: the
   * rows are typed together, once each one's code is right
   */
  isRowWaitingOnOthers(row: CubeExtendRow): boolean {
    return (
      !this.validating &&
      !row.problem &&
      row.checked?.code === row.code &&
      row.type === undefined &&
      this.rows.some((other) => other.key !== row.key && other.problem)
    );
  }

  /** Checks the rows at once (F10), not waiting for typing to pause */
  checkNow(): void {
    this.autoCheck.now();
  }

  /**
   * The engine's completions of a row's code typed so far, written as a new
   * column of the input after the rows above it, which it can use
   */
  getEngineCompletions(
    key: number,
    textBeforeCursor: string,
  ): Promise<readonly CubeCodeCompletion[] | undefined> {
    const index = this.rows.findIndex((row) => row.key === key);
    const row = this.rows[index];
    const above = this.rows
      .slice(0, Math.max(index, 0))
      .map(({ name, code }) => `->extend(${colSpecOf(name)}:${code})`)
      .join('');
    return getCubeEngineCompletions(
      this.editorState,
      this.original.id,
      `${above}->extend(${colSpecOf(row?.name ?? '')}:${textBeforeCursor}`,
    );
  }

  override dispose(): void {
    this.autoCheck.dispose();
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

  /** An edit: the rows are checked once typing pauses */
  private change(rows: readonly CubeExtendRow[]): void {
    this.rows = rows;
    this.touched = true;
    if (!this.editorState.readOnly) {
      this.autoCheck.schedule();
    }
  }

  addRow(): void {
    this.change([...this.rows, this.newRow()]);
  }

  /**
   * Adds a row of this code, named as given or the next free name, compared
   * as the input's and the other rows' names fold (a JSON field's "+ column",
   * V.9); it replaces a new row still empty
   */
  addColumn(name: string, code: string): void {
    const blank = this.rows.find(
      (row) => row.code.trim() === NEW_EXPRESSION_CODE.trim() && !row.checked,
    );
    const others = this.rows.filter((row) => row !== blank);
    this.change([
      ...others,
      {
        key: nextRowKey++,
        name: getFreeCubeColumnName(name, [
          ...(this.inputSchema?.names() ?? []),
          ...others.map((row) => row.name),
        ]),
        code,
      },
    ]);
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

  /** A code edit drops the row's problem and type, until it is checked again */
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
   * Goes on from an Extend that differs from the original only in its
   * typing, e.g. typed in the background after an Apply, keeping the rows;
   * rows not validated in this draft take the new types
   */
  override follow(node: QueryNode): boolean {
    const { original } = this;
    if (
      !(node instanceof Extend) ||
      node.id !== original.id ||
      JSON.stringify([node.columns, node.rest]) !==
        JSON.stringify([original.columns, original.rest])
    ) {
      return false;
    }
    this.original = node;
    if (this.typing === undefined) {
      const types = node.typing.kind === 'typed' ? node.typing.types : [];
      this.rows = this.rows.map((row, index) => {
        const column = node.columns[index];
        return column?.name === row.name && column.code === row.code
          ? { ...row, type: types[index] }
          : row;
      });
    }
    return true;
  }

  /**
   * Checks every row with the engine (F10): parses each code changed since
   * the last check, then, when every code parses and the input is valid,
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
    // the rows as asked about: an edit meanwhile has its own check follow
    const asked = askedOf(this.rows);
    const isStale = (): boolean => askedOf(this.rows) !== asked;
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
      if (isStale()) {
        return;
      }
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
      // 2. Cube's own checks of each column, which need no engine: a name
      // the input has, in another case, would otherwise type
      const candidate = this.original.withColumns(this.columns);
      if (this.putCubeProblems(candidate.getColumnProblems(input))) {
        this.typing = UNTYPED;
        return;
      }
      // 3. type the columns, located in their codes
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
      if (isStale()) {
        return;
      }
      const { typing, error } = readCubeExtendTyping(
        answers,
        candidate,
        input,
        located,
        getCubeExtendUpstream(
          new QueryEmitter(query, editorState.registry),
          candidate.id,
          context.model,
        ),
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
      // a type Cube can't hold, such as an enumeration's own `Any`
      if (this.putCubeProblems(candidate.getTypeProblems(typing.types))) {
        return;
      }
      // 4. plan the query up to this node, for the cube's database
      const failure = (yield this.planFrom(
        query.replace(candidate.withTyping(typing)),
        candidate,
        typing,
        input,
      )) as { column: number | undefined; error: CubeEngineError } | undefined;
      if (isStale()) {
        return;
      }
      if (failure) {
        this.putProblem(failure.column, failure.error, true);
      }
    } finally {
      this.validating = false;
    }
  }

  /** Cube's problems, each on its row; whether there was one */
  private putCubeProblems(problems: readonly (string | undefined)[]): boolean {
    this.rows = this.rows.map((row, index) => {
      const message = problems[index];
      return message === undefined ? row : { ...row, problem: { message } };
    });
    return problems.some((problem) => problem !== undefined);
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
      let lambda: IR;
      try {
        lambda = new QueryEmitter(
          // run up to this node, as Execute would with it selected
          replaced.selected === prefix.id
            ? replaced
            : replaced.select(prefix.id),
          editorState.registry,
        ).emitExecutionLambda({
          rowLimit: 1,
          runtime,
          mapping: context.mapping,
          databaseType: this.planDatabaseType,
        });
      } catch (error) {
        // the query up to here can't run, e.g. a node above is invalid
        return new CubeEngineError(
          CubeEngineErrorKind.COMPILE,
          error instanceof Error ? error.message : String(error),
          candidate.id,
        );
      }
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
