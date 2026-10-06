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

import { test, expect, beforeAll } from '@jest/globals';
import TEST_DATA__completeGraphEntities from './TEST_DATA__MockDataGeneration.json' with { type: 'json' };
import {
  createMockClassInstance,
  createMockDataForColumn,
  createMockDataForTable,
  getPrimitiveTypeFromRelationalType,
} from '../MockDataUtils.js';
import { createMockPrimitiveValueSpecificationFromRelationalDataType } from '../../editor-state/element-editor-state/service/testable/ServiceTestDataState.js';
import {
  filterByType,
  guaranteeType,
  type PlainObject,
} from '@finos/legend-shared';
import {
  type TEMPORARY__JestMatcher,
  unitTest,
} from '@finos/legend-shared/test';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';
import type { Entity } from '@finos/legend-storage';
import { TEST__buildGraphWithEntities } from '@finos/legend-graph/test';
import {
  BigInt,
  Binary,
  Bit,
  Char,
  classHasCycle,
  Column,
  Database,
  Date as ColumnDate,
  Decimal,
  Double,
  Float,
  Integer,
  Json,
  Numeric,
  Other,
  PRIMITIVE_TYPE,
  PrimitiveInstanceValue,
  Real,
  type RelationalDataType,
  Schema,
  SemiStructured,
  SmallInt,
  Table,
  Timestamp,
  TinyInt,
  VarBinary,
  VarChar,
} from '@finos/legend-graph';

const editorStore = TEST__getTestEditorStore();
beforeAll(async () => {
  await TEST__buildGraphWithEntities(
    editorStore.graphManagerState,
    TEST_DATA__completeGraphEntities as Entity[],
  );
});

test(unitTest('Class with hierarchy cycle is detected'), () => {
  const _class = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::Misc',
  );
  (
    expect(createMockClassInstance(_class)) as TEMPORARY__JestMatcher
  ).toContainAllKeys([
    'string',
    'boolean',
    'float',
    'decimal',
    'number',
    'integer',
    'date',
    'dateTime',
    'strictDate',
  ]);
});

test(unitTest('Class with hierarchy cycle is detected'), () => {
  const cycledComplexClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Application',
  );
  const nonComplexStyleClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Membership',
  );
  const simpleClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Address',
  );
  expect(
    classHasCycle(cycledComplexClass, {
      traverseNonRequiredProperties: true,
    }),
  ).toBe(true);
  expect(
    classHasCycle(nonComplexStyleClass, {
      traverseNonRequiredProperties: true,
    }),
  ).toBe(false);
  expect(
    classHasCycle(simpleClass, {
      traverseNonRequiredProperties: true,
    }),
  ).toBe(false);
});

// TODO: maybe we should isolate this to another test for mock data util
test(unitTest('Test mock data with classes cycle'), () => {
  const applicationClass = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::src::Application',
  );
  const applicationInstance = createMockClassInstance(
    applicationClass,
    true,
    3,
  );
  // 1st level
  const applicationKeys = ['applicant', 'employee', 'previousEmployeer'];
  (expect(applicationInstance) as TEMPORARY__JestMatcher).toContainAllKeys(
    applicationKeys,
  );
  const applicantInstance = (
    applicationInstance as {
      applicant: PlainObject;
    }
  ).applicant;
  // 2nd level
  (expect(applicantInstance) as TEMPORARY__JestMatcher).toContainKeys([
    'userName',
    'previousApplication',
    'password',
    'firstName',
    'dateOfBirth',
  ]);
  const secondApplicationInstance = (
    applicantInstance as {
      previousApplication: PlainObject;
    }
  ).previousApplication;
  (
    expect(secondApplicationInstance) as TEMPORARY__JestMatcher
  ).toContainAllKeys(applicationKeys);
  // 3rd level
  const secondApplicantInstance = (
    secondApplicationInstance as {
      applicant: PlainObject;
    }
  ).applicant;
  (expect(secondApplicantInstance) as TEMPORARY__JestMatcher).toContainKeys([
    'userName',
    'password',
    'firstName',
    'dateOfBirth',
  ]);
  // should not continue on to next depth
  expect(secondApplicantInstance).not.toContain('previousApplication');
});

test(unitTest('Class with miestoning'), () => {
  const vehicleOwner = editorStore.graphManagerState.graph.getClass(
    'myPackage::test::shared::dest::VehicleOwner',
  );
  const vehicleOwner_Instance = createMockClassInstance(vehicleOwner, true, 2);
  const vehicleOwner_properties = [
    'name',
    'businessDate',
    'vehicleAllVersions',
  ];
  (expect(vehicleOwner_Instance) as TEMPORARY__JestMatcher).toContainAllKeys(
    vehicleOwner_properties,
  );
});

// One column per relational type, with the standard primitive type Studio
// uses for it in TDS getters and mock data
const RELATIONAL_COLUMNS: [string, () => RelationalDataType, PRIMITIVE_TYPE][] =
  [
    ['C_BIGINT', () => new BigInt(), PRIMITIVE_TYPE.INTEGER],
    ['C_SMALLINT', () => new SmallInt(), PRIMITIVE_TYPE.INTEGER],
    ['C_TINYINT', () => new TinyInt(), PRIMITIVE_TYPE.INTEGER],
    ['C_INTEGER', () => new Integer(), PRIMITIVE_TYPE.INTEGER],
    ['C_FLOAT', () => new Float(), PRIMITIVE_TYPE.FLOAT],
    ['C_DOUBLE', () => new Double(), PRIMITIVE_TYPE.FLOAT],
    ['C_REAL', () => new Real(), PRIMITIVE_TYPE.FLOAT],
    ['C_DECIMAL', () => new Decimal(10, 2), PRIMITIVE_TYPE.DECIMAL],
    ['C_NUMERIC', () => new Numeric(10, 2), PRIMITIVE_TYPE.DECIMAL],
    ['C_VARCHAR', () => new VarChar(20), PRIMITIVE_TYPE.STRING],
    ['C_CHAR', () => new Char(5), PRIMITIVE_TYPE.STRING],
    ['C_BIT', () => new Bit(), PRIMITIVE_TYPE.BOOLEAN],
    ['C_DATE', () => new ColumnDate(), PRIMITIVE_TYPE.STRICTDATE],
    ['C_TIMESTAMP', () => new Timestamp(), PRIMITIVE_TYPE.DATETIME],
    ['C_BINARY', () => new Binary(10), PRIMITIVE_TYPE.STRING],
    ['C_VARBINARY', () => new VarBinary(10), PRIMITIVE_TYPE.STRING],
    ['C_OTHER', () => new Other(), PRIMITIVE_TYPE.STRING],
    ['C_JSON', () => new Json(), PRIMITIVE_TYPE.STRING],
    ['C_SEMISTRUCTURED', () => new SemiStructured(), PRIMITIVE_TYPE.STRING],
  ];

const EXPECTED_PRIMITIVE_TYPES = Object.fromEntries(
  RELATIONAL_COLUMNS.map(([name, , primitiveType]) => [name, primitiveType]),
);

const buildTableWithAllColumnTypes = (): Table => {
  const schema = new Schema('default', new Database('MyDatabase'));
  const table = new Table('MyTable', schema);
  table.columns = RELATIONAL_COLUMNS.map(([name, createType]) => {
    const column = new Column();
    column.name = name;
    column.type = createType();
    column.owner = table;
    return column;
  });
  return table;
};

const getColumns = (table: Table): Column[] =>
  table.columns.filter(filterByType(Column));

// Describes a mock value by the literal kind it parses as
const getMockValueKind = (value: string, columnName: string): string => {
  if (value === '{}') {
    return 'JSON';
  } else if (value === 'true' || value === 'false') {
    return PRIMITIVE_TYPE.BOOLEAN;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return PRIMITIVE_TYPE.STRICTDATE;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4}$/.test(value)) {
    return PRIMITIVE_TYPE.DATETIME;
  } else if (/^\d+$/.test(value)) {
    return PRIMITIVE_TYPE.INTEGER;
  } else if (!Number.isNaN(Number(value))) {
    // NOTE: mock floats and decimals are random fractions in [0, 1)
    return 'Fraction';
  } else if (value.startsWith(`${columnName} `)) {
    return PRIMITIVE_TYPE.STRING;
  }
  return `Unknown (${value})`;
};

test(
  unitTest('Relational column types map to the matching standard primitive'),
  () => {
    expect(
      Object.fromEntries(
        getColumns(buildTableWithAllColumnTypes()).map((column) => [
          column.name,
          getPrimitiveTypeFromRelationalType(column.type).path,
        ]),
      ),
    ).toEqual(EXPECTED_PRIMITIVE_TYPES);
  },
);

test(
  unitTest('Mock data for each relational column has the right literal kind'),
  () => {
    expect(
      Object.fromEntries(
        getColumns(buildTableWithAllColumnTypes()).map((column) => [
          column.name,
          getMockValueKind(createMockDataForColumn(column, false), column.name),
        ]),
      ),
    ).toEqual({
      C_BIGINT: PRIMITIVE_TYPE.INTEGER,
      C_SMALLINT: PRIMITIVE_TYPE.INTEGER,
      C_TINYINT: PRIMITIVE_TYPE.INTEGER,
      C_INTEGER: PRIMITIVE_TYPE.INTEGER,
      C_FLOAT: 'Fraction',
      C_DOUBLE: 'Fraction',
      C_REAL: 'Fraction',
      C_DECIMAL: 'Fraction',
      C_NUMERIC: 'Fraction',
      C_VARCHAR: PRIMITIVE_TYPE.STRING,
      C_CHAR: PRIMITIVE_TYPE.STRING,
      C_BIT: PRIMITIVE_TYPE.BOOLEAN,
      C_DATE: PRIMITIVE_TYPE.STRICTDATE,
      C_TIMESTAMP: PRIMITIVE_TYPE.DATETIME,
      C_BINARY: PRIMITIVE_TYPE.STRING,
      C_VARBINARY: PRIMITIVE_TYPE.STRING,
      C_OTHER: PRIMITIVE_TYPE.STRING,
      C_JSON: 'JSON',
      C_SEMISTRUCTURED: 'JSON',
    });
  },
);

test(unitTest('Mock data for a table has one value per column'), () => {
  const [header, values] = createMockDataForTable(
    buildTableWithAllColumnTypes(),
  ).split('\n');
  expect(header?.split(',')).toEqual(RELATIONAL_COLUMNS.map(([name]) => name));
  expect(values?.split(',')).toHaveLength(RELATIONAL_COLUMNS.length);
});

test(
  unitTest('Service test data seed values have the column primitive type'),
  () => {
    expect(
      Object.fromEntries(
        getColumns(buildTableWithAllColumnTypes()).map((column) => [
          column.name,
          guaranteeType(
            createMockPrimitiveValueSpecificationFromRelationalDataType(
              column.type,
              editorStore.graphManagerState.graph,
              editorStore.changeDetectionState.observerContext,
            ),
            PrimitiveInstanceValue,
          ).genericType.value.rawType.path,
        ]),
      ),
    ).toEqual(EXPECTED_PRIMITIVE_TYPES);
  },
);
