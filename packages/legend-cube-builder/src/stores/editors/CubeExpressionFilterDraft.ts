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
  dependsOnDatabaseType,
  type ExpressionCheck,
  ExpressionFilter,
  type IR,
  type JsonObject,
  MESSAGE_CONDITION_NOT_BOOLEAN,
  type Query,
  QueryEmitter,
  type QueryNode,
  type Schema,
  UNCHECKED,
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
  EXPRESSION_FILTER_APPLY_DISABLED_REASON,
  EXPRESSION_FILTER_PARENTHESES_HINT,
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
import {
  buildCubeConditionCheckLambdas,
  readCubeConditionCheck,
} from '../CubeExpressionFilterCheck.js';
import {
  getCubeExtendUpstream,
  withoutEngineContext,
} from '../CubeExtendTyping.js';
import {
  CubeCodeCheckStatus,
  CubeExpressionAutoCheck,
} from './CubeExpressionAutoCheck.js';
import { getCubeEngineCompletions } from './CubeEngineCompletions.js';
import { CubeNodeDraft } from './CubeNodeDraft.js';

/** What the engine made of the condition's code the last time it was validated */
export interface CubeConditionCheckedCode {
  readonly code: string;
  readonly lambda: JsonObject;
  readonly located: JsonObject;
}

/** The condition's problem from the last Validate: a message, where it is in the code, and a hint */
export interface CubeConditionProblem {
  readonly message: string;
  readonly location?: CubeSourceLocation | undefined;
  readonly hint?: string | undefined;
  /**
   * Cube refused the condition before asking the engine (a backslash, `%` or
   * `_` on DuckDB, a pattern that isn't a literal): the panel's problems show
   * it, so the editor doesn't say it again (PLAN §11.14)
   */
  readonly refused?: true;
}

/** What a new condition's code starts as (PLAN §11.11) */
export const NEW_CONDITION_CODE = 'x | ';

/** An engine message about `and`, `or` or `not` given something other than a Boolean, which Pure's precedence causes */
const NEEDS_PARENTHESES = /Can't find a match for function '(?:and|or|not)\(/u;

/** An engine message about a column that can be empty in arithmetic, which `->toOne()` fixes */
const NEEDS_TO_ONE =
  /must have a multiplicity \[1\]|Can't find a match for function '(?:plus|minus|times|divide)[^']*\[0\.\.1\]/u;

const problemOf = (error: CubeEngineError): CubeConditionProblem => ({
  message: withoutEngineContext(error.firstLine),
  location: error.location,
  hint: NEEDS_PARENTHESES.test(error.detail)
    ? EXPRESSION_FILTER_PARENTHESES_HINT
    : NEEDS_TO_ONE.test(error.detail)
      ? EXTEND_TO_ONE_HINT
      : undefined,
});

const asEngineError = (error: unknown): CubeEngineError =>
  error instanceof CubeEngineError
    ? error
    : new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        error instanceof Error ? error.message : String(error),
      );

/**
 * The Filter by Expression editor's draft (PLAN §11.11): the condition's
 * code, `x | …`, checked once typing pauses (user, 2026-10-16), or at once
 * on F10: the engine parses it, Cube checks its rules, the engine checks it
 * after the input, located so an error points into the code, then plans the
 * query up to this node for the cube's database. Apply waits until the code
 * is the one checked; the node then holds the engine's lambda and its check,
 * so it needn't be checked again.
 */
export class CubeExpressionFilterDraft extends CubeNodeDraft<ExpressionFilter> {
  readonly editorState: CubeEditorState;
  /** A Variant input column's fields, opened from its chip (PLAN §11.20, V.9) */
  readonly jsonFields: CubeJsonFieldsState;
  code: string;
  /** What the engine made of the code the last time it parsed it */
  checked: CubeConditionCheckedCode | undefined;
  /** The problem from the last Validate, while the code is the one validated */
  problem: CubeConditionProblem | undefined;
  /** The check the last Validate gave, for the code as it was then */
  check: ExpressionCheck | undefined;
  validating = false;
  /** Anything was changed; until then, `build()` gives the original back */
  private touched = false;
  /** Its code was never checked, e.g. a cube's spec imported: it is checked as the editor opens */
  private readonly checksOnOpen: boolean;
  /** The database type the last plan was for, named in its problem */
  private planDatabaseType: string | undefined;
  /** Checks the code once typing pauses */
  private readonly autoCheck: CubeExpressionAutoCheck;

  constructor(original: ExpressionFilter, editorState: CubeEditorState) {
    super(original);
    makeObservable<CubeExpressionFilterDraft, 'touched'>(this, {
      original: observable.ref,
      code: observable,
      checked: observable.ref,
      problem: observable.ref,
      check: observable.ref,
      validating: observable,
      touched: observable,
      isValidated: computed,
      isChecked: computed,
      checkStatus: computed,
      applyDisabledReason: computed,
      setCode: action,
      validate: flow,
      follow: action,
    });
    this.editorState = editorState;
    this.jsonFields = new CubeJsonFieldsState(editorState, original.id);
    const { code, lambda } = original;
    this.code = code || NEW_CONDITION_CODE;
    this.checked = lambda ? { code, lambda, located: lambda } : undefined;
    this.autoCheck = new CubeExpressionAutoCheck(() =>
      flowResult(this.validate()).catch(
        editorState.host.applicationStore.alertUnhandledError,
      ),
    );
    this.checksOnOpen =
      !this.checked &&
      this.code.trim() !== NEW_CONDITION_CODE.trim() &&
      !editorState.readOnly;
    if (this.checksOnOpen) {
      this.autoCheck.schedule();
    }
  }

  /** Where the check stands, for the code box's border */
  get checkStatus(): CubeCodeCheckStatus {
    if (this.problem) {
      return CubeCodeCheckStatus.PROBLEM;
    }
    if (this.validating || !this.isValidated) {
      // a new condition, never edited, isn't checked until it is
      return this.touched || this.checked || this.checksOnOpen
        ? CubeCodeCheckStatus.CHECKING
        : CubeCodeCheckStatus.UNEDITED;
    }
    return this.isChecked || !this.inputSchema
      ? CubeCodeCheckStatus.READY
      : CubeCodeCheckStatus.CHECKING;
  }

  /** Checks the code at once (F10), not waiting for typing to pause */
  checkNow(): void {
    this.autoCheck.now();
  }

  /** The engine's completions of the condition typed so far, written as the input's filter */
  getEngineCompletions(
    textBeforeCursor: string,
  ): Promise<readonly CubeCodeCompletion[] | undefined> {
    return getCubeEngineCompletions(
      this.editorState,
      this.original.id,
      `->filter(${textBeforeCursor}`,
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

  /** The code is the one the engine last parsed */
  get isValidated(): boolean {
    return this.checked?.code === this.code;
  }

  /** The code is the one validated, and the engine said it is one Boolean of a row */
  get isChecked(): boolean {
    if (!this.isValidated) {
      return false;
    }
    const input = this.inputSchema;
    const check = this.check ?? this.original.check;
    return (
      check.kind === 'checked' &&
      input !== undefined &&
      this.build().currentCheck(input).kind === 'checked'
    );
  }

  /** Why Apply waits: a validation running, or the code not validated yet */
  override get applyDisabledReason(): string | undefined {
    return this.validating
      ? EXPRESSION_FILTER_APPLY_DISABLED_REASON.VALIDATING
      : this.isValidated
        ? undefined
        : EXPRESSION_FILTER_APPLY_DISABLED_REASON.NOT_VALIDATED;
  }

  /** A code edit drops the problem; the code is checked once typing pauses */
  setCode(code: string): void {
    if (code === this.code) {
      return;
    }
    this.code = code;
    this.problem = undefined;
    this.touched = true;
    if (!this.editorState.readOnly) {
      this.autoCheck.schedule();
    }
  }

  build(): ExpressionFilter {
    if (!this.touched) {
      return this.original;
    }
    return this.original
      .withCondition(
        this.code,
        this.isValidated ? this.checked?.lambda : undefined,
      )
      .withCheck(this.check ?? this.original.check);
  }

  /**
   * Goes on from a filter that differs from the original only in its check,
   * e.g. checked in the background after an Apply, keeping the code
   */
  override follow(node: QueryNode): boolean {
    const { original } = this;
    if (
      !(node instanceof ExpressionFilter) ||
      node.id !== original.id ||
      JSON.stringify([node.code, node.lambda, node.rest]) !==
        JSON.stringify([original.code, original.lambda, original.rest])
    ) {
      return false;
    }
    this.original = node;
    return true;
  }

  /**
   * Checks the condition with the engine (F10): parses the code when it
   * changed since the last Validate, checks Cube's own rules and the
   * database's, then, when the input is valid, checks the condition after
   * the input, located in the code, and plans the query up to this node for
   * the cube's database
   */
  *validate(): GeneratorFn<void> {
    const { editorState } = this;
    const { context } = editorState.document;
    if (this.validating || !context) {
      return;
    }
    this.validating = true;
    this.touched = true;
    try {
      const nodeId = this.original.id;
      const { code } = this;
      // 1. parse the code, if it changed
      let parsed = this.checked?.code === code ? this.checked : undefined;
      if (!parsed) {
        const result = (yield editorState.host.engine
          .parseExpression(code, `${nodeId}:condition`)
          .then(
            (expression: CubeParsedExpression) => ({ code, ...expression }),
            asEngineError,
          )) as CubeConditionCheckedCode | CubeEngineError;
        // the code changed meanwhile: its own check follows
        if (this.code !== code) {
          return;
        }
        if (result instanceof CubeEngineError) {
          this.checked = undefined;
          this.problem = problemOf(result);
          this.check = UNCHECKED;
          return;
        }
        parsed = result;
        this.checked = parsed;
      }
      this.problem = undefined;
      const input = this.inputSchema;
      if (!input) {
        return;
      }
      // 2. Cube's own checks, which need no engine, then the database's:
      // a pattern given % or _ on DuckDB, or one that isn't a literal but on
      // Snowflake, which the model's outline tells
      const candidate = this.original.withCondition(code, parsed.lambda);
      if (dependsOnDatabaseType(candidate)) {
        yield flowResult(editorState.loadModelOutline(context.model));
        if (this.code !== code) {
          return;
        }
      }
      const cubeProblem =
        candidate.getConditionProblem() ??
        editorState.getNodeDatabaseProblems(
          editorState.document.query,
          candidate,
        )[0];
      if (cubeProblem !== undefined) {
        this.problem = { message: cubeProblem, refused: true };
        this.check = UNCHECKED;
        return;
      }
      // 3. check the condition after the input, located in its code
      const query = editorState.document.query.replace(candidate);
      const answers = (yield editorState.host.engine.typeLambdas(
        context.model,
        buildCubeConditionCheckLambdas(
          query,
          candidate,
          parsed.located,
          input,
          editorState.registry,
          true,
        ),
      )) as ReadonlyMap<NodeId, Schema | CubeEngineError>;
      if (this.code !== code) {
        return;
      }
      const { check, error } = readCubeConditionCheck(
        answers,
        candidate,
        input,
        getCubeExtendUpstream(
          new QueryEmitter(query, editorState.registry),
          candidate.id,
          context.model,
        ),
      );
      this.check = check;
      if (check.kind === 'failed') {
        this.problem =
          check.resultType !== undefined
            ? { message: MESSAGE_CONDITION_NOT_BOOLEAN(check.resultType) }
            : error
              ? problemOf(error)
              : { message: check.message };
        return;
      }
      // 4. plan the query up to this node, for the cube's database
      const failure = (yield this.planFrom(
        query.replace(candidate.withCheck(check)),
        candidate.id,
      )) as CubeEngineError | undefined;
      if (this.code !== code) {
        return;
      }
      if (failure) {
        this.problem = {
          message: getExtendPlanProblem(
            this.planDatabaseType,
            failure.firstLine,
          ),
        };
      }
    } finally {
      this.validating = false;
    }
  }

  /** Plans the query up to the checked candidate, as a run with it selected would; the database's refusal, if any */
  private async planFrom(
    query: Query,
    nodeId: string,
  ): Promise<CubeEngineError | undefined> {
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
      nodeId,
      context.model,
      runtime,
    );
    let lambda: IR;
    try {
      lambda = new QueryEmitter(
        query.selected === nodeId ? query : query.select(nodeId),
        editorState.registry,
      ).emitExecutionLambda({
        rowLimit: 1,
        runtime,
        databaseType: this.planDatabaseType,
      });
    } catch (error) {
      // the query up to here can't run, e.g. a node above is invalid
      return new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        error instanceof Error ? error.message : String(error),
        nodeId,
      );
    }
    return editorState.host.engine
      .planLambda(context.model, lambda)
      .then(() => undefined, asEngineError);
  }
}
