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
  addDays,
  assertErrorThrown,
  formatDate,
  Randomizer,
  UnsupportedOperationError,
  type PlainObject,
} from '@finos/legend-shared';
import type { EditorStore } from '../EditorStore.js';
import {
  type PrimitiveType,
  type Enumeration,
  PRIMITIVE_TYPE,
  Class,
  getAllClassProperties,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
} from '@finos/legend-graph';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from './ModelClassifierUtils.js';
import type { MappingElementSource } from '../editor-state/element-editor-state/mapping/MappingEditorState.js';
import { TAB_SIZE } from '@finos/legend-application';
import { XMLBuilder } from 'fast-xml-parser';
import { stringify as YAML_stringify } from 'yaml';

export const createMockPrimitiveProperty = (
  primitiveType: PrimitiveType,
  propertyName: string,
): string | number | boolean => {
  const randomizer = new Randomizer();
  switch (primitiveType.name) {
    case PRIMITIVE_TYPE.BOOLEAN:
      return randomizer.getRandomItemInCollection([true, false]) ?? true;
    case PRIMITIVE_TYPE.FLOAT:
      return randomizer.getRandomFloat();
    case PRIMITIVE_TYPE.DECIMAL:
      return randomizer.getRandomDouble();
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
      return randomizer.getRandomWholeNumber(100);
    // NOTE that `Date` is the umbrella type that comprises `StrictDate` and `DateTime`, but for simplicity, we will generate `Date` as `StrictDate`
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
      return formatDate(
        randomizer.getRandomDate(
          new Date(Date.now()),
          addDays(Date.now(), 100),
        ),
        DATE_FORMAT,
      );
    case PRIMITIVE_TYPE.DATETIME:
      return formatDate(
        randomizer.getRandomDate(
          new Date(Date.now()),
          addDays(Date.now(), 100),
        ),
        DATE_TIME_FORMAT,
      );
    case PRIMITIVE_TYPE.STRING:
    default:
      return `${propertyName} ${randomizer.getRandomWholeNumber(100)}`;
  }
};

export const createMockEnumerationProperty = (
  enumeration: Enumeration,
): string =>
  new Randomizer().getRandomItemInCollection(enumeration.values)?.name ?? '';

export const createMockClassInstance = (
  _class: Class,
  traverseNonRequiredProperties = false,
  depth = 0,
): PlainObject => {
  const properties = traverseNonRequiredProperties
    ? getAllClassProperties(_class)
    : getAllClassProperties(_class).filter((p) => p.multiplicity.lowerBound);
  const mockData: Record<string, object | string | number | boolean> = {};
  properties.forEach((property) => {
    const propertyType = property.genericType.value.rawType;
    let propertyMockData: PlainObject | string | number | boolean | undefined;
    switch (getClassPropertyType(propertyType)) {
      case CLASS_PROPERTY_TYPE.PRIMITIVE:
        propertyMockData = createMockPrimitiveProperty(
          propertyType as PrimitiveType,
          property.name,
        );
        break;
      case CLASS_PROPERTY_TYPE.ENUMERATION:
        propertyMockData = createMockEnumerationProperty(
          propertyType as Enumeration,
        );
        break;
      case CLASS_PROPERTY_TYPE.CLASS:
        if (depth > 0) {
          propertyMockData = createMockClassInstance(
            propertyType as Class,
            traverseNonRequiredProperties,
            depth - 1,
          );
        }
        break;
      default:
        break;
    }
    if (propertyMockData) {
      mockData[property.name] =
        property.multiplicity.upperBound === undefined ||
        property.multiplicity.upperBound >= 2
          ? [propertyMockData]
          : propertyMockData;
    }
  });
  return mockData;
};

export const classHasCycle = (
  _class: Class,
  traverseNonRequiredProperties: boolean,
  classesIndex: Set<string>,
): boolean => {
  if (classesIndex.has(_class.path)) {
    return true;
  }
  const properties = traverseNonRequiredProperties
    ? getAllClassProperties(_class)
    : getAllClassProperties(_class).filter((p) => p.multiplicity.lowerBound);
  const complexProperties = properties
    .map((property) => property.genericType.value.rawType)
    .filter((c) => getClassPropertyType(c) === CLASS_PROPERTY_TYPE.CLASS);
  if (complexProperties.length > 0) {
    // we only count classes with complex properties in the cycle. Example an address class with all primitive should not tigger a class to be cycled
    classesIndex.add(_class.path);
  }
  // we only check unique complex property classes; 2 same property classes on the same level do not count as a cycle
  return Boolean(
    Array.from(new Set(complexProperties)).find((c) =>
      classHasCycle(c as Class, traverseNonRequiredProperties, classesIndex),
    ),
  );
};

export const createMockDataForClass = (
  element: Class,
  maxDepth = 100,
  depthForCycle = 3,
): PlainObject => {
  const depth = classHasCycle(element, true, new Set<string>())
    ? Math.max(depthForCycle, 0)
    : Math.max(maxDepth, 0);
  return createMockClassInstance(element, true, depth);
};

export enum CLASS_MOCK_DATA_GENERATION_FORMAT {
  JSON = 'JSON',
  XML = 'XML',
  YAML = 'YAML',
}

export const createMockDataForClassWithFormat = (
  element: Class,
  format: CLASS_MOCK_DATA_GENERATION_FORMAT,
  maxDepth = 100,
  depthForCycle = 3,
): string => {
  const depth = classHasCycle(element, true, new Set<string>())
    ? Math.max(depthForCycle, 0)
    : Math.max(maxDepth, 0);
  const obj = createMockClassInstance(element, true, depth);
  switch (format) {
    case CLASS_MOCK_DATA_GENERATION_FORMAT.JSON:
      return JSON.stringify(obj, undefined, TAB_SIZE);
    case CLASS_MOCK_DATA_GENERATION_FORMAT.XML: {
      return new XMLBuilder({
        indentBy: ' '.repeat(TAB_SIZE),
        format: true,
      }).build(obj);
    }
    case CLASS_MOCK_DATA_GENERATION_FORMAT.YAML:
      return YAML_stringify(obj, { indent: TAB_SIZE });
    default:
      throw new UnsupportedOperationError(
        `Can't create mock data for class with format '${format}'`,
      );
  }
};

export const createMockDataForMappingElementSource = (
  srcElement: MappingElementSource,
  editorStore: EditorStore,
): string => {
  if (srcElement instanceof Class) {
    try {
      return JSON.stringify(
        createMockDataForClass(srcElement),
        undefined,
        TAB_SIZE,
      );
    } catch (error) {
      assertErrorThrown(error);
      editorStore.applicationStore.notificationService.notifyWarning(
        `Can't generate test data for class '${srcElement}'. Error:\n${error.message}`,
      );
      return '';
    }
  }
  editorStore.applicationStore.notificationService.notifyWarning(
    new UnsupportedOperationError(
      `Can't generate test data for mapping source`,
      srcElement,
    ),
  );
  return '';
};
