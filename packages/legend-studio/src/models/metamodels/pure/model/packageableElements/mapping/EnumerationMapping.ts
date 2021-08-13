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
import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { fromElementPathToMappingElementId } from '../../../../../MetaModelUtils';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type {
  PackageableElementReference,
  OptionalPackageableElementReference,
} from '../../../model/packageableElements/PackageableElementReference';
import {
  PackageableElementExplicitReference,
  OptionalPackageableElementExplicitReference,
} from '../../../model/packageableElements/PackageableElementReference';
import type {
  Mapping,
  MappingElementLabel,
} from '../../../model/packageableElements/mapping/Mapping';
import type { Enumeration } from '../../../model/packageableElements/domain/Enumeration';
import type { EnumValueMapping } from '../../../model/packageableElements/mapping/EnumValueMapping';
import type { Type } from '../../../model/packageableElements/domain/Type';
import type { Stubable } from '../../../model/Stubable';
import { isStubArray } from '../../../model/Stubable';
import type { InferableMappingElementIdValue } from '../../../model/packageableElements/mapping/InferableMappingElementId';
import { InferableMappingElementIdExplicitValue } from '../../../model/packageableElements/mapping/InferableMappingElementId';

export class EnumerationMapping implements Hashable, Stubable {
  parent: Mapping;
  enumeration: PackageableElementReference<Enumeration>;
  id: InferableMappingElementIdValue;
  sourceType: OptionalPackageableElementReference<Type>;
  enumValueMappings: EnumValueMapping[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    enumeration: PackageableElementReference<Enumeration>,
    parent: Mapping,
    sourceType: OptionalPackageableElementReference<Type>,
  ) {
    makeObservable(this, {
      sourceType: observable,
      enumValueMappings: observable,
      setId: action,
      setSourceType: action,
      setEnumValueMappings: action,
      updateSourceType: action,
      label: computed,
      isStub: computed,
      hashCode: computed,
    });

    this.id = id;
    this.enumeration = enumeration;
    this.parent = parent;
    this.sourceType = sourceType;
  }

  setId(value: string): void {
    this.id.setValue(value);
  }
  setSourceType(value: Type | undefined): void {
    this.sourceType.setValue(value);
  }
  setEnumValueMappings(value: EnumValueMapping[]): void {
    this.enumValueMappings = value;
  }

  updateSourceType(type: Type | undefined): void {
    if (this.sourceType.value !== type) {
      this.setSourceType(type);
      this.enumValueMappings = this.enumValueMappings.map(
        (enumValueMapping) => {
          enumValueMapping.sourceValues = [];
          enumValueMapping.addSourceValue();
          return enumValueMapping;
        },
      );
    }
  }

  get label(): MappingElementLabel {
    return {
      value: `${
        fromElementPathToMappingElementId(this.enumeration.value.path) ===
        this.id.value
          ? this.enumeration.value.name
          : `${this.enumeration.value.name} [${this.id.value}]`
      }`,
      root: false,
      tooltip: this.enumeration.value.path,
    };
  }

  static createStub = (
    enumeration: Enumeration,
    mapping: Mapping,
  ): EnumerationMapping =>
    new EnumerationMapping(
      InferableMappingElementIdExplicitValue.create('', enumeration.path),
      PackageableElementExplicitReference.create(enumeration),
      mapping,
      OptionalPackageableElementExplicitReference.create<Type>(undefined),
    );
  get isStub(): boolean {
    return !this.id.value && isStubArray(this.enumValueMappings);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUMERATION_MAPPING,
      this.id.valueForSerialization ?? '',
      this.enumeration.hashValue,
      // If there are no enum value mapping, source type means nothing since it's not in the protocol anyway
      this.enumValueMappings.filter(
        (enumValueMapping) => !enumValueMapping.isStub,
      ).length
        ? this.sourceType.valueForSerialization ?? ''
        : '', // default source value when there is no element
      hashArray(
        this.enumValueMappings.filter(
          (enumValueMapping) => !enumValueMapping.isStub,
        ),
      ),
    ]);
  }
}
