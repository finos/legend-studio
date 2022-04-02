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

import { observable, computed, makeObservable } from 'mobx';
import { hashArray, type Hashable } from '@finos/legend-shared';
import { fromElementPathToMappingElementId } from '../../../../../MetaModelUtils';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import {
  PackageableElementExplicitReference,
  type PackageableElementReference,
} from '../PackageableElementReference';
import type { PropertyOwnerImplementation } from './PropertyOwnerImplementation';
import { Class } from '../domain/Class';
import type { Mapping, MappingElementLabel } from './Mapping';
import type { Stubable } from '../../../../../helpers/Stubable';
import type { OperationSetImplementation } from './OperationSetImplementation';
import type { PureInstanceSetImplementation } from '../store/modelToModel/mapping/PureInstanceSetImplementation';
import type { FlatDataInstanceSetImplementation } from '../store/flatData/mapping/FlatDataInstanceSetImplementation';
import type { EmbeddedFlatDataPropertyMapping } from '../store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { RelationalInstanceSetImplementation } from '../store/relational/mapping/RelationalInstanceSetImplementation';
import type { RootRelationalInstanceSetImplementation } from '../store/relational/mapping/RootRelationalInstanceSetImplementation';
import {
  InferableMappingElementIdExplicitValue,
  type InferableMappingElementIdValue,
} from './InferableMappingElementId';
import {
  InferableMappingElementRootExplicitValue,
  type InferableMappingElementRoot,
} from './InferableMappingElementRoot';
import type { AggregationAwareSetImplementation } from './aggregationAware/AggregationAwareSetImplementation';
import type { InstanceSetImplementation } from './InstanceSetImplementation';
import type { MergeOperationSetImplementation } from './MergeOperationSetImplementation';

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
  isEmbedded = false;
  id: InferableMappingElementIdValue;
  class: PackageableElementReference<Class>;
  root: InferableMappingElementRoot;
  parent: Mapping;

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
  ) {
    makeObservable(this, {
      root: observable,
      parent: observable,
      label: computed,
    });

    this.id = id;
    this.parent = parent;
    this.class = _class;
    this.root = root;
  }
  get label(): MappingElementLabel {
    return {
      value: `${
        fromElementPathToMappingElementId(this.class.value.path) ===
        this.id.value
          ? this.root.value
            ? this.class.value.name
            : `${this.class.value.name} [default]`
          : `${this.class.value.name} [${this.id.value}]`
      }`,
      root: this.root.value,
      tooltip: this.class.value.path,
    };
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

export enum BASIC_SET_IMPLEMENTATION_TYPE {
  OPERATION = 'operation',
  INSTANCE = 'instance',
}

export enum SET_IMPLEMENTATION_TYPE {
  OPERATION = 'operation',
  MERGE_OPERATION = 'mergeOperation',
  PUREINSTANCE = 'pureInstance',
  FLAT_DATA = 'flatData',
  EMBEDDED_FLAT_DATA = 'embeddedFlatData',
  RELATIONAL = 'relational',
  EMBEDDED_RELATIONAL = 'embeddedRelational',
  AGGREGATION_AWARE = 'aggregationAware',
}

/* @MARKER: RELAXED GRAPH CHECK - See https://github.com/finos/legend-studio/issues/880 */
/**
 * When set implementation cannot be resolved by ID,
 * we try to avoid failing graph building for now
 * instead, we will leave this loose end unresolved.
 *
 * NOTE: this is just a temporary solutions until we make this a hard-fail post migration.
 *
 * See https://github.com/finos/legend-studio/issues/880
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
