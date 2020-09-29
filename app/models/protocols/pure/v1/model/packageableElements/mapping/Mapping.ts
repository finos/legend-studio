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

import { serializable, list, object, custom, SKIP, deserialize, createModelSchema } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { MappingInclude } from 'V1/model/packageableElements/mapping/MappingInclude';
import { ClassMapping, ClassMappingType } from 'V1/model/packageableElements/mapping/ClassMapping';
import { EnumerationMapping } from 'V1/model/packageableElements/mapping/EnumerationMapping';
import { OperationClassMapping } from 'V1/model/packageableElements/mapping/OperationClassMapping';
import { PureInstanceClassMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PureInstanceClassMapping';
import { PackageableElement, PackageableElementVisitor } from 'V1/model/packageableElements/PackageableElement';
import { MappingClass } from './MappingClass';
import { Property } from 'V1/model/packageableElements/domain/Property';
import { Class } from 'V1/model/packageableElements/domain/Class';
import { MappingTest } from 'V1/model/packageableElements/mapping/MappingTest';

/* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
const deserializeClassMapping = (value: ClassMapping): ClassMapping | typeof SKIP => {
  switch (value._type) {
    case ClassMappingType.OPERATION: return deserialize(OperationClassMapping, value);
    case ClassMappingType.PUREINSTANCE: return deserialize(PureInstanceClassMapping, value);
    default: return SKIP;
  }
};

export class Mapping extends PackageableElement implements Hashable {
  @serializable(list(object(MappingInclude))) includedMappings: MappingInclude[] = [];
  @serializable(list(object(EnumerationMapping))) enumerationMappings: EnumerationMapping[] = [];
  @serializable(list(custom(() => SKIP, deserializeClassMapping))) classMappings: ClassMapping[] = [];
  @serializable(list(object(MappingTest))) tests: MappingTest[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.MAPPING,
      super.hashCode,
      hashArray(this.classMappings),
      hashArray(this.enumerationMappings),
      hashArray(this.tests),
      hashArray(this.includedMappings)
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Mapping(this);
  }
}

// NOTE: the deserialization schema of MappingClass is put here to avoid problem with circular dependency
createModelSchema(MappingClass, {
  setImplementation: custom(() => SKIP, deserializeClassMapping),
  rootClass: object(Class),
  localProperties: object(Property)
});
