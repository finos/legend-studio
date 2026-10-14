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

import { MESSAGE_SERVICE_NOT_READABLE } from '../../messages/CubeMessages.js';
import type { ServiceSource } from '../../nodes/sources/ServiceSource.js';
import type { RelationExpr } from '../CubeIR.js';

/**
 * A service, in progress (PLAN §6.4). A service source is never valid yet,
 * so nothing emits it: a query that reaches one is refused before this.
 *
 * TODO: emit the service through the engine's SQL island, a relation the
 * cube goes on from: `#SQL{select * from service('/pattern')}#`, with its
 * parameters by name (`service('/pattern', name => 'value')`). The island
 * needs its own IR node and its protocol JSON in the lambda serializer.
 */
export const emitServiceSource = (node: ServiceSource): RelationExpr => {
  throw new Error(`${MESSAGE_SERVICE_NOT_READABLE}: ${node.pattern}`);
};
