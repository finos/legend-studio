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

/** Keeps one row of each set of identical rows (spec §7.6); the columns stay as they are */
export class Distinct extends UnaryNode {
  static readonly TYPE = 'distinct';

  get type(): string {
    return Distinct.TYPE;
  }

  /** Nothing to set, so always valid once it has its input: no error to add */
  validate(inputSchemas: readonly Schema[], errors?: string[]): boolean {
    ensureSchemas(inputSchemas, this.ports);
    return true;
  }

  /** The input's order: removing repeated rows keeps the others in order */
  override outputOrder(
    inputOrders: readonly (RowOrder | undefined)[],
  ): RowOrder | undefined {
    return keepInputOrder(inputOrders);
  }

  describe(): string {
    return 'Distinct Values';
  }
}
