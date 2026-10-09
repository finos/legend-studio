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
import { MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP } from '../../messages/CubeMessages.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  assertRowSetting,
  describeRowSetting,
  validateRowIndex,
} from './RowSettings.js';

/**
 * Keeps the rows of its input from position `start` up to, but not
 * including, position `stop`, counting from 0: the range `[start, stop)`
 * (D5). The columns stay as they are.
 */
export class Slice extends UnaryNode {
  static readonly TYPE = 'slice';
  /** The range of a new Slice */
  static readonly DEFAULT_START = 10;
  static readonly DEFAULT_STOP = 20;

  /** The first row kept, from 0; `undefined` once the user clears it, which is invalid */
  readonly start: number | undefined;
  /** The first row not kept; `undefined` once the user clears it, which is invalid */
  readonly stop: number | undefined;

  /**
   * `start` and `stop` have no defaults on purpose: an explicit `undefined`
   * stays cleared, so the user sees the message rather than silently getting
   * the default (spec §7.9). A new node gets `DEFAULT_START` and
   * `DEFAULT_STOP` from its definition's `create`.
   */
  constructor(
    id: string,
    start: number | undefined,
    stop: number | undefined,
    rest?: JsonObject,
  ) {
    super(id, rest);
    assertRowSetting(start, `A slice's start`);
    assertRowSetting(stop, `A slice's stop`);
    this.start = start;
    this.stop = stop;
  }

  get type(): string {
    return Slice.TYPE;
  }

  /** A new slice with the same id, and this range */
  withRange(start: number | undefined, stop: number | undefined): Slice {
    return new Slice(this.id, start, stop, this.rest);
  }

  /**
   * Each bound must be a whole number of at least 0, checked apart so both can
   * be reported; then the start must come before the stop. The engine would
   * plan a negative fetch otherwise.
   */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    const validStart = validateRowIndex(this.start, 'Start row index', errors);
    const validStop = validateRowIndex(this.stop, 'Stop row index', errors);
    return (
      validStart &&
      validStop &&
      validate(
        (this.start as number) < (this.stop as number),
        MESSAGE_START_ROW_INDEX_MUST_BE_LESS_THAN_STOP,
        errors,
      )
    );
  }

  /** The input schema, or `undefined` when the range is invalid */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    return this.validate(inputSchemas) ? inputSchemas[0] : undefined;
  }

  /** `Take rows 10 to 20 (20 excluded)`: the stop row is not kept (PLAN §11.4) */
  /** The input's order: the rows of the range, in order */
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    return keepInputOrder(inputOrders);
  }

  /** It takes rows by its input's order, so the emitter sorts its input first */
  override get consumesInputOrder(): boolean {
    return true;
  }

  describe(): string {
    const range = `Take rows ${describeRowSetting(this.start)} to ${describeRowSetting(this.stop)}`;
    return this.stop === undefined ? range : `${range} (${this.stop} excluded)`;
  }
}
