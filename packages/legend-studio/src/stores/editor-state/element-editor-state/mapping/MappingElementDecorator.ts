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
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type SetImplementationVisitor,
  type SetImplementation,
  OperationSetImplementation,
  type PureInstanceSetImplementation,
  type FlatDataInstanceSetImplementation,
  type EnumerationMapping,
  type Property,
  type AbstractFlatDataPropertyMapping,
  type RelationalInstanceSetImplementation,
  type RootRelationalInstanceSetImplementation,
  type AggregationAwareSetImplementation,
  type PropertyMapping,
  type InstanceSetImplementation,
  type TEMPORARY__UnresolvedSetImplementation,
  type Mapping,
  getAllClassMappings,
  PurePropertyMapping,
  EmbeddedFlatDataPropertyMapping,
  EnumValueMapping,
  PrimitiveType,
  RawLambda,
  Enumeration,
  Class,
  FlatDataPropertyMapping,
  Measure,
  Unit,
  EnumValueExplicitReference,
  PropertyExplicitReference,
  RelationalPropertyMapping,
  createStubRelationalOperationElement,
  EmbeddedRelationalInstanceSetImplementation,
  getEnumerationMappingsByEnumeration,
  getRootSetImplementation,
} from '@finos/legend-graph';
import type { DSLMapping_LegendStudioPlugin_Extension } from '../../../DSLMapping_LegendStudioPlugin_Extension';
import type { EditorStore } from '../../../EditorStore';
import {
  enumMapping_setEnumValueMappings,
  enumValueMapping_addSourceValue,
  enumValueMapping_setSourceValues,
  mapping_setPropertyMappings,
  operationMapping_setParameters,
  pureInstanceSetImpl_setPropertyMappings,
  purePropertyMapping_setTransformer,
} from '../../../graphModifier/DSLMapping_GraphModifierHelper';
import { rootRelationalSetImp_setPropertyMappings } from '../../../graphModifier/StoreRelational_GraphModifierHelper';

/**
 * Iterate through all properties (including supertypes' properties) of the set implementation
 * and add property mappings for each
 */
export const getDecoratedSetImplementationPropertyMappings = <
  T extends PropertyMapping,
>(
  setImp: InstanceSetImplementation,
  decoratePropertyMapping: (
    existingPropertyMappings: T[] | undefined,
    property: Property,
  ) => T[],
): T[] => {
  const propertyMappingMap = new Map<string, T[]>();
  (setImp.propertyMappings as T[]).forEach((pm) => {
    const propertyMapping = propertyMappingMap.get(pm.property.value.name);
    if (propertyMapping) {
      propertyMapping.push(pm);
    } else {
      propertyMappingMap.set(pm.property.value.name, [pm]);
    }
  });
  setImp.class.value.getAllProperties().forEach((property) => {
    propertyMappingMap.set(
      property.name,
      decoratePropertyMapping(propertyMappingMap.get(property.name), property),
    );
  });
  return Array.from(propertyMappingMap.values()).flat();
};

export const getLeafSetImplementations = (
  mapping: Mapping,
  _class: Class,
): SetImplementation[] | undefined => {
  const setImp = getRootSetImplementation(mapping, _class);
  if (!setImp) {
    return undefined;
  }
  if (setImp instanceof OperationSetImplementation) {
    return setImp.leafSetImplementations;
  }
  return [setImp];
};

/* @MARKER: ACTION ANALYTICS */
/**
 * This logic helps making the mapping editor smart.
 * Its first purpose is to prepoluate empty property mapping so as to allow user
 * jump straight in to edit the property mappings without the need to hit button
 * like `add property mapping`.
 * Its second purpose is to modify the current mapping element in response to
 * changes in the graph.
 */
export class MappingElementDecorator implements SetImplementationVisitor<void> {
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
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
        enumValueMapping_addSourceValue(newEnumValueMapping);
        enumValueMappingsToAdd.push(newEnumValueMapping);
      }
    });
    if (enumValueMappingsToAdd.length) {
      enumMapping_setEnumValueMappings(
        enumerationMapping,
        enumerationMapping.enumValueMappings.concat(enumValueMappingsToAdd),
      );
    }
  }

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    operationMapping_setParameters(
      setImplementation,
      setImplementation.parameters.filter((param) =>
        getAllClassMappings(setImplementation.parent).find(
          (setImp) => setImp === param.setImplementation.value,
        ),
      ),
    );
  }

  visit_MergeOperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    operationMapping_setParameters(
      setImplementation,
      setImplementation.parameters.filter((param) =>
        getAllClassMappings(setImplementation.parent).find(
          (setImp) => setImp === param.setImplementation.value,
        ),
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
          ? [existingPropertyMappings[0] as PurePropertyMapping]
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
          ? [existingPropertyMappings[0] as PurePropertyMapping]
          : [
              new PurePropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                RawLambda.createStub(),
                setImplementation,
              ),
            ];
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings = getEnumerationMappingsByEnumeration(
          setImplementation.parent,
          (
            enumerationPropertyMapping[0] as PurePropertyMapping
          ).property.value.genericType.value.getRawType(Enumeration),
        );
        enumerationPropertyMapping.forEach((epm) => {
          // If there are no enumeration mappings, delete the transformer of the property mapping
          // If there is only 1 enumeration mapping, make it the transformer of the property mapping
          // Else, delete current transformer if it's not in the list of extisting enumeration mappings
          if (existingEnumerationMappings.length === 1) {
            purePropertyMapping_setTransformer(
              epm,
              existingEnumerationMappings[0],
            );
          } else if (
            existingEnumerationMappings.length === 0 ||
            !existingEnumerationMappings.find((eem) => eem === epm.transformer)
          ) {
            purePropertyMapping_setTransformer(epm, undefined);
          }
        });
        return enumerationPropertyMapping;
      } else if (propertyType instanceof Class) {
        const resolvedLeafSetImps =
          // TODO: should we try to get leaf implementation here from the root
          // or should we just simply find all class mappings for the target class
          // as we should not try to `understand` operation class mapping union?
          getLeafSetImplementations(
            setImplementation.parent,
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
    const propertyMappingsBeforeDecoration = setImplementation.propertyMappings;
    const decoratedPropertyMappings =
      getDecoratedSetImplementationPropertyMappings<PurePropertyMapping>(
        setImplementation,
        decoratePropertyMapping,
      );
    pureInstanceSetImpl_setPropertyMappings(
      setImplementation,
      decoratedPropertyMappings.concat(
        propertyMappingsBeforeDecoration.filter(
          (propertyMapping) =>
            !decoratedPropertyMappings.includes(propertyMapping),
        ),
      ),
      this.editorStore.changeDetectionState.observerContext,
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
          ? [existingPropertyMappings[0] as FlatDataPropertyMapping]
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
          ? [existingPropertyMappings[0] as FlatDataPropertyMapping]
          : [
              new FlatDataPropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                RawLambda.createStub(),
                setImplementation,
              ),
            ];
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings = getEnumerationMappingsByEnumeration(
          setImplementation.parent,
          (
            ePropertyMapping[0] as FlatDataPropertyMapping
          ).property.value.genericType.value.getRawType(Enumeration),
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
        // NOTE: flat data property mapping for complex property might change to use union.
        // As such, for now we won't support it, and will hide this from the UI for now. Since the exact playout of this is not known
        // we cannot do decoration as well.

        // assertTrue(!existingPropertyMappings.length || existingPropertyMappings.length === 1, 'Only one property mapping should exist per complex class');
        // return existingPropertyMappings.length ? [existingPropertyMappings[0]] : [];
        return existingPropertyMappings;
      }
      return [];
    };
    const propertyMappingsBeforeDecoration = setImplementation.propertyMappings;
    const decoratedPropertyMappings =
      getDecoratedSetImplementationPropertyMappings<AbstractFlatDataPropertyMapping>(
        setImplementation,
        decoratePropertyMapping,
      );
    mapping_setPropertyMappings(
      setImplementation,
      decoratedPropertyMappings.concat(
        propertyMappingsBeforeDecoration.filter(
          (propertyMapping) =>
            !decoratedPropertyMappings.includes(propertyMapping),
        ),
      ),
      this.editorStore.changeDetectionState.observerContext,
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
    throw new UnsupportedOperationError();
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
          return [existingPropertyMappings[0] as PropertyMapping];
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
          ePropertyMapping = [existingPropertyMappings[0] as PropertyMapping];
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
        const existingEnumerationMappings = getEnumerationMappingsByEnumeration(
          setImplementation.parent,
          (
            ePropertyMapping[0] as PropertyMapping
          ).property.value.genericType.value.getRawType(Enumeration),
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
        let classPropertyMappings: PropertyMapping[] = [];
        // TODO: should we try to get leaf implementation here from the root
        // or should we just simply find all class mappings for the target class
        // as we should not try to `understand` operation class mapping union?
        const resolvedLeafSetImps = getLeafSetImplementations(
          setImplementation.parent,
          property.genericType.value.getRawType(Class),
        );
        // if there are no root-resolved set implementations for the class, return empty array
        if (resolvedLeafSetImps) {
          classPropertyMappings = resolvedLeafSetImps
            // from root of the class property, resolve leaf set implementations and add property mappings for them
            // NOTE: here we actually remove existing property mapping if it no longer part of resolved
            // leaf set implementation of the class property
            .map((setImp) => {
              const existingPropertyMapping = existingPropertyMappings.find(
                (pm) => pm.targetSetImplementation === setImp,
              );
              if (existingPropertyMapping) {
                return existingPropertyMapping;
              }
              const newPropertyMapping = new RelationalPropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                setImplementation,
                setImp,
              );
              newPropertyMapping.relationalOperation =
                createStubRelationalOperationElement();
              return newPropertyMapping;
            })
            // sort these property mappings by id of their set implementations
            .sort((a, b) =>
              (
                a.targetSetImplementation as SetImplementation
              ).id.value.localeCompare(
                (b.targetSetImplementation as SetImplementation).id.value,
              ),
            );
        }
        // add the embedded property mapping to the end of the list
        return classPropertyMappings.concat(
          existingPropertyMappings.filter(
            (pm) => pm instanceof EmbeddedRelationalInstanceSetImplementation,
          ),
        );
      }
      return [];
    };
    const propertyMappingsBeforeDecoration = setImplementation.propertyMappings;
    const decoratedPropertyMappings =
      getDecoratedSetImplementationPropertyMappings<PropertyMapping>(
        setImplementation,
        decoratePropertyMapping,
      );
    mapping_setPropertyMappings(
      setImplementation,
      decoratedPropertyMappings.concat(
        propertyMappingsBeforeDecoration.filter(
          (propertyMapping) =>
            !decoratedPropertyMappings.includes(propertyMapping),
        ),
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
  }

  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): void {
    return;
  }

  visit_SetImplementation(setImplementation: SetImplementation): void {
    const extraSetImplementationDecorators = this.editorStore.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLMapping_LegendStudioPlugin_Extension
          ).getExtraSetImplementationDecorators?.() ?? [],
      );
    for (const decorator of extraSetImplementationDecorators) {
      decorator(setImplementation);
    }
  }

  visit_TEMPORARY__UnresolvedSetImplementation(
    setImplementation: TEMPORARY__UnresolvedSetImplementation,
  ): void {
    return;
  }
}

/* @MARKER: ACTION ANALYTICS */
/**
 * This is the cleanup for mapping elements decorated by {@link MappingElementDecorator}.
 */
export class MappingElementDecorationCleaner
  implements SetImplementationVisitor<void>
{
  editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
  visitEnumerationMapping(enumerationMapping: EnumerationMapping): void {
    // Remove the enum value mapping if all of its source values are empty
    const nonEmptyEnumValueMappings =
      enumerationMapping.enumValueMappings.filter(
        (enumValueMapping) => !enumValueMapping.isStub,
      );
    // Prune the empty source values of each enum value mapping
    nonEmptyEnumValueMappings.forEach((enumValueMapping) => {
      enumValueMapping_setSourceValues(
        enumValueMapping,
        enumValueMapping.sourceValues.filter(isNonNullable),
      );
    });
    enumMapping_setEnumValueMappings(
      enumerationMapping,
      nonEmptyEnumValueMappings,
    );
  }

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    operationMapping_setParameters(
      setImplementation,
      setImplementation.parameters.filter((param) => !param.isStub),
    );
  }

  visit_MergeOperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    operationMapping_setParameters(
      setImplementation,
      setImplementation.parameters.filter((param) => !param.isStub),
    );
  }

  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): void {
    mapping_setPropertyMappings(
      setImplementation,
      setImplementation.propertyMappings.filter(
        (propertyMapping) => !propertyMapping.transform.isStub,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
  }

  visit_FlatDataInstanceSetImplementation(
    setImplementation:
      | FlatDataInstanceSetImplementation
      | EmbeddedFlatDataPropertyMapping,
  ): void {
    mapping_setPropertyMappings(
      setImplementation,
      setImplementation.propertyMappings.filter(
        (propertyMapping) =>
          (propertyMapping instanceof FlatDataPropertyMapping &&
            !propertyMapping.transform.isStub) ||
          (propertyMapping instanceof EmbeddedFlatDataPropertyMapping &&
            propertyMapping.property),
      ),
      this.editorStore.changeDetectionState.observerContext,
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
    rootRelationalSetImp_setPropertyMappings(
      setImplementation,
      setImplementation.propertyMappings.filter(
        (propertyMapping) =>
          (propertyMapping instanceof RelationalPropertyMapping &&
            !propertyMapping.isStub) ||
          propertyMapping instanceof
            EmbeddedRelationalInstanceSetImplementation,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
  }

  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): void {
    return;
  }

  visit_SetImplementation(setImplementation: SetImplementation): void {
    const extraSetImplementationDecorationCleaners =
      this.editorStore.pluginManager
        .getStudioPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSLMapping_LegendStudioPlugin_Extension
            ).getExtraSetImplementationDecorationCleaners?.() ?? [],
        );
    for (const decorationCleaner of extraSetImplementationDecorationCleaners) {
      decorationCleaner(setImplementation);
    }
  }

  visit_TEMPORARY__UnresolvedSetImplementation(
    setImplementation: TEMPORARY__UnresolvedSetImplementation,
  ): void {
    return;
  }
}
