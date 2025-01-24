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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../Core_HashUtils.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { PropertyOwnerImplementation } from './PropertyOwnerImplementation.js';
import type { Mapping } from './Mapping.js';
import type { OperationSetImplementation } from './OperationSetImplementation.js';
import type { PureInstanceSetImplementation } from '../store/modelToModel/mapping/PureInstanceSetImplementation.js';
import type { FlatDataInstanceSetImplementation } from '../store/flatData/mapping/FlatDataInstanceSetImplementation.js';
import type { EmbeddedFlatDataPropertyMapping } from '../store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import type { RelationalInstanceSetImplementation } from '../store/relational/mapping/RelationalInstanceSetImplementation.js';
import type { RootRelationalInstanceSetImplementation } from '../store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import type { InferableMappingElementIdValue } from './InferableMappingElementId.js';
import type { InferableMappingElementRoot } from './InferableMappingElementRoot.js';
import type { AggregationAwareSetImplementation } from './aggregationAware/AggregationAwareSetImplementation.js';
import type { InstanceSetImplementation } from './InstanceSetImplementation.js';
import type { MergeOperationSetImplementation } from './MergeOperationSetImplementation.js';
import type { INTERNAL__UnresolvedSetImplementation } from './INTERNAL__UnresolvedSetImplementation.js';
import type { Class } from '../domain/Class.js';
import type { INTERNAL__UnknownSetImplementation } from './INTERNAL__UnknownSetImplementation.js';
import type { RelationFunctionInstanceSetImplementation } from './relationFunction/RelationFunctionInstanceSetImplementation.js';

export interface SetImplementationVisitor<T> {
  visit_SetImplementation(setImplementation: InstanceSetImplementation): T;
  visit_INTERNAL__UnknownSetImplementation(
    setImplementation: INTERNAL__UnknownSetImplementation,
  ): T;
  visit_INTERNAL__UnresolvedSetImplementation(
    setImplementation: INTERNAL__UnresolvedSetImplementation,
  ): T;

  visit_MergeOperationSetImplementation(
    setImplementation: MergeOperationSetImplementation,
  ): T;
  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): T;
  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): T;
  visit_FlatDataInstanceSetImplementation(
    setImplementation: FlatDataInstanceSetImplementation,
  ): T;
  // NOTE: since embedded mappings are also treated as a set implementation, we have a visit method for them here
  visit_EmbeddedFlatDataSetImplementation(
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ): T;
  visit_RelationalInstanceSetImplementation(
    setImplementation: RelationalInstanceSetImplementation,
  ): T;
  visit_RootRelationalInstanceSetImplementation(
    setImplementation: RootRelationalInstanceSetImplementation,
  ): T;
  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): T;
  visit_RelationFunctionInstanceSetImplementation(
    setImplementation: RelationFunctionInstanceSetImplementation,
  ): T;
}

export abstract class SetImplementation
  implements PropertyOwnerImplementation, Hashable
{
  readonly _PARENT: Mapping;
  readonly _isEmbedded: boolean = false;

  id: InferableMappingElementIdValue;
  class: PackageableElementReference<Class>;
  root: InferableMappingElementRoot;
  superSetImplementationId?: string | undefined;

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
  ) {
    this.id = id;
    this._PARENT = parent;
    this.class = _class;
    this.root = root;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SET_IMPLEMENTATION,
      this.id.valueForSerialization ?? '',
      this.class.valueForSerialization ?? '',
      this.root.valueForSerialization.toString(),
      this.superSetImplementationId ?? '',
    ]);
  }

  abstract accept_SetImplementationVisitor<T>(
    visitor: SetImplementationVisitor<T>,
  ): T;
}
