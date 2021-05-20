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
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { fromElementPathToMappingElementId } from '../../../../../MetaModelUtility';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type {
  PackageableElementExplicitReference,
  PackageableElementReference,
} from '../../../model/packageableElements/PackageableElementReference';
import type { PropertyMappingsImplementation } from '../../../model/packageableElements/mapping/PropertyMappingsImplementation';
import type { Association } from '../../../model/packageableElements/domain/Association';
import type {
  Mapping,
  MappingElementLabel,
} from '../../../model/packageableElements/mapping/Mapping';
import type { Store } from '../../../model/packageableElements/store/Store';
import type { PropertyMapping } from '../../../model/packageableElements/mapping/PropertyMapping';
import type { InferableMappingElementIdValue } from '../../../model/packageableElements/mapping/InferableMappingElementId';

export abstract class AssociationImplementation
  implements PropertyMappingsImplementation, Hashable
{
  association: PackageableElementReference<Association>;
  id: InferableMappingElementIdValue;
  parent: Mapping;
  stores: PackageableElementReference<Store>[] = [];
  propertyMappings: PropertyMapping[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    association: PackageableElementExplicitReference<Association>,
  ) {
    makeObservable(this, {
      id: observable,
      parent: observable,
      stores: observable,
      propertyMappings: observable,
      label: computed,
      hashCode: computed,
    });

    this.id = id;
    this.parent = parent;
    this.association = association;
  }

  get label(): MappingElementLabel {
    return {
      value: `${
        fromElementPathToMappingElementId(this.association.value.path) ===
        this.id.value
          ? this.association.value.name
          : `${this.association.value.name} [${this.id.value}]`
      }`,
      root: false,
      tooltip: this.association.value.path,
    };
  }

  get isStub(): boolean {
    return !this.id.value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ASSOCIATION_IMPLEMENTATION,
      this.association.value.path,
      this.id.valueForSerialization ?? '',
      hashArray(this.stores.map((e) => e.valueForSerialization)),
    ]);
  }
}
