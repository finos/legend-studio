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

import type { DataSpaceSource } from '../../nodes/sources/DataSpaceSource.js';
import { EmitRole, raw, type RelationExpr } from '../CubeIR.js';
import { originOf } from '../EmitContext.js';

/**
 * A data space source is its relation's expression, as the host's query
 * builder wrote it (PLAN §11.25), e.g.
 * `trading::Trade.all()->filter(…)->project(~[…])`: passed through as the
 * engine's JSON, with the node's origin. The cube's `from(mapping, runtime)`
 * comes last, after every step.
 */
export const emitDataSpaceSource = (node: DataSpaceSource): RelationExpr =>
  raw(node.relationExpression, originOf(node.id, EmitRole.ACCESSOR));
