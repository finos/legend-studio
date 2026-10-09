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

import type { DataProductAccessPointSource } from '../../nodes/sources/DataProductAccessPointSource.js';
import { dataProductAccessor, EmitRole, type RelationExpr } from '../CubeIR.js';
import { originOf } from '../EmitContext.js';

/**
 * A data product's access point is its accessor, `#P{dataProduct.accessPoint}#`
 * (PLAN §6.8); its group is not part of it
 */
export const emitDataProductAccessPointSource = (
  node: DataProductAccessPointSource,
): RelationExpr =>
  dataProductAccessor(
    [node.dataProduct, node.accessPoint],
    originOf(node.id, EmitRole.ACCESSOR),
  );
