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
import { ensureSchemas } from '../../inference/ValidationUtils.js';
import type { Schema } from '../../schema/Schema.js';
import type { JsonObject } from '../../utils/Json.js';
import {
  assertRowSetting,
  describeRowSetting,
  validateSize,
} from './RowSettings.js';

/** Keeps the first rows of its input (spec §7.8); the columns stay as they are */
export class Limit extends UnaryNode {
  static readonly TYPE = 'limit';
  /** The size of a new Limit */
  static readonly DEFAULT_SIZE = 10;

  /** How many rows to keep; `undefined` once the user clears it, which is invalid */
  readonly size: number | undefined;

  /**
   * `size` has no default on purpose: an explicit `undefined` stays cleared,
   * so the user sees the message rather than silently getting 10 (spec
   * §7.7). A new node gets `DEFAULT_SIZE` from its definition's `create`.
   */
  constructor(id: string, size: number | undefined, rest?: JsonObject) {
    super(id, rest);
    assertRowSetting(size, `A limit's size`);
    this.size = size;
  }

  get type(): string {
    return Limit.TYPE;
  }

  /** A new limit with the same id, and this size */
  withSize(size: number | undefined): Limit {
    return new Limit(this.id, size, this.rest);
  }

  /** The size must be a whole number of at least 1 */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    return validateSize(this.size, errors);
  }

  /** The input schema, or `undefined` when the size is invalid */
  override schematize(inputSchemas: readonly Schema[]): Schema | undefined {
    return this.validate(inputSchemas) ? inputSchemas[0] : undefined;
  }

  /** The input's order: the first rows, in order */
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
    return `Take first ${describeRowSetting(this.size)} row(s)`;
  }
}
