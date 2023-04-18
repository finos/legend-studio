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

import { guaranteeType } from '@finos/legend-shared';
import type { InstanceSetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import { RootRelationalInstanceSetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import {
  type PackageableElementReference,
  PackageableElementImplicitReference,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { InferableMappingElementIdExplicitValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementId.js';
import type { Property } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Property.js';
import { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import type { PropertyMappingsImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/PropertyMappingsImplementation.js';
import type { SetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_EmbeddedRelationalPropertyMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping.js';
import { V1_getInferredClassMappingId } from '../../../../transformation/pureGraph/to/helpers/V1_MappingBuilderHelper.js';
import { GraphBuilderError } from '../../../../../../../../graph-manager/GraphManagerUtils.js';
import { getClassProperty } from '../../../../../../../../graph/helpers/DomainHelper.js';

export const V1_buildEmbeddedRelationalMappingProperty = (
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
    throw new GraphBuilderError(
      `Can't find property owner class for property '${propertyMapping.property.property}'`,
    );
  }
  const property = getClassProperty(
    propertyOwnerClass,
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
