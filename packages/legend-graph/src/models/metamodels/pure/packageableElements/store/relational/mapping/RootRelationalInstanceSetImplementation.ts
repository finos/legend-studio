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

import { observable, computed, makeObservable, action } from 'mobx';
import type { Hashable } from '@finos/legend-shared';
import { hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation';
import type {
  RelationalMappingSpecification,
  TableAlias,
} from '../model/RelationalOperationElement';
import type { ColumnMapping } from '../model/ColumnMapping';
import { RelationalInstanceSetImplementation } from './RelationalInstanceSetImplementation';
import type { GroupByMapping } from './GroupByMapping';
import type { FilterMapping } from './FilterMapping';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId';
import type { Mapping } from '../../../mapping/Mapping';
import type { PackageableElementReference } from '../../../PackageableElementReference';
import type { Class } from '../../../domain/Class';
import type { InferableMappingElementRoot } from '../../../mapping/InferableMappingElementRoot';
import type { PropertyMapping } from '../../../mapping/PropertyMapping';

export class RootRelationalInstanceSetImplementation
  extends RelationalInstanceSetImplementation
  implements RelationalMappingSpecification, Hashable
{
  columnMappings: ColumnMapping[] = [];
  filter?: FilterMapping;
  distinct?: boolean;
  groupBy?: GroupByMapping;
  mainTableAlias!: TableAlias;

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    _class: PackageableElementReference<Class>,
    root: InferableMappingElementRoot,
  ) {
    super(id, parent, _class, root);

    makeObservable(this, {
      columnMappings: observable,
      filter: observable,
      distinct: observable,
      groupBy: observable,
      mainTableAlias: observable,
      setPropertyMappings: action,
      hashCode: computed,
    });
  }

  setPropertyMappings(value: PropertyMapping[]): void {
    this.propertyMappings = value;
  }

  override accept_SetImplementationVisitor<T>(
    visitor: SetImplementationVisitor<T>,
  ): T {
    return visitor.visit_RootRelationalInstanceSetImplementation(this);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ROOT_RELATIONAL_INSTANCE_SET_IMPLEMENTATION,
      super.hashCode,
      this.mainTableAlias.relation.pointerHashCode,
      this.distinct?.toString() ?? '',
      hashArray(this.groupBy?.columns ?? []),
      this.filter ?? '',
    ]);
  }
}
