/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { INTERNAL__PseudoClass } from '../domain/INTERNAL__PseudoClass.js';
import { PackageableElementExplicitReference } from '../PackageableElementReference.js';
import { InferableMappingElementIdExplicitValue } from './InferableMappingElementId.js';
import { InferableMappingElementRootExplicitValue } from './InferableMappingElementRoot.js';
import type { Mapping } from './Mapping.js';
import {
  SetImplementation,
  type SetImplementationVisitor,
} from './SetImplementation.js';

/**
 * When set implementation cannot be resolved by ID, we try to avoid failing graph building
 * for now instead, we will leave this loose end unresolved. There are a few different cases
 * where this could happen:
 *
 * 1. In Pure, we used to let users define property mappings with source/target set implementation
 *    pointing at another class mapping from a different mapping, which might not be available in
 *    the included mapping hierarchy and it would still work, see the following issues for more details:
 *    See https://github.com/finos/legend-studio/issues/880
 *    See https://github.com/finos/legend-studio/issues/941
 * 2. When we handle unknown mapping include, since the mapping include is unknown, we might not be
 *    able to resolve the underlying mapping and its children class mappings, so like case (1), some
 *    source/target set implementation might not be resolvable.
 *    See https://github.com/finos/legend-studio/pull/2242
 *
 * While (1) is definitely an anti-pattern, (2) is a fairly valid use case in order for us to properly
 * support unsupported
 * See https://github.com/finos/legend-studio/issues/315
 *
 * @discrepancy graph-building
 */
export class INTERNAL__UnresolvedSetImplementation extends SetImplementation {
  constructor(id: string, parent: Mapping) {
    super(
      InferableMappingElementIdExplicitValue.create(id, ''),
      parent,
      PackageableElementExplicitReference.create(
        INTERNAL__PseudoClass.INSTANCE,
      ),
      InferableMappingElementRootExplicitValue.create(false),
    );
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_INTERNAL__UnresolvedSetImplementation(this);
  }
}
