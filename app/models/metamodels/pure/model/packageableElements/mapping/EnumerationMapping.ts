/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable, fromElementPathToMappingElementId } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { PackageableElementReference, PackageableElementExplicitReference, OptionalPackageableElementReference, OptionalPackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { Mapping, MappingElementLabel } from 'MM/model/packageableElements/mapping/Mapping';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { EnumValueMapping } from 'MM/model/packageableElements/mapping/EnumValueMapping';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Stubable, isStubArray } from 'MM/Stubable';
import { InferableMappingElementIdValue, InferableMappingElementIdExplicitValue } from 'MM/model/packageableElements/mapping/InferableMappingElementId';

export class EnumerationMapping implements Hashable, Stubable {
  parent: Mapping;
  enumeration: PackageableElementReference<Enumeration>;
  id: InferableMappingElementIdValue;
  @observable sourceType: OptionalPackageableElementReference<Type>
  @observable enumValueMappings: EnumValueMapping[] = [];

  constructor(id: InferableMappingElementIdValue, enumeration: PackageableElementReference<Enumeration>, parent: Mapping, sourceType: OptionalPackageableElementReference<Type>) {
    this.id = id;
    this.enumeration = enumeration;
    this.parent = parent;
    this.sourceType = sourceType;
  }

  @action setId(value: string): void { this.id.setValue(value) }
  @action setSourceType(value: Type | undefined): void { this.sourceType.setValue(value) }
  @action setEnumValueMappings(value: EnumValueMapping[]): void { this.enumValueMappings = value }

  @action updateSourceType(type: Type | undefined): void {
    if (this.sourceType.value !== type) {
      this.setSourceType(type);
      this.enumValueMappings = this.enumValueMappings.map(enumValueMapping => {
        enumValueMapping.sourceValues = [];
        enumValueMapping.addSourceValue();
        return enumValueMapping;
      });
    }
  }

  @computed get label(): MappingElementLabel {
    return {
      value: `${(fromElementPathToMappingElementId(this.enumeration.value.path) === this.id.value)
        ? this.enumeration.value.name
        : `${this.enumeration.value.name} [${this.id.value}]`}`,
      root: false,
      tooltip: this.enumeration.value.path
    };
  }

  static createStub = (enumeration: Enumeration, mapping: Mapping): EnumerationMapping => new EnumerationMapping(InferableMappingElementIdExplicitValue.create('', enumeration.path), PackageableElementExplicitReference.create(enumeration), mapping, OptionalPackageableElementExplicitReference.create<Type>(undefined));
  @computed get isStub(): boolean { return !this.id.value && isStubArray(this.enumValueMappings) }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENUMERATION_MAPPING,
      this.id.valueForSerialization ?? '',
      this.enumeration.valueForSerialization,
      // If there are no enum value mapping, source type means nothing since it's not in the protocol anyway
      this.enumValueMappings.filter(enumValueMapping => !enumValueMapping.isStub).length ? this.sourceType.valueForSerialization ?? '' : '', // default source value when there is no element
      hashArray(this.enumValueMappings.filter(enumValueMapping => !enumValueMapping.isStub))
    ]);
  }
}
