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

import { UnaryNode } from '../../graph/QueryNode.js';
import { keepInputOrder, type RowOrder } from '../../inference/RowOrder.js';
import { ensureSchemas, validate } from '../../inference/ValidationUtils.js';
import {
  BLANK_PLACEHOLDER,
  ERR_CHECKING,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CONDITION_BACKSLASH,
  MESSAGE_CONDITION_NOT_A_LAMBDA,
  MESSAGE_CONDITION_NOT_BOOLEAN,
  MESSAGE_CONDITION_NOT_CHECKED,
} from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import {
  copyJson,
  hashText,
  isJsonObject,
  type JsonObject,
  stableJsonText,
} from '../../utils/Json.js';
import { isOneParameterLambda } from './Extend.js';
import { findLikeFunctionWithBackslash } from './LikeFunctions.js';

/**
 * What the engine said of a Filter by Expression's condition, for one input
 * schema and one lambda, told apart by their signature
 * (`getExpressionFilterSignature`): nothing yet; checked, one Boolean of a
 * row; or why not, with the condition's type when it types but isn't one
 * Boolean (`resultType`, as `Integer[1]`).
 *
 * `upstream` is what the host that checked it gave the engine for the input,
 * digested, as an Extend's typing records it (PLAN §11.7, §11.11): a host
 * compares it and checks again when it differs. Cube never reads it, and
 * doesn't save it: a loaded cube is checked again.
 */
export type ExpressionCheck =
  | { readonly kind: 'unresolved' }
  | {
      readonly kind: 'checked';
      readonly signature: string;
      readonly upstream?: string | undefined;
    }
  | {
      readonly kind: 'failed';
      readonly signature: string;
      readonly message: string;
      readonly resultType?: string | undefined;
      readonly upstream?: string | undefined;
    };

export const UNCHECKED: ExpressionCheck = Object.freeze({ kind: 'unresolved' });

/**
 * The signature of a check: a digest of the input's columns (name, type and
 * nullability) and of the condition's lambda. A check is current while the
 * signature is the same.
 */
export const getExpressionFilterSignature = (
  input: Schema,
  lambda: JsonObject | undefined,
): string =>
  hashText(
    stableJsonText({
      input: input.columns.map((column) => [
        column.name,
        column.type.fullName,
        column.nullable,
      ]),
      lambda: lambda ?? null,
    }),
  );

/**
 * Keeps the rows of its input for which a condition is true (PLAN §11.11): a
 * lambda of one row, as written in Query's text mode, `x | $x.SHIPPED_DATE >
 * $x.REQUIRED_DATE`, which the engine checks against the cube's model. Until
 * it has, for this input and this condition, the node waits
 * (`ERR_CHECKING`). The columns stay as they are, and the rows kept stay in
 * the input's order.
 */
export class ExpressionFilter extends UnaryNode {
  static readonly TYPE = 'expressionFilter';

  /** The condition's text, as the user typed it */
  readonly code: string;
  /**
   * The engine's JSON for the text, a lambda, without source information and
   * with its number literals as their digit strings, as an Extend column's
   * (PLAN §11.7); `undefined` until the text is checked
   */
  readonly lambda: JsonObject | undefined;
  readonly check: ExpressionCheck;

  /** By default, no condition yet, and so nothing checked */
  constructor(
    id: string,
    code = '',
    lambda?: JsonObject,
    check: ExpressionCheck = UNCHECKED,
    rest?: JsonObject,
  ) {
    super(id, rest);
    // decoded values arrive as `unknown`, so check the shape anyway
    const text: unknown = code;
    const json: unknown = lambda;
    if (
      typeof text !== 'string' ||
      (json !== undefined && !isJsonObject(json))
    ) {
      throw new Error(
        `A filter by expression's code must be a string, and its lambda an object or left out`,
      );
    }
    this.code = code;
    this.lambda =
      lambda === undefined ? undefined : Object.freeze(copyJson(lambda));
    this.check = Object.freeze(check);
  }

  get type(): string {
    return ExpressionFilter.TYPE;
  }

  /** A new filter with the same id, and this condition; the check is kept, and is current only if it is for the same lambda */
  withCondition(
    code: string,
    lambda: JsonObject | undefined,
  ): ExpressionFilter {
    return new ExpressionFilter(this.id, code, lambda, this.check, this.rest);
  }

  /** A new filter with the same id and condition, and this check */
  withCheck(check: ExpressionCheck): ExpressionFilter {
    return new ExpressionFilter(
      this.id,
      this.code,
      this.lambda,
      check,
      this.rest,
    );
  }

  /** The check, if it is for this input schema and this condition; else nothing yet */
  currentCheck(input: Schema): ExpressionCheck {
    return this.check.kind !== 'unresolved' &&
      this.check.signature === getExpressionFilterSignature(input, this.lambda)
      ? this.check
      : UNCHECKED;
  }

  /**
   * The condition's first problem that needs no engine, `undefined` when it
   * has none: a condition, a lambda of one row, and no backslash in a
   * `LIKE` function's literal. The editor checks these before it asks the
   * engine to check the condition.
   */
  getConditionProblem(): string | undefined {
    const { lambda } = this;
    if (lambda === undefined) {
      return MESSAGE_CANNOT_BE_EMPTY('Condition');
    }
    if (!isOneParameterLambda(lambda)) {
      return MESSAGE_CONDITION_NOT_A_LAMBDA;
    }
    const like = findLikeFunctionWithBackslash(lambda);
    return like === undefined ? undefined : MESSAGE_CONDITION_BACKSLASH(like);
  }

  /**
   * Checks, in order: the condition's problems that need no engine
   * (`getConditionProblem`); then the check: pending until the engine has
   * checked this condition for this input (`ERR_CHECKING`), then why it
   * couldn't, naming the condition's type when it isn't one Boolean
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    // `ensureSchemas` has checked there is one schema per port
    const [schema] = ensureSchemas(inputSchemas, this.ports) as [Schema];
    const problem = this.getConditionProblem();
    return (
      validate(problem === undefined, problem ?? '', errors) &&
      this.validateCheck(this.currentCheck(schema), errors)
    );
  }

  private validateCheck(check: ExpressionCheck, errors?: string[]): boolean {
    switch (check.kind) {
      case 'unresolved':
        return validate(false, ERR_CHECKING, errors);
      case 'failed': {
        if (check.resultType !== undefined) {
          return validate(
            false,
            MESSAGE_CONDITION_NOT_BOOLEAN(check.resultType),
            errors,
          );
        }
        const [firstLine] = check.message.split('\n');
        return validate(
          false,
          MESSAGE_CONDITION_NOT_CHECKED(firstLine?.trim() ?? ''),
          errors,
        );
      }
      default:
        return true;
    }
  }

  /** The input schema, or `undefined` when the condition is invalid or not checked yet */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    return this.validate(inputSchemas) ? inputSchemas[0] : undefined;
  }

  /** The input's order: removing rows keeps the others in order */
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    return keepInputOrder(inputOrders);
  }

  /** `Filter by x | $x.PRICE > 10`, on one line */
  override isUnset(): boolean {
    return !this.code.trim();
  }

  describe(): string {
    const code = this.code.replace(/\s+/gu, ' ').trim();
    return `Filter by ${code || BLANK_PLACEHOLDER}`;
  }

  /** Without the condition, which may hold sensitive values, for logs and telemetry */
  override describeRedacted(): string {
    return 'Filter by an expression';
  }
}
