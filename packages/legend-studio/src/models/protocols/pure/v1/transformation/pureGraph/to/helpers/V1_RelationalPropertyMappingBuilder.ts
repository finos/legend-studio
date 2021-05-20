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

import { GraphError } from '../../../../../../../MetaModelUtility';
import { guaranteeType } from '@finos/legend-studio-shared';
import type { InstanceSetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import { RootRelationalInstanceSetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { PackageableElementReference } from '../../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { PackageableElementImplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { InferableMappingElementIdExplicitValue } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/InferableMappingElementId';
import type { Property } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Property';
import { Class } from '../../../../../../../metamodels/pure/model/packageableElements/domain/Class';
import type { PropertyMappingsImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/PropertyMappingsImplementation';
import type { SetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementation';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_EmbeddedRelationalPropertyMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping';
import { V1_getInferredClassMappingId } from '../../../../transformation/pureGraph/to/helpers/V1_MappingBuilderHelper';

export const V1_processEmbeddedRelationalMappingProperty = (
  propertyMapping: V1_EmbeddedRelationalPropertyMapping,
  immediateParent: PropertyMappingsImplementation,
  topParent: InstanceSetImplementation,
  context: V1_GraphBuilderContext,
): {
  propertyOwnerClass: Class;
  property: Property;
  _class: PackageableElementReference<Class>;
  id: InferableMappingElementIdExplicitValue;
  sourceSetImplementation: SetImplementation;
} => {
  let propertyOwnerClass: Class;
  if (propertyMapping.property.class) {
    propertyOwnerClass = context.resolveClass(
      propertyMapping.property.class,
    ).value;
  } else if (
    immediateParent instanceof RootRelationalInstanceSetImplementation ||
    immediateParent instanceof EmbeddedRelationalInstanceSetImplementation
  ) {
    propertyOwnerClass = immediateParent.class.value;
  } else {
    throw new GraphError(
      `Can't find property owner class for property '${propertyMapping.property.property}'`,
    );
  }
  const property = propertyOwnerClass.getProperty(
    propertyMapping.property.property,
  );
  let _class: PackageableElementReference<Class>;
  if (propertyMapping.classMapping.class) {
    _class = context.resolveClass(propertyMapping.classMapping.class);
  } else {
    const propertyType = property.genericType.value.rawType;
    const complexClass = guaranteeType(
      propertyType,
      Class,
      'Only complex classes can be the target of an embedded property mapping',
    );
    _class = PackageableElementImplicitReference.create(
      complexClass,
      propertyMapping.classMapping.class ?? '',
      context.section,
      true,
    );
  }
  const id =
    propertyMapping.classMapping.id || propertyMapping.classMapping.class
      ? V1_getInferredClassMappingId(_class.value, propertyMapping.classMapping)
      : InferableMappingElementIdExplicitValue.create(
          `${immediateParent.id.value}_${propertyMapping.property.property}`,
          _class.value.path,
        );
  const sourceSetImplementation =
    immediateParent instanceof RootRelationalInstanceSetImplementation
      ? immediateParent
      : topParent;
  return { propertyOwnerClass, property, _class, id, sourceSetImplementation };
};
