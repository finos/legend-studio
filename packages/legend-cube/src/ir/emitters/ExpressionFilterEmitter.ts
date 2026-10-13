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

import type { ExpressionFilter } from '../../nodes/transforms/ExpressionFilter.js';
import { getEmitPatternProblem } from '../CubeDialects.js';
import { EmitRole, func, lambdaJson, type RelationExpr } from '../CubeIR.js';
import { type EmitContext, originOf } from '../EmitContext.js';

/**
 * Emits a Filter by Expression as `->filter(<lambda>)` (PLAN §11.11), the
 * lambda the engine's JSON, marked with the node, so an engine error inside
 * it lands on the node. After a Partition it reads the `let` the run binds
 * the window with (§8.6), so a condition on a window column runs after the
 * window. Its patterns are refused where the editor refuses them
 * (`getEmitPatternProblem`, §11.11, §11.14).
 *
 * The filter must be valid for its input schema.
 */
export const emitExpressionFilter = (
  node: ExpressionFilter,
  inputs: readonly RelationExpr[],
  context: EmitContext,
): RelationExpr => {
  const [input] = inputs;
  if (!input) {
    throw new Error(
      `Filter by expression "${node.id}" needs an input to be emitted`,
    );
  }
  const { lambda } = node;
  if (!lambda) {
    throw new Error(`Filter by expression "${node.id}" has no condition`);
  }
  const problem = getEmitPatternProblem(node, context.databaseType);
  if (problem !== undefined) {
    throw new Error(problem);
  }
  return func(
    'filter',
    [input, lambdaJson(lambda, originOf(node.id, EmitRole.EXPRESSION))],
    originOf(node.id, EmitRole.FILTER),
  );
};
