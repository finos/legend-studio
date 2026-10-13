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

import type { FunctionSource } from '../../nodes/sources/FunctionSource.js';
import {
  collection,
  EmitRole,
  func,
  literal,
  type RelationExpr,
} from '../CubeIR.js';
import { originOf } from '../EmitContext.js';

/**
 * A function source is its call, `sales::ordersAbove(100.0)` (PLAN §6.5):
 * each parameter's value as a literal, an empty `[0..1]` one as `[]`. Only
 * a valid source is emitted, so every value is a literal of its type.
 */
export const emitFunctionSource = (node: FunctionSource): RelationExpr =>
  func(
    node.function,
    node.values.map((value) => {
      if (value === undefined) {
        return collection([]);
      }
      if (value.kind === 'invalid') {
        throw new Error(
          `Can't emit function "${node.function}": a parameter's value is not valid`,
        );
      }
      return literal(value, originOf(node.id, EmitRole.VALUE));
    }),
    originOf(node.id, EmitRole.ACCESSOR),
  );
