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
import type { Hashable } from '@finos/legend-studio-shared';
import { hashArray } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../MetaModelConst';
import type { SetImplementationVisitor } from '../../../../../model/packageableElements/mapping/SetImplementation';
import type {
  RelationalMappingSpecification,
  TableAlias,
} from '../../../../../model/packageableElements/store/relational/model/RelationalOperationElement';
import type { ColumnMapping } from '../../../../../model/packageableElements/store/relational/model/ColumnMapping';
import { RelationalInstanceSetImplementation } from '../../../../../model/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import type { GroupByMapping } from '../../../../../model/packageableElements/store/relational/mapping/GroupByMapping';
import type { FilterMapping } from '../../../../../model/packageableElements/store/relational/mapping/FilterMapping';
import type { InferableMappingElementIdValue } from '../../../../../model/packageableElements/mapping/InferableMappingElementId';
import type { Mapping } from '../../../../../model/packageableElements/mapping/Mapping';
import type { PackageableElementReference } from '../../../../../model/packageableElements/PackageableElementReference';
import type { Class } from '../../../../../model/packageableElements/domain/Class';
import type { InferableMappingElementRoot } from '../../../../../model/packageableElements/mapping/InferableMappingElementRoot';
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

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_RootRelationalInstanceSetImplementation(this);
  }

  get hashCode(): string {
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
