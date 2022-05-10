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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementReference } from '../PackageableElementReference';
import type { PropertyOwnerImplementation } from './PropertyOwnerImplementation';
import type { Mapping } from './Mapping';
import type { Stubable } from '../../../../../helpers/Stubable';
import type { OperationSetImplementation } from './OperationSetImplementation';
import type { PureInstanceSetImplementation } from '../store/modelToModel/mapping/PureInstanceSetImplementation';
import type { FlatDataInstanceSetImplementation } from '../store/flatData/mapping/FlatDataInstanceSetImplementation';
import type { EmbeddedFlatDataPropertyMapping } from '../store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { RelationalInstanceSetImplementation } from '../store/relational/mapping/RelationalInstanceSetImplementation';
import type { RootRelationalInstanceSetImplementation } from '../store/relational/mapping/RootRelationalInstanceSetImplementation';
import type { InferableMappingElementIdValue } from './InferableMappingElementId';
import type { InferableMappingElementRoot } from './InferableMappingElementRoot';
import type { AggregationAwareSetImplementation } from './aggregationAware/AggregationAwareSetImplementation';
import type { InstanceSetImplementation } from './InstanceSetImplementation';
import type { MergeOperationSetImplementation } from './MergeOperationSetImplementation';
import type { TEMPORARY__UnresolvedSetImplementation } from './TEMPORARY__UnresolvedSetImplementation';
import type { Class } from '../domain/Class';

export interface SetImplementationVisitor<T> {
  visit_SetImplementation(setImplementation: InstanceSetImplementation): T;
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
  visit_TEMPORARY__UnresolvedSetImplementation(
    setImplementation: TEMPORARY__UnresolvedSetImplementation,
  ): T;
}

export abstract class SetImplementation
  implements PropertyOwnerImplementation, Hashable, Stubable
{
  readonly _PARENT: Mapping;
  readonly _isEmbedded: boolean = false;

  id: InferableMappingElementIdValue;
  class: PackageableElementReference<Class>;
  root: InferableMappingElementRoot;

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

  get isStub(): boolean {
    return !this.id.value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SET_IMPLEMENTATION,
      this.id.valueForSerialization ?? '',
      this.class.hashValue,
      this.root.valueForSerialization.toString(),
    ]);
  }

  abstract accept_SetImplementationVisitor<T>(
    visitor: SetImplementationVisitor<T>,
  ): T;
}
