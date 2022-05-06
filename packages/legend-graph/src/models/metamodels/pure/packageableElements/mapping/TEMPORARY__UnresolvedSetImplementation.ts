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

import { Class } from '../domain/Class';
import { PackageableElementExplicitReference } from '../PackageableElementReference';
import { InferableMappingElementIdExplicitValue } from './InferableMappingElementId';
import { InferableMappingElementRootExplicitValue } from './InferableMappingElementRoot';
import type { Mapping } from './Mapping';
import {
  SetImplementation,
  type SetImplementationVisitor,
} from './SetImplementation';

/**
 * When set implementation cannot be resolved by ID,
 * we try to avoid failing graph building for now
 * instead, we will leave this loose end unresolved.
 *
 * NOTE: this is just a temporary solutions until we make this a hard-fail post migration.
 *
 * See https://github.com/finos/legend-studio/issues/880
 * See https://github.com/finos/legend-studio/issues/941
 *
 * @discrepancy graph-building
 */
export class TEMPORARY__UnresolvedSetImplementation extends SetImplementation {
  constructor(id: string, parent: Mapping) {
    super(
      InferableMappingElementIdExplicitValue.create(id, ''),
      parent,
      PackageableElementExplicitReference.create(new Class('')),
      InferableMappingElementRootExplicitValue.create(false),
    );
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_TEMPORARY__UnresolvedSetImplementation(this);
  }
}
