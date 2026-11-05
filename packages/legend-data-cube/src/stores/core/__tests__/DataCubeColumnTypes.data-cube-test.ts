/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { at, guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import {
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
  V1_AppliedFunction,
  V1_CInteger,
  V1_GenericType,
  V1_PackageableType,
  type V1_ValueSpecification,
} from '@finos/legend-graph';
import {
  DATA_CUBE_PRECISE_PRIMITIVE_TYPES,
  DataCubeColumnDataType,
  formatColumnType,
  getColumnTypeInfo,
  getColumnValueWarning,
  getDefaultDecimals,
  getLiteralType,
  hasCompleteColumnType,
  isIntegerType,
  isLegacyCollapsedColumnType,
  isNumericType,
  isPrecisePrimitiveType,
} from '../DataCubeColumnTypes.js';
import {
  DataCubeColumnKind,
  DataCubeFunction,
  DataCubeQueryAggregateOperator,
  _defaultPrimitiveTypeValue,
  getDataType,
  isDateTimeType,
  isDateType,
  isPrimitiveType,
} from '../DataCubeQueryEngine.js';
import { DataCubeQueryFilterOperation__Equal } from '../filter/DataCubeQueryFilterOperation__Equal.js';
import { DataCubeQueryAggregateOperation__UniqueValue } from '../aggregation/DataCubeQueryAggregateOperation__UniqueValue.js';
import { newColumnConfiguration } from '../DataCubeConfigurationBuilder.js';
import {
  _castCols,
  _colSpec,
  _cols,
  _function,
  _functionName,
  _lambda,
  _property,
  _value,
  _var,
} from '../DataCubeQueryBuilderUtils.js';
import { toDataCubeColumn } from '../DataCubeSnapshotBuilderUtils.js';
import { DataCubeConfiguration } from '../model/DataCubeConfiguration.js';
import { DataCubeSpecification } from '../model/DataCubeSpecification.js';
import { INTERNAL__DataCubeSource } from '../model/DataCubeSource.js';
import { validateAndBuildSnapshot } from '../DataCubeSnapshotBuilder.js';
import { buildExecutableQuery } from '../DataCubeQueryBuilder.js';
import { TEST__DataCubeEngine } from '../../__tests__/DataCubeTestUtils.js';
import type { DataCubeRelationType } from '../DataCubeEngine.js';

const LEGACY_RELATIONAL_TIMESTAMP =
  'meta::relational::metamodel::datatype::Timestamp';

describe(unitTest('Column types: precise primitives'), () => {
  test('registers the precise primitives the engine reports', () => {
    expect(DATA_CUBE_PRECISE_PRIMITIVE_TYPES).toEqual([
      PRECISE_PRIMITIVE_TYPE.TINY_INT,
      PRECISE_PRIMITIVE_TYPE.U_TINY_INT,
      PRECISE_PRIMITIVE_TYPE.SMALL_INT,
      PRECISE_PRIMITIVE_TYPE.U_SMALL_INT,
      PRECISE_PRIMITIVE_TYPE.INT,
      PRECISE_PRIMITIVE_TYPE.U_INT,
      PRECISE_PRIMITIVE_TYPE.BIG_INT,
      PRECISE_PRIMITIVE_TYPE.U_BIG_INT,
      PRECISE_PRIMITIVE_TYPE.VARCHAR,
      PRECISE_PRIMITIVE_TYPE.DATETIME,
      PRECISE_PRIMITIVE_TYPE.FLOAT,
      PRECISE_PRIMITIVE_TYPE.DOUBLE,
      PRECISE_PRIMITIVE_TYPE.NUMERIC,
    ]);
  });

  test.each([
    // type, base type, data type, is integer, type variable count
    [
      PRECISE_PRIMITIVE_TYPE.TINY_INT,
      PRIMITIVE_TYPE.INTEGER,
      'Numeric',
      true,
      0,
    ],
    [
      PRECISE_PRIMITIVE_TYPE.U_TINY_INT,
      PRIMITIVE_TYPE.INTEGER,
      'Numeric',
      true,
      0,
    ],
    [
      PRECISE_PRIMITIVE_TYPE.SMALL_INT,
      PRIMITIVE_TYPE.INTEGER,
      'Numeric',
      true,
      0,
    ],
    [
      PRECISE_PRIMITIVE_TYPE.U_SMALL_INT,
      PRIMITIVE_TYPE.INTEGER,
      'Numeric',
      true,
      0,
    ],
    [PRECISE_PRIMITIVE_TYPE.INT, PRIMITIVE_TYPE.INTEGER, 'Numeric', true, 0],
    [PRECISE_PRIMITIVE_TYPE.U_INT, PRIMITIVE_TYPE.INTEGER, 'Numeric', true, 0],
    [
      PRECISE_PRIMITIVE_TYPE.BIG_INT,
      PRIMITIVE_TYPE.INTEGER,
      'Numeric',
      true,
      0,
    ],
    [
      PRECISE_PRIMITIVE_TYPE.U_BIG_INT,
      PRIMITIVE_TYPE.INTEGER,
      'Numeric',
      true,
      0,
    ],
    [PRECISE_PRIMITIVE_TYPE.FLOAT, PRIMITIVE_TYPE.FLOAT, 'Numeric', false, 0],
    [PRECISE_PRIMITIVE_TYPE.DOUBLE, PRIMITIVE_TYPE.FLOAT, 'Numeric', false, 0],
    [
      PRECISE_PRIMITIVE_TYPE.NUMERIC,
      PRIMITIVE_TYPE.DECIMAL,
      'Numeric',
      false,
      2,
    ],
    [PRECISE_PRIMITIVE_TYPE.VARCHAR, PRIMITIVE_TYPE.STRING, 'Text', false, 1],
    [
      PRECISE_PRIMITIVE_TYPE.DATETIME,
      PRIMITIVE_TYPE.DATETIME,
      'Time',
      false,
      0,
    ],
  ])(
    '%s extends %s',
    (type, baseType, dataType, isInteger, typeVariableCount) => {
      expect(isPrecisePrimitiveType(type)).toBe(true);
      expect(getLiteralType(type)).toBe(baseType);
      expect(getDataType(type)).toBe(dataType);
      expect(isPrimitiveType(type)).toBe(true);
      expect(isIntegerType(type)).toBe(isInteger);
      expect(getColumnTypeInfo(type)?.typeVariableCount).toBe(
        typeVariableCount,
      );
    },
  );

  test('keeps the type of record of precise primitives', () => {
    // NOTE: precise primitives are no longer collapsed into their base type
    const config = newColumnConfiguration({
      name: 'name',
      type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
      typeVariableValues: [200],
    });
    expect(config.type).toBe(PRECISE_PRIMITIVE_TYPE.VARCHAR);
    expect(config.typeVariableValues).toEqual([200]);
  });

  test.each([
    PRECISE_PRIMITIVE_TYPE.DECIMAL, // meta::pure::precisePrimitives::Decimal
    PRECISE_PRIMITIVE_TYPE.STRICTDATE, // meta::pure::precisePrimitives::Date
    PRECISE_PRIMITIVE_TYPE.STRICTTIME, // meta::pure::precisePrimitives::Time
  ])('does not recognize %s, which is not a precise primitive', (type) => {
    expect(isPrecisePrimitiveType(type)).toBe(false);
    expect(getColumnTypeInfo(type)).toBeUndefined();
    expect(isPrimitiveType(type)).toBe(false);
  });

  test('resolves the legacy relational timestamp type to the precise primitive', () => {
    expect(getColumnTypeInfo(LEGACY_RELATIONAL_TIMESTAMP)?.path).toBe(
      PRECISE_PRIMITIVE_TYPE.DATETIME,
    );
    expect(isDateTimeType(LEGACY_RELATIONAL_TIMESTAMP)).toBe(true);
    expect(getLiteralType(LEGACY_RELATIONAL_TIMESTAMP)).toBe(
      PRIMITIVE_TYPE.DATETIME,
    );
  });

  test.each([PRIMITIVE_TYPE.STRICTTIME, PRIMITIVE_TYPE.BYTE])(
    'treats %s as a type which can be displayed but not filtered',
    (type) => {
      const column = { name: 'col', type };
      expect(getDataType(type)).toBe(DataCubeColumnDataType.OTHER);
      expect(isDateType(type)).toBe(false);
      // NOTE: a time of day has no date, so no current-moment (`now()`) value applies
      expect(isDateTimeType(type)).toBe(false);
      expect(
        new DataCubeQueryFilterOperation__Equal().isCompatibleWithColumn(
          column,
        ),
      ).toBe(false);
      // NOTE: the default operator of a dimension, so the column can still be grouped by
      expect(
        new DataCubeQueryAggregateOperation__UniqueValue().isCompatibleWithColumn(
          column,
        ),
      ).toBe(true);
    },
  );

  test('registers StrictTime as a primitive so saved values of it can be built', () => {
    expect(isPrimitiveType(PRIMITIVE_TYPE.STRICTTIME)).toBe(true);
    expect(isPrimitiveType(PRIMITIVE_TYPE.BYTE)).toBe(false);
    expect(_defaultPrimitiveTypeValue(PRIMITIVE_TYPE.STRICTTIME)).toBe(
      '00:00:00',
    );
  });

  test('specifies the value range of integer types', () => {
    expect(getColumnTypeInfo(PRECISE_PRIMITIVE_TYPE.TINY_INT)?.range).toEqual([
      -128n,
      127n,
    ]);
    expect(
      getColumnTypeInfo(PRECISE_PRIMITIVE_TYPE.U_SMALL_INT)?.range,
    ).toEqual([0n, 65535n]);
    expect(getColumnTypeInfo(PRECISE_PRIMITIVE_TYPE.BIG_INT)?.range).toEqual([
      -9223372036854775808n,
      9223372036854775807n,
    ]);
  });
});

describe(unitTest('Column types: display'), () => {
  test.each([
    [
      { type: PRECISE_PRIMITIVE_TYPE.VARCHAR, typeVariableValues: [200] },
      'Varchar(200)',
    ],
    [
      { type: PRECISE_PRIMITIVE_TYPE.NUMERIC, typeVariableValues: [18, 4] },
      'Numeric(18,4)',
    ],
    [{ type: PRECISE_PRIMITIVE_TYPE.BIG_INT }, 'BigInt'],
    [{ type: PRIMITIVE_TYPE.STRING }, 'String'],
    [{ type: LEGACY_RELATIONAL_TIMESTAMP }, 'Timestamp'],
  ])('formats %o as %s', (column, label) => {
    expect(formatColumnType(column)).toBe(label);
  });

  test.each([
    [{ type: PRECISE_PRIMITIVE_TYPE.INT }, 0],
    [{ type: PRIMITIVE_TYPE.INTEGER }, 0],
    [{ type: PRECISE_PRIMITIVE_TYPE.NUMERIC, typeVariableValues: [18, 4] }, 4],
    [{ type: PRECISE_PRIMITIVE_TYPE.NUMERIC, typeVariableValues: [10, 0] }, 0],
    [{ type: PRECISE_PRIMITIVE_TYPE.NUMERIC }, 2],
    [{ type: PRECISE_PRIMITIVE_TYPE.DOUBLE }, 2],
    [{ type: PRIMITIVE_TYPE.DECIMAL }, 2],
  ])('defaults decimals of %o to %s', (column, decimals) => {
    expect(getDefaultDecimals(column)).toBe(decimals);
  });
});

describe(unitTest('Column types: column configuration'), () => {
  test.each([
    [PRECISE_PRIMITIVE_TYPE.INT, undefined, 0],
    [PRECISE_PRIMITIVE_TYPE.BIG_INT, undefined, 0],
    [PRECISE_PRIMITIVE_TYPE.U_BIG_INT, undefined, 0],
    [PRECISE_PRIMITIVE_TYPE.DOUBLE, undefined, 2],
    [PRECISE_PRIMITIVE_TYPE.FLOAT, undefined, 2],
    [PRECISE_PRIMITIVE_TYPE.NUMERIC, [18, 4], 4],
  ])(
    'a %s column defaults to a measure',
    (type, typeVariableValues, decimals) => {
      const config = newColumnConfiguration({
        name: 'col',
        type,
        typeVariableValues,
      });
      expect(isNumericType(config.type)).toBe(true);
      expect(config.kind).toBe(DataCubeColumnKind.MEASURE);
      expect(config.decimals).toBe(decimals);
    },
  );

  test.each([PRECISE_PRIMITIVE_TYPE.VARCHAR, PRECISE_PRIMITIVE_TYPE.DATETIME])(
    'a %s column defaults to a dimension',
    (type) => {
      expect(newColumnConfiguration({ name: 'col', type }).kind).toBe(
        DataCubeColumnKind.DIMENSION,
      );
    },
  );

  test.each([
    // types persisted by older versions, which collapsed precise primitives
    [PRIMITIVE_TYPE.STRING, PRECISE_PRIMITIVE_TYPE.VARCHAR, true],
    [PRIMITIVE_TYPE.INTEGER, PRECISE_PRIMITIVE_TYPE.TINY_INT, true],
    [PRIMITIVE_TYPE.INTEGER, PRECISE_PRIMITIVE_TYPE.U_TINY_INT, true],
    [PRIMITIVE_TYPE.INTEGER, PRECISE_PRIMITIVE_TYPE.SMALL_INT, true],
    [PRIMITIVE_TYPE.INTEGER, PRECISE_PRIMITIVE_TYPE.U_SMALL_INT, true],
    [PRIMITIVE_TYPE.INTEGER, PRECISE_PRIMITIVE_TYPE.INT, true],
    [PRIMITIVE_TYPE.INTEGER, PRECISE_PRIMITIVE_TYPE.U_INT, true],
    [PRIMITIVE_TYPE.NUMBER, PRECISE_PRIMITIVE_TYPE.BIG_INT, true],
    [PRIMITIVE_TYPE.NUMBER, PRECISE_PRIMITIVE_TYPE.U_BIG_INT, true],
    [PRIMITIVE_TYPE.NUMBER, PRECISE_PRIMITIVE_TYPE.DOUBLE, true],
    [PRIMITIVE_TYPE.FLOAT, PRECISE_PRIMITIVE_TYPE.FLOAT, true],
    [PRIMITIVE_TYPE.DATETIME, PRECISE_PRIMITIVE_TYPE.DATETIME, true],
    [PRECISE_PRIMITIVE_TYPE.NUMERIC, PRECISE_PRIMITIVE_TYPE.NUMERIC, true],
    [LEGACY_RELATIONAL_TIMESTAMP, PRECISE_PRIMITIVE_TYPE.DATETIME, true],
    // genuine type mismatches
    // (`Double` collapsed to `Number`, not to `Float`, which only `Float` collapsed to)
    [PRIMITIVE_TYPE.FLOAT, PRECISE_PRIMITIVE_TYPE.DOUBLE, false],
    [PRIMITIVE_TYPE.NUMBER, PRECISE_PRIMITIVE_TYPE.FLOAT, false],
    // `Numeric` was never collapsed
    [PRIMITIVE_TYPE.DECIMAL, PRECISE_PRIMITIVE_TYPE.NUMERIC, false],
    [PRIMITIVE_TYPE.STRING, PRECISE_PRIMITIVE_TYPE.INT, false],
    [PRIMITIVE_TYPE.NUMBER, PRECISE_PRIMITIVE_TYPE.INT, false],
    [PRIMITIVE_TYPE.STRING, PRIMITIVE_TYPE.INTEGER, false],
  ])(
    'a configuration typed %s is upgradable to %s: %s',
    (legacyType, type, expected) => {
      expect(isLegacyCollapsedColumnType(legacyType, type)).toBe(expected);
    },
  );
});

describe(unitTest('Column types: query building'), () => {
  test('builds column type variable values from the relation type', () => {
    const genericType = new V1_GenericType();
    const rawType = new V1_PackageableType();
    rawType.fullPath = PRECISE_PRIMITIVE_TYPE.NUMERIC;
    genericType.rawType = rawType;
    genericType.typeVariableValues = [18, 4].map((value) => {
      const instance = new V1_CInteger();
      instance.value = value;
      return instance;
    });
    expect(toDataCubeColumn('price', genericType)).toEqual({
      name: 'price',
      type: PRECISE_PRIMITIVE_TYPE.NUMERIC,
      typeVariableValues: [18, 4],
    });
  });

  test('declares precise primitives with their type variable values in relation casts', () => {
    const relationType = _castCols([
      { name: 'id', type: PRECISE_PRIMITIVE_TYPE.INT },
      {
        name: 'name',
        type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
        typeVariableValues: [200],
      },
      {
        name: 'price',
        type: PRECISE_PRIMITIVE_TYPE.NUMERIC,
        typeVariableValues: [18, 4],
      },
      // stale type variable values on a type which takes none
      {
        name: 'stale',
        type: PRECISE_PRIMITIVE_TYPE.INT,
        typeVariableValues: [10],
      },
      // type variable values unknown
      { name: 'code', type: PRECISE_PRIMITIVE_TYPE.VARCHAR },
      { name: 'amount', type: PRECISE_PRIMITIVE_TYPE.NUMERIC },
    ]).genericType.typeArguments[0]?.rawType as unknown as {
      columns: {
        name: string;
        genericType: {
          rawType: { fullPath: string };
          typeVariableValues: { value: number }[];
        };
      }[];
    };
    expect(
      relationType.columns.map((column) => [
        column.name,
        column.genericType.rawType.fullPath,
        column.genericType.typeVariableValues.map((value) => value.value),
      ]),
    ).toEqual([
      ['id', PRECISE_PRIMITIVE_TYPE.INT, []],
      ['name', PRECISE_PRIMITIVE_TYPE.VARCHAR, [200]],
      ['price', PRECISE_PRIMITIVE_TYPE.NUMERIC, [18, 4]],
      ['stale', PRECISE_PRIMITIVE_TYPE.INT, []],
      ['code', PRECISE_PRIMITIVE_TYPE.VARCHAR, [16777216]],
      // `Numeric` can't be declared without precision and scale
      ['amount', PRIMITIVE_TYPE.DECIMAL, []],
    ]);
  });

  test.each([
    [PRECISE_PRIMITIVE_TYPE.INT, 5, V1_CInteger],
    [PRECISE_PRIMITIVE_TYPE.U_BIG_INT, 5, V1_CInteger],
  ])('builds %s values as literals of their base type', (type, value, cls) => {
    expect(_value({ type, value })).toBeInstanceOf(cls);
  });

  test('a filter value takes the literal type of the column', () => {
    expect(getDataType(getLiteralType(PRECISE_PRIMITIVE_TYPE.INT))).toBe(
      DataCubeColumnDataType.NUMBER,
    );
    expect(getLiteralType(PRECISE_PRIMITIVE_TYPE.VARCHAR)).toBe(
      PRIMITIVE_TYPE.STRING,
    );
  });
});

describe(unitTest('Column types: saved configuration'), () => {
  const SOURCE_COLUMNS = [
    { name: 'id', type: PRECISE_PRIMITIVE_TYPE.BIG_INT },
    {
      name: 'name',
      type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
      typeVariableValues: [200],
    },
    {
      name: 'price',
      type: PRECISE_PRIMITIVE_TYPE.NUMERIC,
      typeVariableValues: [18, 4],
    },
  ];

  const engine = new TEST__DataCubeEngine();
  const source = new INTERNAL__DataCubeSource();
  source.columns = SOURCE_COLUMNS;

  const buildSnapshot = async (
    configuration?: DataCubeConfiguration | undefined,
    query?: V1_ValueSpecification | undefined,
  ) => {
    const specification = new DataCubeSpecification();
    specification.configuration = configuration;
    return validateAndBuildSnapshot(
      query ??
        _function(_functionName(DataCubeFunction.SELECT), [
          _cols(SOURCE_COLUMNS.map((column) => _colSpec(column.name))),
        ]),
      source,
      specification,
      engine,
    );
  };

  test('upgrades column types collapsed by older versions to precise primitives', async () => {
    const defaultConfiguration = DataCubeConfiguration.serialization.fromJson(
      (await buildSnapshot()).data.configuration,
    );
    // mimic a configuration saved by an older version, which collapsed `Varchar` into
    // `String`, `BigInt` into `Number`, and did not record type variable values
    const savedConfiguration = DataCubeConfiguration.serialization.fromJson(
      defaultConfiguration.serialize(),
    );
    savedConfiguration.columns.forEach((column) => {
      column.typeVariableValues = undefined;
      if (column.name === 'id') {
        column.type = PRIMITIVE_TYPE.NUMBER;
      } else if (column.name === 'name') {
        column.type = PRIMITIVE_TYPE.STRING;
      }
    });

    const configuration = DataCubeConfiguration.serialization.fromJson(
      (await buildSnapshot(savedConfiguration)).data.configuration,
    );
    expect(
      configuration.columns.map((column) => [
        column.name,
        column.type,
        column.typeVariableValues,
      ]),
    ).toEqual([
      ['id', PRECISE_PRIMITIVE_TYPE.BIG_INT, undefined],
      ['name', PRECISE_PRIMITIVE_TYPE.VARCHAR, [200]],
      ['price', PRECISE_PRIMITIVE_TYPE.NUMERIC, [18, 4]],
    ]);
  });

  test('keeps the aggregation operator saved by older versions for columns not aggregated in the query', async () => {
    // older versions defaulted precise numeric columns (e.g. `BigInt`) to dimensions
    // aggregated with `unique`, whereas they now default to measures aggregated with `sum`
    const snapshot = await buildSnapshot();
    const savedConfiguration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    savedConfiguration.columns.forEach((column) => {
      column.typeVariableValues = undefined;
      if (column.name === 'id') {
        column.type = PRIMITIVE_TYPE.NUMBER;
        column.kind = DataCubeColumnKind.DIMENSION;
        column.excludedFromPivot = true;
        column.aggregateOperator = DataCubeQueryAggregateOperator.UNIQUE;
      } else if (column.name === 'name') {
        column.type = PRIMITIVE_TYPE.STRING;
      }
    });
    // group by `id`, which is therefore not aggregated in the query
    snapshot.data.groupBy = { columns: [at(SOURCE_COLUMNS, 0)] };
    snapshot.data.configuration = savedConfiguration.serialize();
    const query = buildExecutableQuery(snapshot, source, engine, {
      skipExecutionContext: true,
    });
    // drop the source query to only keep the DataCube query
    let func = query as V1_AppliedFunction;
    while (func.parameters[0] instanceof V1_AppliedFunction) {
      func = func.parameters[0];
    }
    func.parameters.shift();

    const configuration = DataCubeConfiguration.serialization.fromJson(
      (await buildSnapshot(savedConfiguration, query)).data.configuration,
    );
    const idColumn = guaranteeNonNullable(
      configuration.columns.find((column) => column.name === 'id'),
    );
    expect(idColumn.type).toBe(PRECISE_PRIMITIVE_TYPE.BIG_INT);
    expect(idColumn.aggregateOperator).toBe(
      DataCubeQueryAggregateOperator.UNIQUE,
    );
  });

  test('still rejects a configuration whose column type genuinely mismatches', async () => {
    const savedConfiguration = DataCubeConfiguration.serialization.fromJson(
      (await buildSnapshot()).data.configuration,
    );
    savedConfiguration.columns.forEach((column) => {
      if (column.name === 'name') {
        column.type = PRIMITIVE_TYPE.INTEGER;
      }
    });
    await expect(buildSnapshot(savedConfiguration)).rejects.toThrow(
      `Can't process configuration: type mismatch for column 'name' (expected: '${PRECISE_PRIMITIVE_TYPE.VARCHAR}', found: '${PRIMITIVE_TYPE.INTEGER}')`,
    );
  });
});

describe(unitTest('Column types: value constraints'), () => {
  test.each([
    [{ type: PRECISE_PRIMITIVE_TYPE.TINY_INT }, 127, undefined],
    [
      { type: PRECISE_PRIMITIVE_TYPE.TINY_INT },
      300,
      'Value 300 is out of the range of TinyInt [-128, 127]',
    ],
    [
      { type: PRECISE_PRIMITIVE_TYPE.U_INT },
      -1,
      'Value -1 is out of the range of UInt [0, 4294967295]',
    ],
    [
      { type: PRECISE_PRIMITIVE_TYPE.INT },
      1.5,
      'Value 1.5 is not an integer, as expected for Int',
    ],
    [
      { type: PRECISE_PRIMITIVE_TYPE.VARCHAR, typeVariableValues: [3] },
      'abc',
      undefined,
    ],
    [
      { type: PRECISE_PRIMITIVE_TYPE.VARCHAR, typeVariableValues: [3] },
      'abcd',
      'Value is longer (4 characters) than the max length of Varchar(3)',
    ],
    // characters are counted as code points
    [
      { type: PRECISE_PRIMITIVE_TYPE.VARCHAR, typeVariableValues: [3] },
      '\u{1F600}ab',
      undefined,
    ],
    // no max length known
    [{ type: PRECISE_PRIMITIVE_TYPE.VARCHAR }, 'abcd', undefined],
    [
      { type: PRECISE_PRIMITIVE_TYPE.NUMERIC, typeVariableValues: [5, 2] },
      123.45,
      undefined,
    ],
    [
      { type: PRECISE_PRIMITIVE_TYPE.NUMERIC, typeVariableValues: [5, 2] },
      1.234,
      'Value 1.234 has more decimals than the scale of Numeric(5,2)',
    ],
    [
      { type: PRECISE_PRIMITIVE_TYPE.NUMERIC, typeVariableValues: [5, 2] },
      1234.5,
      'Value 1234.5 has more digits than the precision of Numeric(5,2) allows',
    ],
    // core primitives carry no constraints
    [{ type: PRIMITIVE_TYPE.INTEGER }, 1e30, undefined],
    [{ type: PRIMITIVE_TYPE.STRING }, 'abcd', undefined],
  ])('checks a value of %o: %s', (column, value, warning) => {
    expect(getColumnValueWarning(column, value)).toBe(warning);
  });
});

describe(unitTest('Column types: reloading a saved DataCube'), () => {
  class TEST__PreciseRelationTypeDataCubeEngine extends TEST__DataCubeEngine {
    override async getQueryRelationReturnType(): Promise<DataCubeRelationType> {
      // the extended column passes the source column through unchanged
      return {
        columns: [
          {
            name: 'name',
            type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
            typeVariableValues: [200],
          },
          {
            name: 'label',
            type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
            typeVariableValues: [200],
          },
        ],
      };
    }
  }

  test('keeps the type variable values of extended columns', async () => {
    const engine = new TEST__PreciseRelationTypeDataCubeEngine();
    const query = _function(_functionName(DataCubeFunction.EXTEND), [
      _cols([_colSpec('label', _lambda([_var()], [_property('name')]))]),
    ]);
    const source = new INTERNAL__DataCubeSource();
    source.columns = [
      {
        name: 'name',
        type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
        typeVariableValues: [200],
      },
    ];
    const snapshot = await validateAndBuildSnapshot(
      query,
      source,
      new DataCubeSpecification(),
      engine,
    );
    expect(snapshot.data.leafExtendedColumns[0]).toMatchObject({
      name: 'label',
      type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
      typeVariableValues: [200],
    });
    const configuration = DataCubeConfiguration.serialization.fromJson(
      snapshot.data.configuration,
    );
    expect(
      configuration.columns.find((column) => column.name === 'label')
        ?.typeVariableValues,
    ).toEqual([200]);
  });

  test('checks whether a column type is fully specified', () => {
    expect(
      hasCompleteColumnType({ type: PRECISE_PRIMITIVE_TYPE.VARCHAR }),
    ).toBe(false);
    expect(
      hasCompleteColumnType({
        type: PRECISE_PRIMITIVE_TYPE.VARCHAR,
        typeVariableValues: [200],
      }),
    ).toBe(true);
    expect(
      hasCompleteColumnType({
        type: PRECISE_PRIMITIVE_TYPE.NUMERIC,
        typeVariableValues: [18],
      }),
    ).toBe(false);
    expect(hasCompleteColumnType({ type: PRECISE_PRIMITIVE_TYPE.INT })).toBe(
      true,
    );
    expect(hasCompleteColumnType({ type: PRIMITIVE_TYPE.STRING })).toBe(true);
  });
});
