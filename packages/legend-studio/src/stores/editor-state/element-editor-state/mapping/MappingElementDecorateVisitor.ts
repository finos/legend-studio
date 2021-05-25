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

import {
  isNonNullable,
  assertTrue,
  assertType,
} from '@finos/legend-studio-shared';
import { getDecoratedSetImplementationPropertyMappings } from '../../../../utils/MappingResolutionUtil';
import type {
  SetImplementationVisitor,
  SetImplementation,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import type { OperationSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import type { PureInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import type { FlatDataInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import { PurePropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { EmbeddedFlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { EnumerationMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import { EnumValueMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/EnumValueMapping';
import { PrimitiveType } from '../../../../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
import type { Property } from '../../../../models/metamodels/pure/model/packageableElements/domain/Property';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import { Enumeration } from '../../../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import { FlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';
import type { AbstractFlatDataPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/AbstractFlatDataPropertyMapping';
import {
  Measure,
  Unit,
} from '../../../../models/metamodels/pure/model/packageableElements/domain/Measure';
import type { RelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import type { RootRelationalInstanceSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { EnumValueExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/EnumValueReference';
import { PropertyExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/domain/PropertyReference';
import type { AggregationAwareSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import { RelationalPropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import { createStubRelationalOperationElement } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/RawRelationalOperationElement';
import type { PropertyMapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';

/* @MARKER: ACTION ANALYTICS */
/**
 * This logic helps making the mapping editor smart.
 * Its first purpose is to prepoluate empty property mapping so as to allow user
 * jump straight in to edit the property mappings without the need to hit button
 * like `add property mapping`.
 * Its second purpose is to modify the current mapping element in response to
 * changes in the graph.
 */
export class MappingElementDecorateVisitor
  implements SetImplementationVisitor<void>
{
  visitEnumerationMapping(enumerationMapping: EnumerationMapping): void {
    const enumValueMappingsToAdd: EnumValueMapping[] = [];
    enumerationMapping.enumeration.value.values.forEach((enumValue) => {
      const matchingEnumValueMappings =
        enumerationMapping.enumValueMappings.find(
          (evm) => evm.enum.value === enumValue,
        );
      if (!matchingEnumValueMappings) {
        const newEnumValueMapping = new EnumValueMapping(
          EnumValueExplicitReference.create(enumValue),
        );
        newEnumValueMapping.addSourceValue();
        enumValueMappingsToAdd.push(newEnumValueMapping);
      }
    });
    if (enumValueMappingsToAdd.length) {
      enumerationMapping.setEnumValueMappings(
        enumerationMapping.enumValueMappings.concat(enumValueMappingsToAdd),
      );
    }
  }

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    setImplementation.setParameters(
      setImplementation.parameters.filter((param) =>
        setImplementation.parent
          .getClassMappings(true)
          .find((setImp) => setImp === param.setImplementation.value),
      ),
    );
  }

  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): void {
    const decoratePropertyMapping = (
      propertyMappings: PurePropertyMapping[] | undefined,
      property: Property,
    ): PurePropertyMapping[] => {
      // before decoration, make sure to prune stubbed property mappings in case they are nolonger compatible
      // with the set implemenetation (this happens when we switch sources)
      const existingPropertyMappings = (propertyMappings ?? []).filter(
        (pm) => !pm.isStub,
      );
      const propertyType = property.genericType.value.rawType;
      if (
        propertyType instanceof PrimitiveType ||
        propertyType instanceof Unit ||
        propertyType instanceof Measure
      ) {
        // only allow one property mapping per primitive property
        assertTrue(
          !existingPropertyMappings.length ||
            existingPropertyMappings.length === 1,
          'Only one property mapping should exist per simple type (e.g. primitive, measure, unit) property',
        );
        return existingPropertyMappings.length
          ? [existingPropertyMappings[0]]
          : [
              new PurePropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                RawLambda.createStub(),
                setImplementation,
              ),
            ];
      } else if (propertyType instanceof Enumeration) {
        // only allow one property mapping per enumeration property
        assertTrue(
          !existingPropertyMappings.length ||
            existingPropertyMappings.length === 1,
          'Only one property mapping should exist per enumeration type property',
        );
        const enumerationPropertyMapping = existingPropertyMappings.length
          ? [existingPropertyMappings[0]]
          : [
              new PurePropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                RawLambda.createStub(),
                setImplementation,
              ),
            ];
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings =
          setImplementation.parent.enumerationMappingsByEnumeration(
            enumerationPropertyMapping[0].property.value.genericType.value.getRawType(
              Enumeration,
            ),
          );
        enumerationPropertyMapping.forEach((epm) => {
          // If there are no enumeration mappings, delete the transformer of the property mapping
          // If there is only 1 enumeration mapping, make it the transformer of the property mapping
          // Else, delete current transformer if it's not in the list of extisting enumeration mappings
          if (existingEnumerationMappings.length === 1) {
            epm.setTransformer(existingEnumerationMappings[0]);
          } else if (
            existingEnumerationMappings.length === 0 ||
            !existingEnumerationMappings.find((eem) => eem === epm.transformer)
          ) {
            epm.setTransformer(undefined);
          }
        });
        return enumerationPropertyMapping;
      } else if (propertyType instanceof Class) {
        const resolvedLeafSetImps =
          setImplementation.parent.getLeafSetImplementations(
            property.genericType.value.getRawType(Class),
          );
        // if there are no root-resolved set implementations for the class, return empty array
        if (!resolvedLeafSetImps) {
          return [];
        }
        return (
          resolvedLeafSetImps
            // from root of the class property, resolve leaf set implementations and add property mappings for them
            // NOTE: here we actually remove existing property mapping if it no longer part of resolved
            // leaf set implementation of the class property
            .map(
              (setImp) =>
                existingPropertyMappings.find(
                  (pm) => pm.targetSetImplementation === setImp,
                ) ??
                new PurePropertyMapping(
                  setImplementation,
                  PropertyExplicitReference.create(property),
                  RawLambda.createStub(),
                  setImplementation,
                  setImp,
                ),
            )
            // sort these property mappings by id of their set implementations
            .sort((a, b) =>
              (
                a.targetSetImplementation as SetImplementation
              ).id.value.localeCompare(
                (b.targetSetImplementation as SetImplementation).id.value,
              ),
            )
        );
      }
      return [];
    };
    setImplementation.setPropertyMappings(
      getDecoratedSetImplementationPropertyMappings<PurePropertyMapping>(
        setImplementation,
        decoratePropertyMapping,
      ),
    );
  }

  visit_FlatDataInstanceSetImplementation(
    setImplementation:
      | FlatDataInstanceSetImplementation
      | EmbeddedFlatDataPropertyMapping,
  ): void {
    const decoratePropertyMapping = (
      propertyMappings: AbstractFlatDataPropertyMapping[] | undefined,
      property: Property,
    ): AbstractFlatDataPropertyMapping[] => {
      // before decoration, make sure to prune stubbed property mappings in case they are nolonger compatible
      // with the set implemenetation (this happens when we switch sources)
      const existingPropertyMappings = (propertyMappings ?? []).filter(
        (pm) => !pm.isStub,
      );
      const propertyType = property.genericType.value.rawType;
      if (
        propertyType instanceof PrimitiveType ||
        propertyType instanceof Unit ||
        propertyType instanceof Measure
      ) {
        // only allow one property mapping per primitive property
        assertTrue(
          !existingPropertyMappings.length ||
            existingPropertyMappings.length === 1,
          'Only one property mapping should exist per simple type (e.g. primitive, measure, unit) property',
        );
        return existingPropertyMappings.length
          ? [existingPropertyMappings[0]]
          : [
              new FlatDataPropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                RawLambda.createStub(),
                setImplementation,
              ),
            ];
      } else if (propertyType instanceof Enumeration) {
        // only allow one property mapping per enumeration property
        assertTrue(
          !existingPropertyMappings.length ||
            existingPropertyMappings.length === 1,
          'Only one property mapping should exist per enumeration type property',
        );
        const ePropertyMapping = existingPropertyMappings.length
          ? [existingPropertyMappings[0]]
          : [
              new FlatDataPropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                RawLambda.createStub(),
                setImplementation,
              ),
            ];
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings =
          setImplementation.parent.enumerationMappingsByEnumeration(
            ePropertyMapping[0].property.value.genericType.value.getRawType(
              Enumeration,
            ),
          );
        ePropertyMapping.forEach((epm) => {
          assertType(
            epm,
            FlatDataPropertyMapping,
            'Property mapping for enumeration type property must be a simple property mapping',
          );
          // If there are no enumeration mappings, delete the transformer of the property mapping
          // If there is only 1 enumeration mapping, make it the transformer of the property mapping
          // Else, delete current transformer if it's not in the list of extisting enumeration mappings
          if (existingEnumerationMappings.length === 1) {
            epm.transformer = existingEnumerationMappings[0];
          } else if (
            existingEnumerationMappings.length === 0 ||
            !existingEnumerationMappings.find((eem) => eem === epm.transformer)
          ) {
            epm.transformer = undefined;
          }
        });
        return ePropertyMapping;
      } else if (propertyType instanceof Class) {
        // FIXME flat data property mapping for complex property might change to use union.
        // As such, for now we won't support it, and will hide this from the UI for now. Since the exact playout of this is not known
        // we cannot do decoration as well.

        // assertTrue(!existingPropertyMappings.length || existingPropertyMappings.length === 1, 'Only one property mapping should exist per complex class');
        // return existingPropertyMappings.length ? [existingPropertyMappings[0]] : [];
        return existingPropertyMappings;
      }
      return [];
    };
    setImplementation.setPropertyMappings(
      getDecoratedSetImplementationPropertyMappings<AbstractFlatDataPropertyMapping>(
        setImplementation,
        decoratePropertyMapping,
      ),
    );
  }

  visit_EmbeddedFlatDataSetImplementation(
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ): void {
    this.visit_FlatDataInstanceSetImplementation(setImplementation);
  }

  visit_RelationalInstanceSetImplementation(
    setImplementation: RelationalInstanceSetImplementation,
  ): void {
    throw new Error('Method not implemented.');
  }

  visit_RootRelationalInstanceSetImplementation(
    setImplementation: RootRelationalInstanceSetImplementation,
  ): void {
    const decoratePropertyMapping = (
      propertyMappings: PropertyMapping[] | undefined,
      property: Property,
    ): PropertyMapping[] => {
      // before decoration, make sure to prune stubbed property mappings in case they are nolonger compatible
      // with the set implemenetation (this happens when we switch sources)
      const existingPropertyMappings = (propertyMappings ?? []).filter(
        (pm) => !pm.isStub,
      );
      const propertyType = property.genericType.value.rawType;
      if (
        propertyType instanceof PrimitiveType ||
        propertyType instanceof Unit ||
        propertyType instanceof Measure
      ) {
        // only allow one property mapping per primitive property
        assertTrue(
          !existingPropertyMappings.length ||
            existingPropertyMappings.length === 1,
          'Only one property mapping should exist per simple type (e.g. primitive, measure, unit) property',
        );
        if (existingPropertyMappings.length) {
          // TODO?: do we want to check the type of the property mapping here?
          return [existingPropertyMappings[0]];
        }
        const newPropertyMapping = new RelationalPropertyMapping(
          setImplementation,
          PropertyExplicitReference.create(property),
          setImplementation,
        );
        newPropertyMapping.relationalOperation =
          createStubRelationalOperationElement();
        return [newPropertyMapping];
      } else if (propertyType instanceof Enumeration) {
        // only allow one property mapping per enumeration property
        assertTrue(
          !existingPropertyMappings.length ||
            existingPropertyMappings.length === 1,
          'Only one property mapping should exist per enumeration type property',
        );
        let ePropertyMapping: PropertyMapping[] = [];
        if (existingPropertyMappings.length) {
          // TODO?: do we want to check the type of the property mapping here?
          ePropertyMapping = [existingPropertyMappings[0]];
        } else {
          const newPropertyMapping = new RelationalPropertyMapping(
            setImplementation,
            PropertyExplicitReference.create(property),
            setImplementation,
          );
          newPropertyMapping.relationalOperation =
            createStubRelationalOperationElement();
          ePropertyMapping = [newPropertyMapping];
        }
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings =
          setImplementation.parent.enumerationMappingsByEnumeration(
            ePropertyMapping[0].property.value.genericType.value.getRawType(
              Enumeration,
            ),
          );
        ePropertyMapping.forEach((epm) => {
          assertType(
            epm,
            RelationalPropertyMapping,
            'Property mapping for enumeration type property must be a simple property mapping',
          );
          // If there are no enumeration mappings, delete the transformer of the property mapping
          // If there is only 1 enumeration mapping, make it the transformer of the property mapping
          // Else, delete current transformer if it's not in the list of extisting enumeration mappings
          if (existingEnumerationMappings.length === 1) {
            epm.transformer = existingEnumerationMappings[0];
          } else if (
            existingEnumerationMappings.length === 0 ||
            !existingEnumerationMappings.find((eem) => eem === epm.transformer)
          ) {
            epm.transformer = undefined;
          }
        });
        return ePropertyMapping;
      } else if (propertyType instanceof Class) {
        // NOTE: for now for class property, the only form of mapping we support in form mode is a simple property mapping.
        // TODO: we might need to take care of root-resolution logic like in Pure property mapping
        assertTrue(
          !existingPropertyMappings.length ||
            existingPropertyMappings.length === 1,
          'Only one property mapping should exist per class type property. Other modes for relational property mapping are currently not supported',
        );
        if (existingPropertyMappings.length) {
          // TODO?: do we want to check the type of the property mapping here?
          return [existingPropertyMappings[0]];
        }
        const newPropertyMapping = new RelationalPropertyMapping(
          setImplementation,
          PropertyExplicitReference.create(property),
          setImplementation,
        );
        newPropertyMapping.relationalOperation =
          createStubRelationalOperationElement();
        return [newPropertyMapping];
      }
      return [];
    };
    setImplementation.setPropertyMappings(
      getDecoratedSetImplementationPropertyMappings<PropertyMapping>(
        setImplementation,
        decoratePropertyMapping,
      ),
    );
  }

  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): void {
    throw new Error('Method not implemented.');
  }
}

export class MapppingElementDecorationCleanUpVisitor
  implements SetImplementationVisitor<void>
{
  visitEnumerationMapping(enumerationMapping: EnumerationMapping): void {
    // Remove the enum value mapping if all of its source values are empty
    const nonEmptyEnumValueMappings =
      enumerationMapping.enumValueMappings.filter(
        (enumValueMapping) => !enumValueMapping.isStub,
      );
    // Prune the empty source values of each enum value mapping
    nonEmptyEnumValueMappings.forEach((enumValueMapping) => {
      enumValueMapping.setSourceValues(
        enumValueMapping.sourceValues.filter(isNonNullable),
      );
    });
    enumerationMapping.setEnumValueMappings(nonEmptyEnumValueMappings);
  }

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    setImplementation.setParameters(
      setImplementation.parameters.filter((param) => !param.isStub),
    );
  }

  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): void {
    setImplementation.setPropertyMappings(
      setImplementation.propertyMappings.filter(
        (propertyMapping) => !propertyMapping.transform.isStub,
      ),
    );
  }

  visit_FlatDataInstanceSetImplementation(
    setImplementation:
      | FlatDataInstanceSetImplementation
      | EmbeddedFlatDataPropertyMapping,
  ): void {
    setImplementation.setPropertyMappings(
      setImplementation.propertyMappings.filter(
        (propertyMapping) =>
          (propertyMapping instanceof FlatDataPropertyMapping &&
            !propertyMapping.transform.isStub) ||
          (propertyMapping instanceof EmbeddedFlatDataPropertyMapping &&
            propertyMapping.property),
      ),
    );
  }

  visit_EmbeddedFlatDataSetImplementation(
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ): void {
    this.visit_FlatDataInstanceSetImplementation(setImplementation);
  }

  visit_RelationalInstanceSetImplementation(
    setImplementation: RelationalInstanceSetImplementation,
  ): void {
    // TODO: add when relational is supported
  }

  visit_RootRelationalInstanceSetImplementation(
    setImplementation: RootRelationalInstanceSetImplementation,
  ): void {
    // TODO: add when relational is supported
  }

  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): void {
    throw new Error('Method not implemented.');
  }
}
