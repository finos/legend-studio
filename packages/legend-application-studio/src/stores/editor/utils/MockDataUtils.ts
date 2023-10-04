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
  isNonNullable,
  filterByType,
} from '@finos/legend-shared';
import type { EditorStore } from '../EditorStore.js';
import {
  PrimitiveType,
  type Enumeration,
  PRIMITIVE_TYPE,
  Class,
  getAllClassProperties,
  DATE_FORMAT,
  DATE_TIME_FORMAT,
  classHasCycle,
  TableAlias,
  Table,
  Column,
  VarChar,
  type RelationalDataType,
  Char,
  VarBinary,
  TinyInt,
  Float,
  Timestamp,
  Binary,
  Bit,
  Other,
  Numeric,
  Decimal,
  Double,
  Integer,
  Real,
  SmallInt,
  Date as ColumnDate,
  SemiStructured,
  Json,
  MILESTONING_VERSION_PROPERTY_SUFFIX,
} from '@finos/legend-graph';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from './ModelClassifierUtils.js';
import type { MappingElementSource } from '../editor-state/element-editor-state/mapping/MappingEditorState.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
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
    ? getAllClassProperties(_class, true)
    : getAllClassProperties(_class, true).filter(
        (p) => p.multiplicity.lowerBound,
      );
  const propertyNames = properties.map((property) => property.name);
  const filteredProperties = properties.filter(
    (prop) =>
      prop.name.endsWith(MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS) ||
      (!propertyNames.includes(
        prop.name + MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS,
      ) &&
        !prop.name.endsWith(
          MILESTONING_VERSION_PROPERTY_SUFFIX.ALL_VERSIONS_IN_RANGE,
        )),
  );
  const mockData: Record<string, object | string | number | boolean> = {};
  filteredProperties.forEach((property) => {
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

export const createMockDataForClass = (
  element: Class,
  maxDepth = 100,
  depthForCycle = 3,
): PlainObject => {
  const depth = classHasCycle(element, {
    traverseNonRequiredProperties: true,
  })
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
  const depth = classHasCycle(element, {
    traverseNonRequiredProperties: true,
  })
    ? Math.max(depthForCycle, 0)
    : Math.max(maxDepth, 0);
  const obj = createMockClassInstance(element, true, depth);
  switch (format) {
    case CLASS_MOCK_DATA_GENERATION_FORMAT.JSON:
      return JSON.stringify(obj, undefined, DEFAULT_TAB_SIZE);
    case CLASS_MOCK_DATA_GENERATION_FORMAT.XML: {
      return new XMLBuilder({
        indentBy: ' '.repeat(DEFAULT_TAB_SIZE),
        format: true,
      }).build(obj);
    }
    case CLASS_MOCK_DATA_GENERATION_FORMAT.YAML:
      return YAML_stringify(obj, { indent: DEFAULT_TAB_SIZE });
    default:
      throw new UnsupportedOperationError(
        `Can't create mock data for class with format '${format}'`,
      );
  }
};

export const getPrimitiveTypeFromRelationalType = (
  type: RelationalDataType,
): PrimitiveType | undefined => {
  if (
    type instanceof VarChar ||
    type instanceof Char ||
    type instanceof VarBinary ||
    type instanceof Binary ||
    type instanceof Bit ||
    type instanceof Other
  ) {
    return PrimitiveType.STRING;
  } else if (type instanceof Numeric) {
    return PrimitiveType.NUMBER;
  } else if (type instanceof Decimal) {
    return PrimitiveType.DECIMAL;
  } else if (
    type instanceof Double ||
    type instanceof Integer ||
    type instanceof Real ||
    type instanceof SmallInt ||
    type instanceof TinyInt
  ) {
    return PrimitiveType.INTEGER;
  } else if (type instanceof Float) {
    return PrimitiveType.FLOAT;
  } else if (type instanceof ColumnDate) {
    return PrimitiveType.DATE;
  } else if (type instanceof Timestamp) {
    return PrimitiveType.DATETIME;
  }
  return undefined;
};
export const createMockDataForColumn = (
  col: Column,
  isPrimaryKey: boolean,
  idx?: number | undefined,
): string | undefined => {
  const type = col.type;

  if (
    (type instanceof Double ||
      type instanceof Integer ||
      type instanceof Real ||
      type instanceof SmallInt ||
      type instanceof TinyInt) &&
    isPrimaryKey &&
    idx
  ) {
    return idx.toString();
  }
  const primitive = getPrimitiveTypeFromRelationalType(type);
  if (primitive) {
    return createMockPrimitiveProperty(primitive, col.name).toString();
  } else if (type instanceof Json || type instanceof SemiStructured) {
    return '{}';
  }
  return undefined;
};

export const createMockDataForTable = (
  table: Table,
  ITERATIONS = 1,
): string => {
  const targetedCols = table.columns.filter(filterByType(Column));
  const colNames = targetedCols.map((e) => e.name).join(',');
  const vals = Array.from(Array(ITERATIONS).keys())
    .map((idx) =>
      targetedCols
        .map((col) =>
          createMockDataForColumn(col, table.primaryKey.includes(col), idx),
        )
        .filter(isNonNullable)
        .join(','),
    )
    .join('\n');
  return `${colNames}\n${vals}`;
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
        DEFAULT_TAB_SIZE,
      );
    } catch (error) {
      assertErrorThrown(error);
      editorStore.applicationStore.notificationService.notifyWarning(
        `Can't generate test data for class '${srcElement}'. Error:\n${error.message}`,
      );
      return '';
    }
  } else if (
    srcElement instanceof TableAlias &&
    srcElement.relation instanceof Table
  ) {
    return createMockDataForTable(srcElement.relation);
  } else if (srcElement instanceof Table) {
    return createMockDataForTable(srcElement);
  }
  editorStore.applicationStore.notificationService.notifyWarning(
    new UnsupportedOperationError(
      `Can't generate test data for mapping source`,
      srcElement,
    ),
  );
  return '';
};
