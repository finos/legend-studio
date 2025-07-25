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
  guaranteeNonNullable,
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
  type INTERNAL__UnresolvedSetImplementation,
  type Mapping,
  type RelationColumn,
  getAllClassMappings,
  PurePropertyMapping,
  EmbeddedFlatDataPropertyMapping,
  EnumValueMapping,
  PrimitiveType,
  Enumeration,
  Class,
  FlatDataPropertyMapping,
  Measure,
  Unit,
  EnumValueExplicitReference,
  PropertyExplicitReference,
  RelationalPropertyMapping,
  EmbeddedRelationalInstanceSetImplementation,
  getEnumerationMappingsByEnumeration,
  getRootSetImplementation,
  stub_RawLambda,
  stub_RawRelationalOperationElement,
  isStubbed_RawLambda,
  isStubbed_RawRelationalOperationElement,
  isStubbed_EnumValueMapping,
  isStubbed_SetImplementationContainer,
  getLeafSetImplementations,
  getAllClassProperties,
  getRawGenericType,
  EnumerationMappingExplicitReference,
  SetImplementationExplicitReference,
  type INTERNAL__UnknownSetImplementation,
  type RelationFunctionInstanceSetImplementation,
  RelationFunctionPropertyMapping,
  isStubbed_RelationColumn,
} from '@finos/legend-graph';
import type { EditorStore } from '../../../EditorStore.js';
import {
  enumerationMapping_setEnumValueMappings,
  enumValueMapping_addSourceValue,
  enumValueMapping_setSourceValues,
  instanceSetImplementation_setPropertyMappings,
  operationMapping_setParameters,
  pureInstanceSetImpl_setPropertyMappings,
  purePropertyMapping_setTransformer,
} from '../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { rootRelationalSetImp_setPropertyMappings } from '../../../../graph-modifier/STO_Relational_GraphModifierHelper.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';

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
  const propertyMappingIndex = new Map<string, T[]>();
  (setImp.propertyMappings as T[]).forEach((pm) => {
    const propertyMapping = propertyMappingIndex.get(pm.property.value.name);
    if (propertyMapping) {
      propertyMapping.push(pm);
    } else {
      propertyMappingIndex.set(pm.property.value.name, [pm]);
    }
  });
  getAllClassProperties(setImp.class.value).forEach((property) => {
    propertyMappingIndex.set(
      property.name,
      decoratePropertyMapping(
        propertyMappingIndex.get(property.name),
        property,
      ),
    );
  });
  return Array.from(propertyMappingIndex.values()).flat();
};

export const getLeafSetImplementationsForClass = (
  mapping: Mapping,
  _class: Class,
): SetImplementation[] | undefined => {
  const setImp = getRootSetImplementation(mapping, _class);
  if (!setImp) {
    return undefined;
  }
  if (setImp instanceof OperationSetImplementation) {
    return getLeafSetImplementations(setImp);
  }
  return [setImp];
};

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

  visit_INTERNAL__UnknownSetImplementation(
    setImplementation: INTERNAL__UnknownSetImplementation,
  ): void {
    return;
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
        enumValueMapping_addSourceValue(newEnumValueMapping, undefined);
        enumValueMappingsToAdd.push(newEnumValueMapping);
      }
    });
    if (enumValueMappingsToAdd.length) {
      enumerationMapping_setEnumValueMappings(
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
        getAllClassMappings(setImplementation._PARENT).find(
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
        getAllClassMappings(setImplementation._PARENT).find(
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
        (pm) => !isStubbed_RawLambda(pm.transform),
      );
      const propertyType = property.genericType.value.rawType;
      if (
        propertyType instanceof PrimitiveType ||
        propertyType instanceof Unit ||
        propertyType instanceof Measure
      ) {
        return existingPropertyMappings.length
          ? existingPropertyMappings
          : [
              new PurePropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                stub_RawLambda(),
                SetImplementationExplicitReference.create(setImplementation),
                undefined,
              ),
            ];
      } else if (propertyType instanceof Enumeration) {
        const enumerationPropertyMapping = existingPropertyMappings.length
          ? existingPropertyMappings
          : [
              new PurePropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                stub_RawLambda(),
                SetImplementationExplicitReference.create(setImplementation),
                undefined,
              ),
            ];
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings = getEnumerationMappingsByEnumeration(
          setImplementation._PARENT,
          getRawGenericType(
            (enumerationPropertyMapping[0] as PurePropertyMapping).property
              .value.genericType.value,
            Enumeration,
          ),
        );
        enumerationPropertyMapping.forEach((epm) => {
          // If there are no enumeration mappings, delete the transformer of the property mapping
          // If there is only 1 enumeration mapping, make it the transformer of the property mapping
          // Else, delete current transformer if it's not in the list of extisting enumeration mappings
          if (existingEnumerationMappings.length === 1) {
            purePropertyMapping_setTransformer(
              epm,
              EnumerationMappingExplicitReference.create(
                guaranteeNonNullable(existingEnumerationMappings[0]),
              ),
            );
          } else if (
            existingEnumerationMappings.length === 0 ||
            !existingEnumerationMappings.find(
              (eem) => eem === epm.transformer?.value,
            )
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
          getLeafSetImplementationsForClass(
            setImplementation._PARENT,
            getRawGenericType(property.genericType.value, Class),
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
                  (pm) => pm.targetSetImplementation?.value === setImp,
                ) ??
                new PurePropertyMapping(
                  setImplementation,
                  PropertyExplicitReference.create(property),
                  stub_RawLambda(),
                  SetImplementationExplicitReference.create(setImplementation),
                  SetImplementationExplicitReference.create(setImp),
                ),
            )
            // sort these property mappings by id of their set implementations
            .sort((a, b) =>
              (a.targetSetImplementation?.value.id.value ?? '').localeCompare(
                b.targetSetImplementation?.value.id.value ?? '',
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
        // NOTE: here, we remove some low-quality property mappings
        // i.e. stubbed property mappings from before adding new decorated property mappings
        propertyMappingsBeforeDecoration
          .filter(
            (propertyMapping) =>
              !isStubbed_RawLambda(propertyMapping.transform),
          )
          .filter(
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
      const existingPropertyMappings = (propertyMappings ?? []).filter((pm) => {
        if (pm instanceof FlatDataPropertyMapping) {
          return !isStubbed_RawLambda(pm.transform);
        }
        return true;
      });
      const propertyType = property.genericType.value.rawType;
      if (
        propertyType instanceof PrimitiveType ||
        propertyType instanceof Unit ||
        propertyType instanceof Measure
      ) {
        return existingPropertyMappings.length
          ? existingPropertyMappings
          : [
              new FlatDataPropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                stub_RawLambda(),
                SetImplementationExplicitReference.create(setImplementation),
                undefined,
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
                stub_RawLambda(),
                SetImplementationExplicitReference.create(setImplementation),
                undefined,
              ),
            ];
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings = getEnumerationMappingsByEnumeration(
          setImplementation._PARENT,
          getRawGenericType(
            (ePropertyMapping[0] as FlatDataPropertyMapping).property.value
              .genericType.value,
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
            epm.transformer = EnumerationMappingExplicitReference.create(
              guaranteeNonNullable(existingEnumerationMappings[0]),
            );
          } else if (
            existingEnumerationMappings.length === 0 ||
            !existingEnumerationMappings.find(
              (eem) => eem === epm.transformer?.value,
            )
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
    instanceSetImplementation_setPropertyMappings(
      setImplementation,
      decoratedPropertyMappings.concat(
        // NOTE: here, we remove some low-quality property mappings
        // i.e. stubbed property mappings, incompatible property mappings
        // from before adding new decorated property mappings
        propertyMappingsBeforeDecoration
          .filter(
            (propertyMapping) =>
              (propertyMapping instanceof FlatDataPropertyMapping &&
                !isStubbed_RawLambda(propertyMapping.transform)) ||
              propertyMapping instanceof EmbeddedFlatDataPropertyMapping,
          )
          .filter(
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
      const existingPropertyMappings = (propertyMappings ?? []).filter((pm) => {
        if (pm instanceof RelationalPropertyMapping) {
          return !isStubbed_RawRelationalOperationElement(
            pm.relationalOperation,
          );
        }
        return true;
      });
      const propertyType = property.genericType.value.rawType;
      if (
        propertyType instanceof PrimitiveType ||
        propertyType instanceof Unit ||
        propertyType instanceof Measure
      ) {
        if (existingPropertyMappings.length) {
          // TODO?: do we want to check the type of the property mapping here?
          return existingPropertyMappings;
        }
        const newPropertyMapping = new RelationalPropertyMapping(
          setImplementation,
          PropertyExplicitReference.create(property),
          SetImplementationExplicitReference.create(setImplementation),
          undefined,
        );
        newPropertyMapping.relationalOperation =
          stub_RawRelationalOperationElement();
        return [newPropertyMapping];
      } else if (propertyType instanceof Enumeration) {
        let ePropertyMapping: PropertyMapping[] = [];
        if (existingPropertyMappings.length) {
          // TODO?: do we want to check the type of the property mapping here?
          ePropertyMapping = existingPropertyMappings;
        } else {
          const newPropertyMapping = new RelationalPropertyMapping(
            setImplementation,
            PropertyExplicitReference.create(property),
            SetImplementationExplicitReference.create(setImplementation),
            undefined,
          );
          newPropertyMapping.relationalOperation =
            stub_RawRelationalOperationElement();
          ePropertyMapping = [newPropertyMapping];
        }
        // Find existing enumeration mappings for the property enumeration
        const existingEnumerationMappings = getEnumerationMappingsByEnumeration(
          setImplementation._PARENT,
          getRawGenericType(
            (ePropertyMapping[0] as PropertyMapping).property.value.genericType
              .value,
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
            epm.transformer = EnumerationMappingExplicitReference.create(
              guaranteeNonNullable(existingEnumerationMappings[0]),
            );
          } else if (
            existingEnumerationMappings.length === 0 ||
            !existingEnumerationMappings.find(
              (eem) => eem === epm.transformer?.value,
            )
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
        const resolvedLeafSetImps = getLeafSetImplementationsForClass(
          setImplementation._PARENT,
          getRawGenericType(property.genericType.value, Class),
        );
        // if there are no root-resolved set implementations for the class, return empty array
        if (resolvedLeafSetImps) {
          classPropertyMappings = resolvedLeafSetImps
            // from root of the class property, resolve leaf set implementations and add property mappings for them
            // NOTE: here we actually remove existing property mapping if it no longer part of resolved
            // leaf set implementation of the class property
            .map((setImp) => {
              const existingPropertyMapping = existingPropertyMappings.find(
                (pm) => pm.targetSetImplementation?.value === setImp,
              );
              if (existingPropertyMapping) {
                return existingPropertyMapping;
              }
              const newPropertyMapping = new RelationalPropertyMapping(
                setImplementation,
                PropertyExplicitReference.create(property),
                SetImplementationExplicitReference.create(setImplementation),
                SetImplementationExplicitReference.create(setImp),
              );
              newPropertyMapping.relationalOperation =
                stub_RawRelationalOperationElement();
              return newPropertyMapping;
            })
            // sort these property mappings by id of their set implementations
            .sort((a, b) =>
              (a.targetSetImplementation?.value.id.value ?? '').localeCompare(
                b.targetSetImplementation?.value.id.value ?? '',
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
    instanceSetImplementation_setPropertyMappings(
      setImplementation,
      decoratedPropertyMappings.concat(
        // NOTE: here, we remove some low-quality property mappings
        // i.e. stubbed property mappings, incompatible property mappings
        // from before adding new decorated property mappings
        propertyMappingsBeforeDecoration
          .filter(
            (propertyMapping) =>
              (propertyMapping instanceof RelationalPropertyMapping &&
                !isStubbed_RawRelationalOperationElement(
                  propertyMapping.relationalOperation,
                )) ||
              propertyMapping instanceof
                EmbeddedRelationalInstanceSetImplementation,
          )
          .filter(
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
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
          ).getExtraSetImplementationDecorators?.() ?? [],
      );
    for (const decorator of extraSetImplementationDecorators) {
      decorator(setImplementation);
    }
  }

  visit_INTERNAL__UnresolvedSetImplementation(
    setImplementation: INTERNAL__UnresolvedSetImplementation,
  ): void {
    return;
  }

  visit_RelationFunctionInstanceSetImplementation(
    setImplementation: RelationFunctionInstanceSetImplementation,
  ): void {
    const decoratePropertyMapping = (
      propertyMappings: RelationFunctionPropertyMapping[] | undefined,
      property: Property,
    ): RelationFunctionPropertyMapping[] => {
      const existingPropertyMappings = (propertyMappings ?? []).filter((pm) => {
        if (pm instanceof RelationFunctionPropertyMapping) {
          return !isStubbed_RelationColumn(pm.column);
        }
        return false;
      });
      const propertyType = property.genericType.value.rawType;
      if (
        propertyType instanceof PrimitiveType ||
        propertyType instanceof Unit ||
        propertyType instanceof Measure
      ) {
        if (existingPropertyMappings.length) {
          // TODO?: do we want to check the type of the property mapping here?
          return existingPropertyMappings;
        }
        const newPropertyMapping = new RelationFunctionPropertyMapping(
          setImplementation,
          PropertyExplicitReference.create(property),
          SetImplementationExplicitReference.create(setImplementation),
          undefined,
          {} as RelationColumn,
        );
        return [newPropertyMapping];
      } else if (propertyType instanceof Enumeration) {
        // TODO: add changes
      } else if (propertyType instanceof Class) {
        // TODO: add change
      }
      return [];
    };
    const propertyMappingsBeforeDecoration =
      setImplementation.propertyMappings as RelationFunctionPropertyMapping[];
    const decoratedPropertyMappings =
      getDecoratedSetImplementationPropertyMappings<RelationFunctionPropertyMapping>(
        setImplementation,
        decoratePropertyMapping,
      );
    instanceSetImplementation_setPropertyMappings(
      setImplementation,
      decoratedPropertyMappings.concat(
        // NOTE: here, we remove some low-quality property mappings
        // i.e. stubbed property mappings from before adding new decorated property mappings
        propertyMappingsBeforeDecoration
          .filter(
            (propertyMapping) =>
              !isStubbed_RelationColumn(propertyMapping.column),
          )
          .filter(
            (propertyMapping) =>
              !decoratedPropertyMappings.includes(propertyMapping),
          ),
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
  }
}

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

  visit_INTERNAL__UnknownSetImplementation(
    setImplementation: INTERNAL__UnknownSetImplementation,
  ): void {
    return;
  }

  visitEnumerationMapping(enumerationMapping: EnumerationMapping): void {
    // Remove the enum value mapping if all of its source values are empty
    const nonEmptyEnumValueMappings =
      enumerationMapping.enumValueMappings.filter(
        (enumValueMapping) => !isStubbed_EnumValueMapping(enumValueMapping),
      );
    // Prune the empty source values of each enum value mapping
    nonEmptyEnumValueMappings.forEach((enumValueMapping) => {
      enumValueMapping_setSourceValues(
        enumValueMapping,
        enumValueMapping.sourceValues.filter(isNonNullable),
      );
    });
    enumerationMapping_setEnumValueMappings(
      enumerationMapping,
      nonEmptyEnumValueMappings,
    );
  }

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    operationMapping_setParameters(
      setImplementation,
      setImplementation.parameters.filter(
        (param) => !isStubbed_SetImplementationContainer(param),
      ),
    );
  }

  visit_MergeOperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): void {
    operationMapping_setParameters(
      setImplementation,
      setImplementation.parameters.filter(
        (param) => !isStubbed_SetImplementationContainer(param),
      ),
    );
  }

  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): void {
    instanceSetImplementation_setPropertyMappings(
      setImplementation,
      setImplementation.propertyMappings.filter(
        (propertyMapping) => !isStubbed_RawLambda(propertyMapping.transform),
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
  }

  visit_FlatDataInstanceSetImplementation(
    setImplementation:
      | FlatDataInstanceSetImplementation
      | EmbeddedFlatDataPropertyMapping,
  ): void {
    instanceSetImplementation_setPropertyMappings(
      setImplementation,
      setImplementation.propertyMappings.filter(
        (propertyMapping) =>
          (propertyMapping instanceof FlatDataPropertyMapping &&
            !isStubbed_RawLambda(propertyMapping.transform)) ||
          propertyMapping instanceof EmbeddedFlatDataPropertyMapping,
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
            !isStubbed_RawRelationalOperationElement(
              propertyMapping.relationalOperation,
            )) ||
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
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
            ).getExtraSetImplementationDecorationCleaners?.() ?? [],
        );
    for (const decorationCleaner of extraSetImplementationDecorationCleaners) {
      decorationCleaner(setImplementation);
    }
  }

  visit_INTERNAL__UnresolvedSetImplementation(
    setImplementation: INTERNAL__UnresolvedSetImplementation,
  ): void {
    return;
  }

  visit_RelationFunctionInstanceSetImplementation(
    setImplementation: RelationFunctionInstanceSetImplementation,
  ): void {
    instanceSetImplementation_setPropertyMappings(
      setImplementation,
      setImplementation.propertyMappings.filter(
        (propertyMapping) =>
          propertyMapping instanceof RelationFunctionPropertyMapping,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
  }
}
