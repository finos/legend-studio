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

import type { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import { EmitRole, type RelationExpr, storeAccessor } from '../CubeIR.js';
import { originOf } from '../EmitContext.js';

/**
 * A relational table is its store accessor, `#>{db.schema.table}#`. The names
 * are passed as stored, quotes included: the engine needs them, and the JSON
 * keeps a quoted dotted name (`"a.b"`) whole.
 */
export const emitRelationalTableSource = (
  node: RelationalTableSource,
): RelationExpr =>
  storeAccessor(
    [node.database, node.schema, node.table],
    originOf(node.id, EmitRole.ACCESSOR),
  );
