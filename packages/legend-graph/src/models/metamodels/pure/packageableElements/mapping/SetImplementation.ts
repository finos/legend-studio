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

import { observable, action, computed, makeObservable } from 'mobx';
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { fromElementPathToMappingElementId } from '../../../../../MetaModelUtils';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementReference } from '../PackageableElementReference';
import type { PropertyOwnerImplementation } from './PropertyOwnerImplementation';
import type { Class } from '../domain/Class';
import type { Mapping, MappingElementLabel } from './Mapping';
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

export interface SetImplementationVisitor<T> {
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
      setId: action,
      setRoot: action,
      label: computed,
    });

    this.id = id;
    this.parent = parent;
    this.class = _class;
    this.root = root;
  }

  setId(value: string): void {
    this.id.setValue(value);
  }
  setRoot(value: boolean): void {
    this.root.setValue(value);
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

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
export enum SET_IMPLEMENTATION_TYPE {
  OPERATION = 'operation',
  PUREINSTANCE = 'pureInstance',
  FLAT_DATA = 'flatData',
  EMBEDDED_FLAT_DATA = 'embeddedFlatData',
  RELATIONAL = 'relational',
  EMBEDDED_RELATIONAL = 'embeddedRelational',
  AGGREGATION_AWARE = 'aggregationAware',
}
