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

import { findLast } from '@finos/legend-studio-shared';
import type { SetImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { OperationSetImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import type { InstanceSetImplementation } from '../models/metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import type { PropertyMapping } from '../models/metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import type { Property } from '../models/metamodels/pure/model/packageableElements/domain/Property';

/**
 * If this is the only mapping element for the target class, automatically mark it as root,
 * otherwise, if there is another set implementation make it non-root,
 * otherwise, leave other set implementation root status as-is
 */
export const updateRootSetImplementationOnCreate = (
  setImp: SetImplementation,
): void => {
  const classMappingsWithSimilarTarget = setImp.parent
    .classMappingsByClass(setImp.class.value)
    .filter((si) => si !== setImp);
  if (classMappingsWithSimilarTarget.length) {
    setImp.setRoot(false);
    if (classMappingsWithSimilarTarget.length === 1) {
      classMappingsWithSimilarTarget[0].setRoot(false);
    }
  } else {
    setImp.setRoot(true);
  }
};

/**
 * If only one set implementation remained, it will be nominated as the new root
 */
export const updateRootSetImplementationOnDelete = (
  setImp: SetImplementation,
): void => {
  const classMappingsWithSimilarTarget = setImp.parent
    .classMappingsByClass(setImp.class.value)
    .filter((si) => si !== setImp);
  if (classMappingsWithSimilarTarget.length === 1) {
    classMappingsWithSimilarTarget[0].setRoot(false);
  }
};

/**
 * Make the nominated set implementation root and flip the root flag of all other
 * set implementations with the same target
 */
export const nominateRootSetImplementation = (
  setImp: SetImplementation,
): void => {
  const classMappingsWithSimilarTarget = setImp.parent.classMappingsByClass(
    setImp.class.value,
  );
  classMappingsWithSimilarTarget.forEach((si) => {
    if (si !== setImp) {
      si.setRoot(false);
    }
  });
  setImp.setRoot(true);
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
    classMappingsWithSimilarTarget[0].root.value === false
  ) {
    classMappingsWithSimilarTarget[0].setRoot(true);
    return classMappingsWithSimilarTarget[0];
  }
  return findLast(
    classMappingsWithSimilarTarget,
    (setImp: SetImplementation) => setImp.root.value,
  );
};

export const getLeafSetImplementations = (
  setImp?: SetImplementation,
): SetImplementation[] | undefined => {
  if (!setImp) {
    return undefined;
  }
  if (setImp instanceof OperationSetImplementation) {
    return setImp.leafSetImplementations;
  }
  return [setImp];
};

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
