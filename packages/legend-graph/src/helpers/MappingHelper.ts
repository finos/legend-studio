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
  filterByType,
  findLast,
  guaranteeNonNullable,
  uniq,
} from '@finos/legend-shared';
import type { EnumerationMapping } from '../models/metamodels/pure/packageableElements/mapping/EnumerationMapping';
import type { SetImplementation } from '../models/metamodels/pure/packageableElements/mapping/SetImplementation';
import type { Class } from '../models/metamodels/pure/packageableElements/domain/Class';
import type { Enumeration } from '../models/metamodels/pure/packageableElements/domain/Enumeration';
import type { Mapping } from '../models/metamodels/pure/packageableElements/mapping/Mapping';
import { AggregationAwareSetImplementation } from '../models/metamodels/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import { RootRelationalInstanceSetImplementation } from '../models/metamodels/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import type { PropertyMapping } from '../models/metamodels/pure/packageableElements/mapping/PropertyMapping';
import type { InstanceSetImplementation } from '../models/metamodels/pure/packageableElements/mapping/InstanceSetImplementation';

export const getAllClassMappings = (mapping: Mapping): SetImplementation[] =>
  uniq(
    mapping.allOwnClassMappings.concat(
      mapping.allIncludedMappings.map((e) => e.allOwnClassMappings).flat(),
    ),
  );

export const getAllEnumerationMappings = (
  mapping: Mapping,
): EnumerationMapping[] =>
  uniq(
    mapping.allOwnEnumerationMappings.concat(
      mapping.allIncludedMappings
        .map((e) => e.allOwnEnumerationMappings)
        .flat(),
    ),
  );

export const extractClassMappingsFromAggregationAwareClassMappings = (
  mapping: Mapping,
): SetImplementation[] => {
  const aggregationAwareClassMappings = mapping.classMappings.filter(
    filterByType(AggregationAwareSetImplementation),
  );
  return [
    ...aggregationAwareClassMappings.map(
      (aggregate) => aggregate.mainSetImplementation,
    ),
    ...aggregationAwareClassMappings
      .map((aggregate) =>
        aggregate.aggregateSetImplementations.map(
          (setImpl) => setImpl.setImplementation,
        ),
      )
      .flat(),
  ];
};

export const getOwnClassMappingById = (
  mapping: Mapping,
  id: string,
): SetImplementation =>
  guaranteeNonNullable(
    [
      ...mapping.allOwnClassMappings,
      ...extractClassMappingsFromAggregationAwareClassMappings(mapping),
    ].find((classMapping) => classMapping.id.value === id),
    `Can't find class mapping with ID '${id}' in mapping '${mapping.path}'`,
  );

export const getClassMappingById = (
  mapping: Mapping,
  id: string,
): SetImplementation =>
  guaranteeNonNullable(
    [
      ...getAllClassMappings(mapping),
      ...extractClassMappingsFromAggregationAwareClassMappings(mapping),
    ].find((classMapping) => classMapping.id.value === id),
    `Can't find class mapping with ID '${id}' in mapping '${mapping.path}'`,
  );

export const getOwnClassMappingsByClass = (
  mapping: Mapping,
  _class: Class,
): SetImplementation[] =>
  // TODO: Add association property Mapping to class mappings, AggregationAwareSetImplementation, mappingClass
  // NOTE: Add in the proper order so find root can resolve properly down the line
  mapping.allOwnClassMappings.filter(
    (classMapping) => classMapping.class.value === _class,
  );

export const getClassMappingsByClass = (
  mapping: Mapping,
  _class: Class,
): SetImplementation[] =>
  // TODO: Add association property Mapping to class mappings, AggregationAwareSetImplementation, mappingClass
  // NOTE: Add in the proper order so find root can resolve properly down the line
  getAllClassMappings(mapping).filter(
    (classMapping) => classMapping.class.value === _class,
  );

export const getEnumerationMappingsByEnumeration = (
  mapping: Mapping,
  enumeration: Enumeration,
): EnumerationMapping[] =>
  getAllEnumerationMappings(mapping).filter(
    (enumerationMapping) =>
      enumerationMapping.enumeration.value === enumeration,
  );

export const getAllSuperSetImplementations = (
  currentSetImpl: SetImplementation,
): SetImplementation[] => {
  if (
    currentSetImpl instanceof RootRelationalInstanceSetImplementation &&
    currentSetImpl.superSetImplementationId
  ) {
    const superSetImpl = [
      getClassMappingById(
        currentSetImpl._PARENT,
        currentSetImpl.superSetImplementationId,
      ),
    ];
    const superSetImplFromParents = superSetImpl
      .map((s) => getAllSuperSetImplementations(s))
      .flat();
    return superSetImpl.concat(superSetImplFromParents);
  } else {
    return [];
  }
};

export const findRootSetImplementation = (
  classMappingsWithSimilarTarget: SetImplementation[],
): SetImplementation | undefined => {
  // NOTE: we use find last so that we can be sure we're picking the root set implementation of the current mapping first,
  // not the root set implementation of one of the included mappings, in case there's no root, we would prefer the root
  // of one of the included mappings (whichever comes later),
  // if there is not root set, and only one set implementation is found, we assume that is the root
  if (
    classMappingsWithSimilarTarget.length === 1 &&
    classMappingsWithSimilarTarget[0]?.root.value === false
  ) {
    return classMappingsWithSimilarTarget[0];
  }
  return findLast(
    classMappingsWithSimilarTarget,
    (setImp: SetImplementation) => setImp.root.value,
  );
};

export const getRootSetImplementation = (
  mapping: Mapping,
  _class: Class,
): SetImplementation | undefined =>
  findRootSetImplementation(getClassMappingsByClass(mapping, _class));

export const findPropertyMapping = (
  instanceSetImplementation: InstanceSetImplementation,
  propertyName: string,
  targetId: string | undefined,
): PropertyMapping | undefined => {
  let properties = undefined;
  properties = instanceSetImplementation.propertyMappings.filter(
    (propertyMapping) => propertyMapping.property.value.name === propertyName,
  );
  if (targetId === undefined || properties.length === 1) {
    return properties[0];
  }
  return properties.find(
    (propertyMapping) =>
      propertyMapping.targetSetImplementation &&
      propertyMapping.targetSetImplementation.id.value === targetId,
  );
};
