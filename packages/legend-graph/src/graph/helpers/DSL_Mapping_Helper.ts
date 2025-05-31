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
  assertTrue,
  filterByType,
  findLast,
  generateEnumerableNameFromToken,
  guaranteeNonNullable,
  uniq,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { EnumerationMapping } from '../metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import type { SetImplementation } from '../metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { Class } from '../metamodel/pure/packageableElements/domain/Class.js';
import type { Enumeration } from '../metamodel/pure/packageableElements/domain/Enumeration.js';
import type { Mapping } from '../metamodel/pure/packageableElements/mapping/Mapping.js';
import { AggregationAwareSetImplementation } from '../metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
import { RootRelationalInstanceSetImplementation } from '../metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import type { PropertyMapping } from '../metamodel/pure/packageableElements/mapping/PropertyMapping.js';
import { InstanceSetImplementation } from '../metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import {
  LakehouseRuntime,
  type EngineRuntime,
  type IdentifiedConnection,
} from '../metamodel/pure/packageableElements/runtime/Runtime.js';
import { OperationSetImplementation } from '../metamodel/pure/packageableElements/mapping/OperationSetImplementation.js';
import type { PackageableRuntime } from '../metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import { ObjectInputType } from '../metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import type { AbstractProperty } from '..//metamodel/pure/packageableElements/domain/AbstractProperty.js';

// ----------------------------------------- Mapping -----------------------------------------

/**
 * Get all included mappings, accounted for loop and duplication (which should be caught by compiler)
 */
export const getAllIncludedMappings = (mapping: Mapping): Mapping[] => {
  const visited = new Set<Mapping>();
  visited.add(mapping);
  const resolveIncludes = (_mapping: Mapping): void => {
    _mapping.includes.forEach((incMapping) => {
      if (!visited.has(incMapping.included.value)) {
        visited.add(incMapping.included.value);
        resolveIncludes(incMapping.included.value);
      }
    });
  };
  resolveIncludes(mapping);
  visited.delete(mapping);
  return Array.from(visited);
};

export const getAllClassMappings = (mapping: Mapping): SetImplementation[] =>
  uniq(
    mapping.classMappings.concat(
      getAllIncludedMappings(mapping)
        .map((e) => e.classMappings)
        .flat(),
    ),
  );

export const getAllEnumerationMappings = (
  mapping: Mapping,
): EnumerationMapping[] =>
  uniq(
    mapping.enumerationMappings.concat(
      getAllIncludedMappings(mapping)
        .map((e) => e.enumerationMappings)
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
      ...mapping.classMappings,
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
  mapping.classMappings.filter(
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
      propertyMapping.targetSetImplementation.value.id.value === targetId,
  );
};

/**
 * Get all child set implementation of an operation set implementation (including itself).
 * This takes into account loops and duplication.
 */
export const getAllChildSetImplementations = (
  operationSetImplementation: OperationSetImplementation,
): SetImplementation[] => {
  const visitedOperations = new Set<OperationSetImplementation>();
  visitedOperations.add(operationSetImplementation);
  const _leaves = new Set<SetImplementation>();
  const resolveLeaves = (_opSetImpl: OperationSetImplementation): void => {
    _opSetImpl.parameters.forEach((p) => {
      const setImp = p.setImplementation.value;
      if (
        setImp instanceof OperationSetImplementation &&
        !visitedOperations.has(setImp)
      ) {
        visitedOperations.add(setImp);
        resolveLeaves(setImp);
      } else {
        _leaves.add(setImp);
      }
    });
  };
  resolveLeaves(operationSetImplementation);
  visitedOperations.delete(operationSetImplementation);
  return Array.from(_leaves).concat(Array.from(visitedOperations));
};

/**
 * Get all leaf set implementations (i.e. no operation) of an operation set implementation
 * This takes into account loops and duplication.
 */
export const getLeafSetImplementations = (
  operationSetImplementation: OperationSetImplementation,
): SetImplementation[] =>
  getAllChildSetImplementations(operationSetImplementation).filter(
    (child) => !(child instanceof OperationSetImplementation),
  );

export const getObjectInputType = (type: string): ObjectInputType => {
  switch (type) {
    case ObjectInputType.JSON:
      return ObjectInputType.JSON;
    case ObjectInputType.XML:
      return ObjectInputType.XML;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported object input type '${type}'`,
      );
  }
};

export const getMappingCompatibleClasses = (
  mapping: Mapping,
  classes: Class[],
): Class[] => {
  const mappedClasses = new Set<Class>();
  getAllClassMappings(mapping).forEach((cm) =>
    mappedClasses.add(cm.class.value),
  );
  return classes.filter((c) => mappedClasses.has(c));
};

export const getClassCompatibleMappings = (
  _class: Class,
  mappings: Mapping[],
): Mapping[] => {
  const mappingsWithClassMapped = mappings.filter((mapping) =>
    mapping.classMappings.some((cm) => cm.class.value === _class),
  );
  const resolvedMappingIncludes = mappings.filter((mapping) =>
    getAllIncludedMappings(mapping).some((e) =>
      mappingsWithClassMapped.includes(e),
    ),
  );
  return uniq([...mappingsWithClassMapped, ...resolvedMappingIncludes]);
};

export const findMappingLocalProperty = (
  mappings: Mapping[],
  propertyName: string,
): AbstractProperty | undefined => {
  let newProperty: AbstractProperty | undefined;
  mappings.forEach((mapping) => {
    mapping.classMappings.forEach((setImplementation) => {
      if (setImplementation instanceof InstanceSetImplementation) {
        setImplementation.propertyMappings.forEach((propertyMapping) => {
          if (
            propertyMapping.localMappingProperty &&
            propertyMapping.property.value.name === propertyName
          ) {
            newProperty = propertyMapping.property.value;
          }
        });
      }
    });
  });
  return newProperty;
};

// ----------------------------------------- Runtime -----------------------------------------

export const getAllIdentifiedConnections = (
  runtime: EngineRuntime,
): IdentifiedConnection[] =>
  runtime.connections.flatMap(
    (storeConnections) => storeConnections.storeConnections,
  );

export const generateIdentifiedConnectionId = (
  runtime: EngineRuntime,
): string => {
  const generatedId = generateEnumerableNameFromToken(
    getAllIdentifiedConnections(runtime).map(
      (identifiedConnection) => identifiedConnection.id,
    ),
    'connection',
  );
  assertTrue(
    !getAllIdentifiedConnections(runtime).find(
      (identifiedConnection) => identifiedConnection.id === generatedId,
    ),
    `Can't auto-generate connection ID with value '${generatedId}'`,
  );
  return generatedId;
};

const isLakehouseRuntime = (runtimeValue: EngineRuntime): boolean => {
  return runtimeValue instanceof LakehouseRuntime;
};

export const getMappingCompatibleRuntimes = (
  mapping: Mapping,
  runtimes: PackageableRuntime[],
): PackageableRuntime[] =>
  // If the runtime claims to cover some mappings which include the specified mapping,
  // then we deem the runtime to be compatible with the such mapping
  runtimes.filter(
    (runtime) =>
      runtime.runtimeValue.mappings
        .flatMap((mappingReference) => [
          mappingReference.value,
          ...getAllIncludedMappings(mappingReference.value),
        ])
        .includes(mapping) ||
      // TODO: remove once mappings are added to the protocol
      // include lakehouse runtime as for now they have no reference to mappings within their protocol
      isLakehouseRuntime(runtime.runtimeValue),
  );
