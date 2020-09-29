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

import { isNonNullable, assertTrue } from 'Utilities/GeneralUtil';
import { getDecoratedSetImplementationPropertyMappings } from 'Utilities/MappingResolutionUtil';
import { SetImplementationVisitor, SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { OperationSetImplementation } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { EnumValueMapping } from 'MM/model/packageableElements/mapping/EnumValueMapping';
import { PrimitiveType } from 'MM/model/packageableElements/domain/PrimitiveType';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Measure, Unit } from 'MM/model/packageableElements/domain/Measure';
import { EnumValueExplicitReference } from 'MM/model/packageableElements/domain/EnumValueReference';
import { PropertyExplicitReference } from 'MM/model/packageableElements/domain/PropertyReference';

/* @MARKER: ACTION ANALYTICS */
/**
 * This logic plays a vital role in how `smart` our editor is.
 * Its first purpose is to prepoluate empty property mapping so as to allow user
 * jump straight in to edit the property mappings without the need to hit button
 * like `add property mapping`.
 * Its second purpose is to modify the current mapping element in response to
 * changes in the graph.
 */
export class MappingElementDecorateVisitor implements SetImplementationVisitor<void> {

  visitEnumerationMapping(enumerationMapping: EnumerationMapping): void {
    const enumValueMappingsToAdd: EnumValueMapping[] = [];
    enumerationMapping.enumeration.value.values.forEach(enumValue => {
      const matchingEnumValueMappings = enumerationMapping.enumValueMappings.find(evm => evm.enum.value === enumValue);
      if (!matchingEnumValueMappings) {
        const newEnumValueMapping = new EnumValueMapping(EnumValueExplicitReference.create(enumValue));
        newEnumValueMapping.addSourceValue();
        enumValueMappingsToAdd.push(newEnumValueMapping);
      }
    });
    if (enumValueMappingsToAdd.length) {
      enumerationMapping.setEnumValueMappings(enumerationMapping.enumValueMappings.concat(enumValueMappingsToAdd));
    }
  }

  visit_OperationSetImplementation(setImplementation: OperationSetImplementation): void {
    setImplementation.setParameters(setImplementation.parameters.filter(param => setImplementation.parent.getClassMappings(true).find(setImp => setImp === param.setImplementation.value)));
  }

  visit_PureInstanceSetImplementation(setImplementation: PureInstanceSetImplementation): void {
    const decoratePropertyMapping = (propertyMappings: PurePropertyMapping[] | undefined, property: Property): PurePropertyMapping[] => {
      const existingPropertyMappings = propertyMappings ?? [];
      const propertyType = property.genericType.value.rawType;
      if (propertyType instanceof PrimitiveType || propertyType instanceof Unit || propertyType instanceof Measure) {
        // only allow one property mapping per primitive property
        assertTrue(!existingPropertyMappings.length || existingPropertyMappings.length === 1, 'Only one property mapping should exist per simple type (e.g. primitive, measure, unit) property');
        return existingPropertyMappings.length ? [existingPropertyMappings[0]] : [new PurePropertyMapping(setImplementation, PropertyExplicitReference.create(property), Lambda.createStub(), setImplementation)];
      } else if (propertyType instanceof Enumeration) {
        // only allow one property mapping per enumeration property
        assertTrue(!existingPropertyMappings.length || existingPropertyMappings.length === 1, 'Only one property mapping should exist per enumeration type property');
        const enumerationPropertyMapping = existingPropertyMappings.length ? [existingPropertyMappings[0]] : [new PurePropertyMapping(setImplementation, PropertyExplicitReference.create(property), Lambda.createStub(), setImplementation)];
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings = setImplementation.parent.enumerationMappingsByEnumeration(enumerationPropertyMapping[0].property.value.genericType.value.getRawType(Enumeration));
        enumerationPropertyMapping.forEach(epm => {
          // If there are no enumeration mappings, delete the transformer of the property mapping
          // If there is only 1 enumeration mapping, make it the transformer of the property mapping
          // Else, delete current transformer if it's not in the list of extisting enumeration mappings
          if (existingEnumerationMappings.length === 1) {
            epm.setTransformer(existingEnumerationMappings[0]);
          } else if (existingEnumerationMappings.length === 0 || !existingEnumerationMappings.find(eem => eem === epm.transformer)) {
            epm.setTransformer(undefined);
          }
        });
        return enumerationPropertyMapping;
      } else if (propertyType instanceof Class) {
        const resolvedLeafSetImps = setImplementation.parent.getLeafSetImplementations(property.genericType.value.getRawType(Class));
        // if there are no root-resolved set implementations for the class, return empty array
        if (!resolvedLeafSetImps) {
          return [];
        }
        return resolvedLeafSetImps
          // from root of the class property, resolve leaf set implementations and add property mappings for them
          // NOTE: here we actually remove existing property mapping if it no longer part of resolved
          // leaf set implementation of the class property
          .map(setImp => existingPropertyMappings.find(pm => pm.targetSetImplementation === setImp) ?? new PurePropertyMapping(setImplementation, PropertyExplicitReference.create(property), Lambda.createStub(), setImplementation, setImp))
          // sort these property mappings by id of their set implementations
          .sort((a, b) => (a.targetSetImplementation as SetImplementation).id.value.localeCompare((b.targetSetImplementation as SetImplementation).id.value));
      }
      return [];
    };
    setImplementation.setPropertyMappings(getDecoratedSetImplementationPropertyMappings<PurePropertyMapping>(setImplementation, decoratePropertyMapping));
  }
}

export class MapppingElementDecorationCleanUpVisitor implements SetImplementationVisitor<void> {

  visitEnumerationMapping(enumerationMapping: EnumerationMapping): void {
    // Remove the enum value mapping if all of its source values are empty
    const nonEmptyEnumValueMappings = enumerationMapping.enumValueMappings.filter(enumValueMapping => !enumValueMapping.isStub);
    // Prune the empty source values of each enum value mapping
    nonEmptyEnumValueMappings.forEach(enumValueMapping => { enumValueMapping.setSourceValues(enumValueMapping.sourceValues.filter(isNonNullable)) });
    enumerationMapping.setEnumValueMappings(nonEmptyEnumValueMappings);
  }

  visit_OperationSetImplementation(setImplementation: OperationSetImplementation): void {
    setImplementation.setParameters(setImplementation.parameters.filter(param => !param.isStub));
  }

  visit_PureInstanceSetImplementation(setImplementation: PureInstanceSetImplementation): void {
    setImplementation.setPropertyMappings(setImplementation.propertyMappings.filter(propertyMapping => !propertyMapping.transform.isStub));
  }
}
