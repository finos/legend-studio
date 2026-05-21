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

import { test, describe, expect, beforeAll, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import {
  type Accessor,
  type AccessorOwner,
  IngestionAccessor,
  RelationalStoreAccessor,
  DataProductAccessor,
  AccessorInstanceValue,
} from '../../graph/metamodel/pure/packageableElements/relation/Accessor.js';
import {
  IngestDefinition,
  type MatViewDataSet,
} from '../../graph/metamodel/pure/packageableElements/ingest/IngestDefinition.js';
import { Database } from '../../graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
import { DataProduct } from '../../graph/metamodel/pure/dataProduct/DataProduct.js';
import {
  RelationType,
  RelationColumn,
} from '../../graph/metamodel/pure/packageableElements/relation/RelationType.js';
import { GenericType } from '../../graph/metamodel/pure/packageableElements/domain/GenericType.js';
import { GenericTypeExplicitReference } from '../../graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
import { Schema } from '../../graph/metamodel/pure/packageableElements/store/relational/model/Schema.js';
import { Table } from '../../graph/metamodel/pure/packageableElements/store/relational/model/Table.js';
import { Column } from '../../graph/metamodel/pure/packageableElements/store/relational/model/Column.js';
import { PrimitiveType } from '../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import {
  type RelationalDataType,
  VarChar,
  Integer as RelationalInteger,
  Decimal as RelationalDecimal,
  Bit,
  Timestamp,
  Date as RelationalDate,
  Float as RelationalFloat,
  Double,
  Real,
  BigInt as RelationalBigInt,
  SmallInt,
  TinyInt,
  Numeric,
  Char,
  Binary as RelationalBinary,
  VarBinary,
  SemiStructured,
  Json,
  Other,
} from '../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
import {
  TEST__getTestGraphManagerState,
  TEST__buildGraphWithEntities,
} from '../__test-utils__/GraphManagerTestUtils.js';
import { RawLambda } from '../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import {
  RelationTypeMetadata,
  RelationTypeColumnMetadata,
} from '../action/relation/RelationTypeMetadata.js';
import { Multiplicity } from '../../graph/metamodel/pure/packageableElements/domain/Multiplicity.js';

// ──────────────────────────────────────────────────────────
// Shared graph setup
// ──────────────────────────────────────────────────────────

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(graphManagerState, []);
});

const createAccessorFromPackageableElement = async (
  element: AccessorOwner,
  options?: {
    schemaName: string | undefined;
    tableName: string | undefined;
  },
): Promise<Accessor | undefined> =>
  graphManagerState.graphManager.createAccessorFromPackageableElement(
    element,
    graphManagerState.graph,
    options,
  );

// ──────────────────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────────────────

const createTestIngestDefinition = (
  path: string,
  datasets: {
    name: string;
    columns: { name: string; fullPath: string }[];
  }[],
): IngestDefinition => {
  const ingest = new IngestDefinition(
    guaranteeNonNullable(path.split('::').pop()),
  );
  ingest.content = {
    datasets: datasets.map((ds) => ({
      name: ds.name,
      primaryKey: [],
      source: {
        _type: 'ingestSource',
        schema: {
          _type: 'schema',
          columns: ds.columns.map((col) => ({
            name: col.name,
            genericType: {
              rawType: { _type: 'packageableType', fullPath: col.fullPath },
            },
            multiplicity: { lowerBound: 1, upperBound: 1 },
          })),
        },
      },
    })),
  } as PlainObject;
  return ingest;
};

const createTestDatabase = (
  path: string,
  schemas: {
    name: string;
    tables: {
      name: string;
      columns: { name: string; type: RelationalDataType }[];
    }[];
  }[],
): Database => {
  const db = new Database(guaranteeNonNullable(path.split('::').pop()));
  db.schemas = schemas.map((s) => {
    const schema = new Schema(s.name, db);
    schema.tables = s.tables.map((t) => {
      const table = new Table(t.name, schema);
      table.columns = t.columns.map((c) => {
        const col = new Column();
        col.name = c.name;
        col.type = c.type;
        col.owner = table;
        return col;
      });
      return table;
    });
    return schema;
  });
  return db;
};

// ──────────────────────────────────────────────────────────
// IngestDefinition tests
// ──────────────────────────────────────────────────────────

describe(
  unitTest('createAccessorFromPackageableElement — IngestDefinition'),
  () => {
    test('creates IngestionAccessor with first dataset when tableName not specified', async () => {
      const ingest = createTestIngestDefinition('test::MyIngest', [
        {
          name: 'dataset1',
          columns: [
            { name: 'id', fullPath: 'Integer' },
            { name: 'name', fullPath: 'String' },
          ],
        },
        {
          name: 'dataset2',
          columns: [{ name: 'value', fullPath: 'Float' }],
        },
      ]);

      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest),
      );

      expect(accessor).toBeInstanceOf(IngestionAccessor);
      expect(accessor.accessor).toBe('dataset1');
      expect(accessor.parentElement).toBe(ingest);
      expect(accessor.schema).toBeUndefined();
      expect(accessor.relationType.columns).toHaveLength(2);
      expect(guaranteeNonNullable(accessor.relationType.columns[0]).name).toBe(
        'id',
      );
      expect(guaranteeNonNullable(accessor.relationType.columns[1]).name).toBe(
        'name',
      );
    });

    test('creates IngestionAccessor for a specific dataset by tableName', async () => {
      const ingest = createTestIngestDefinition('test::MyIngest', [
        {
          name: 'dataset1',
          columns: [{ name: 'id', fullPath: 'Integer' }],
        },
        {
          name: 'dataset2',
          columns: [
            { name: 'value', fullPath: 'Float' },
            { name: 'flag', fullPath: 'Boolean' },
          ],
        },
      ]);

      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest, {
          tableName: 'dataset2',
          schemaName: undefined,
        }),
      );

      expect(accessor).toBeInstanceOf(IngestionAccessor);
      expect(accessor.accessor).toBe('dataset2');
      expect(accessor.relationType.columns).toHaveLength(2);
      expect(guaranteeNonNullable(accessor.relationType.columns[0]).name).toBe(
        'value',
      );
      expect(guaranteeNonNullable(accessor.relationType.columns[1]).name).toBe(
        'flag',
      );
    });

    test('returns undefined when tableName does not match any dataset', async () => {
      const ingest = createTestIngestDefinition('test::MyIngest', [
        {
          name: 'dataset1',
          columns: [{ name: 'id', fullPath: 'Integer' }],
        },
      ]);

      const accessor = await createAccessorFromPackageableElement(ingest, {
        tableName: 'nonexistent',
        schemaName: undefined,
      });

      expect(accessor).toBeUndefined();
    });

    test('returns undefined when ingest has no datasets', async () => {
      const ingest = new IngestDefinition('EmptyIngest');
      ingest.content = {} as PlainObject;

      const accessor = await createAccessorFromPackageableElement(ingest);

      expect(accessor).toBeUndefined();
    });

    test('maps Pure type paths to correct PrimitiveTypes', async () => {
      const ingest = createTestIngestDefinition('test::MyIngest', [
        {
          name: 'ds',
          columns: [
            { name: 'col_string', fullPath: 'String' },
            { name: 'col_integer', fullPath: 'Integer' },
            { name: 'col_float', fullPath: 'Float' },
            { name: 'col_decimal', fullPath: 'Decimal' },
            { name: 'col_boolean', fullPath: 'Boolean' },
            { name: 'col_date', fullPath: 'Date' },
            { name: 'col_datetime', fullPath: 'DateTime' },
            { name: 'col_strictdate', fullPath: 'StrictDate' },
            { name: 'col_number', fullPath: 'Number' },
          ],
        },
      ]);

      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest, {
          tableName: 'ds',
          schemaName: undefined,
        }),
      );

      const cols = accessor.relationType.columns;
      expect(cols).toHaveLength(9);

      const getType = (name: string) =>
        guaranteeNonNullable(cols.find((c) => c.name === name)).genericType
          .value.rawType;

      expect(getType('col_string')).toBe(PrimitiveType.STRING);
      expect(getType('col_integer')).toBe(PrimitiveType.INTEGER);
      expect(getType('col_float')).toBe(PrimitiveType.FLOAT);
      expect(getType('col_decimal')).toBe(PrimitiveType.DECIMAL);
      expect(getType('col_boolean')).toBe(PrimitiveType.BOOLEAN);
      expect(getType('col_date')).toBe(PrimitiveType.DATE);
      expect(getType('col_datetime')).toBe(PrimitiveType.DATETIME);
      expect(getType('col_strictdate')).toBe(PrimitiveType.STRICTDATE);
      expect(getType('col_number')).toBe(PrimitiveType.NUMBER);
    });

    test('resolves fully qualified type paths', async () => {
      const ingest = createTestIngestDefinition('test::MyIngest', [
        {
          name: 'ds',
          columns: [
            {
              name: 'col',
              fullPath: 'meta::pure::metamodel::type::Integer',
            },
          ],
        },
      ]);

      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest, {
          tableName: 'ds',
          schemaName: undefined,
        }),
      );

      expect(
        guaranteeNonNullable(accessor.relationType.columns[0]).genericType.value
          .rawType,
      ).toBe(PrimitiveType.INTEGER);
    });

    test('defaults to STRING for unknown type paths', async () => {
      const ingest = createTestIngestDefinition('test::MyIngest', [
        {
          name: 'ds',
          columns: [{ name: 'col', fullPath: 'SomeCustomType' }],
        },
      ]);

      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest, {
          tableName: 'ds',
          schemaName: undefined,
        }),
      );

      expect(
        guaranteeNonNullable(accessor.relationType.columns[0]).genericType.value
          .rawType,
      ).toBe(PrimitiveType.STRING);
    });

    test('accessor path and labels are correct', async () => {
      const ingest = createTestIngestDefinition('test::MyIngest', [
        {
          name: 'myDataset',
          columns: [{ name: 'id', fullPath: 'Integer' }],
        },
      ]);

      const accessor = (await createAccessorFromPackageableElement(ingest, {
        tableName: 'myDataset',
        schemaName: undefined,
      })) as IngestionAccessor;

      expect(accessor.accessorOwnerLabel).toBe('Ingestion Source');
      expect(accessor.accessorLabel).toBe('Dataset');
      expect(accessor.schemaLabel).toBeUndefined();
      expect(accessor.path).toEqual(['MyIngest', 'myDataset']);
    });
  },
);

// ──────────────────────────────────────────────────────────
// Database tests
// ──────────────────────────────────────────────────────────

describe(unitTest('createAccessorFromPackageableElement — Database'), () => {
  test('creates RelationalStoreAccessor for a specific table', async () => {
    const db = createTestDatabase('test::MyDB', [
      {
        name: 'public',
        tables: [
          {
            name: 'PERSON',
            columns: [
              { name: 'ID', type: new RelationalInteger() },
              { name: 'NAME', type: new VarChar(200) },
            ],
          },
        ],
      },
    ]);

    const accessor = guaranteeNonNullable(
      await createAccessorFromPackageableElement(db, {
        schemaName: 'public',
        tableName: 'PERSON',
      }),
    );

    expect(accessor).toBeInstanceOf(RelationalStoreAccessor);
    expect(accessor.accessor).toBe('PERSON');
    expect(accessor.schema).toBe('public');
    expect(accessor.parentElement).toBe(db);
    expect(accessor.relationType.columns).toHaveLength(2);
    expect(guaranteeNonNullable(accessor.relationType.columns[0]).name).toBe(
      'ID',
    );
    expect(guaranteeNonNullable(accessor.relationType.columns[1]).name).toBe(
      'NAME',
    );
  });

  test('maps relational data types to correct PrimitiveTypes', async () => {
    const db = createTestDatabase('test::MyDB', [
      {
        name: 'default',
        tables: [
          {
            name: 'TYPES_TABLE',
            columns: [
              { name: 'col_varchar', type: new VarChar(255) },
              { name: 'col_char', type: new Char(10) },
              { name: 'col_integer', type: new RelationalInteger() },
              { name: 'col_bigint', type: new RelationalBigInt() },
              { name: 'col_smallint', type: new SmallInt() },
              { name: 'col_tinyint', type: new TinyInt() },
              { name: 'col_float', type: new RelationalFloat() },
              { name: 'col_real', type: new Real() },
              { name: 'col_double', type: new Double() },
              { name: 'col_decimal', type: new RelationalDecimal(10, 2) },
              { name: 'col_numeric', type: new Numeric(10, 2) },
              { name: 'col_bit', type: new Bit() },
              { name: 'col_timestamp', type: new Timestamp() },
              { name: 'col_date', type: new RelationalDate() },
              { name: 'col_binary', type: new RelationalBinary(16) },
              { name: 'col_varbinary', type: new VarBinary(256) },
              { name: 'col_semi', type: new SemiStructured() },
              { name: 'col_json', type: new Json() },
              { name: 'col_other', type: new Other() },
            ],
          },
        ],
      },
    ]);

    const accessor = guaranteeNonNullable(
      await createAccessorFromPackageableElement(db, {
        schemaName: 'default',
        tableName: 'TYPES_TABLE',
      }),
    );

    const cols = accessor.relationType.columns;
    expect(cols).toHaveLength(19);

    const getType = (name: string) =>
      guaranteeNonNullable(cols.find((c) => c.name === name)).genericType.value
        .rawType;

    // String types
    expect(getType('col_varchar')).toBe(PrimitiveType.STRING);
    expect(getType('col_char')).toBe(PrimitiveType.STRING);
    expect(getType('col_semi')).toBe(PrimitiveType.STRING);
    expect(getType('col_json')).toBe(PrimitiveType.STRING);
    expect(getType('col_other')).toBe(PrimitiveType.STRING);

    // Integer types
    expect(getType('col_integer')).toBe(PrimitiveType.INTEGER);
    expect(getType('col_bigint')).toBe(PrimitiveType.INTEGER);
    expect(getType('col_smallint')).toBe(PrimitiveType.INTEGER);
    expect(getType('col_tinyint')).toBe(PrimitiveType.INTEGER);

    // Float types
    expect(getType('col_float')).toBe(PrimitiveType.FLOAT);
    expect(getType('col_real')).toBe(PrimitiveType.FLOAT);

    // Number (Double)
    expect(getType('col_double')).toBe(PrimitiveType.NUMBER);

    // Decimal types
    expect(getType('col_decimal')).toBe(PrimitiveType.DECIMAL);
    expect(getType('col_numeric')).toBe(PrimitiveType.DECIMAL);

    // Boolean
    expect(getType('col_bit')).toBe(PrimitiveType.BOOLEAN);

    // Date/Time types
    expect(getType('col_timestamp')).toBe(PrimitiveType.DATETIME);
    expect(getType('col_date')).toBe(PrimitiveType.STRICTDATE);

    // Binary types
    expect(getType('col_binary')).toBe(PrimitiveType.BINARY);
    expect(getType('col_varbinary')).toBe(PrimitiveType.BINARY);
  });

  test('returns undefined when schema does not exist', async () => {
    const db = createTestDatabase('test::MyDB', [
      {
        name: 'public',
        tables: [
          {
            name: 'T',
            columns: [{ name: 'id', type: new RelationalInteger() }],
          },
        ],
      },
    ]);

    const accessor = await createAccessorFromPackageableElement(db, {
      schemaName: 'nonexistent',
      tableName: 'T',
    });

    expect(accessor).toBeUndefined();
  });

  test('returns undefined when table does not exist', async () => {
    const db = createTestDatabase('test::MyDB', [
      {
        name: 'public',
        tables: [
          {
            name: 'T',
            columns: [{ name: 'id', type: new RelationalInteger() }],
          },
        ],
      },
    ]);

    const accessor = await createAccessorFromPackageableElement(db, {
      schemaName: 'public',
      tableName: 'nonexistent',
    });

    expect(accessor).toBeUndefined();
  });

  test('accessor path and labels are correct', async () => {
    const db = createTestDatabase('test::MyDB', [
      {
        name: 'mySchema',
        tables: [
          {
            name: 'myTable',
            columns: [{ name: 'id', type: new RelationalInteger() }],
          },
        ],
      },
    ]);

    const accessor = (await createAccessorFromPackageableElement(db, {
      schemaName: 'mySchema',
      tableName: 'myTable',
    })) as RelationalStoreAccessor;

    expect(accessor.accessorOwnerLabel).toBe('Relational Database');
    expect(accessor.accessorLabel).toBe('Table');
    expect(accessor.schemaLabel).toBe('Schema');
    expect(accessor.path).toEqual(['MyDB', 'mySchema', 'myTable']);
  });

  test('handles multiple schemas and tables', async () => {
    const db = createTestDatabase('test::MyDB', [
      {
        name: 'schema1',
        tables: [
          {
            name: 'TABLE_A',
            columns: [{ name: 'a', type: new VarChar(100) }],
          },
        ],
      },
      {
        name: 'schema2',
        tables: [
          {
            name: 'TABLE_B',
            columns: [
              { name: 'b1', type: new RelationalInteger() },
              { name: 'b2', type: new RelationalDate() },
            ],
          },
          {
            name: 'TABLE_C',
            columns: [{ name: 'c', type: new Bit() }],
          },
        ],
      },
    ]);

    const accessorA = guaranteeNonNullable(
      await createAccessorFromPackageableElement(db, {
        schemaName: 'schema1',
        tableName: 'TABLE_A',
      }),
    );
    expect(accessorA.relationType.columns).toHaveLength(1);
    expect(guaranteeNonNullable(accessorA.relationType.columns[0]).name).toBe(
      'a',
    );

    const accessorB = guaranteeNonNullable(
      await createAccessorFromPackageableElement(db, {
        schemaName: 'schema2',
        tableName: 'TABLE_B',
      }),
    );
    expect(accessorB.relationType.columns).toHaveLength(2);

    const accessorC = guaranteeNonNullable(
      await createAccessorFromPackageableElement(db, {
        schemaName: 'schema2',
        tableName: 'TABLE_C',
      }),
    );
    expect(accessorC.relationType.columns).toHaveLength(1);
    expect(
      guaranteeNonNullable(accessorC.relationType.columns[0]).genericType.value
        .rawType,
    ).toBe(PrimitiveType.BOOLEAN);
  });
});

// ──────────────────────────────────────────────────────────
// Accessor model classes tests
// ──────────────────────────────────────────────────────────

const makeRelationType = (): RelationType => {
  const rt = new RelationType('__test__');
  rt.columns = [
    new RelationColumn(
      'col1',
      GenericTypeExplicitReference.create(
        new GenericType(PrimitiveType.STRING),
      ),
    ),
  ];
  return rt;
};

describe(unitTest('Accessor model classes'), () => {
  test('DataProductAccessor has correct labels, schema, path, and hash', () => {
    const dp = new DataProduct('MyDP');
    const rt = makeRelationType();
    const accessor = new DataProductAccessor('MyDP', 'myGroup', 'myAP', rt, dp);

    expect(accessor.accessorOwnerLabel).toBe('Data Product');
    expect(accessor.accessorLabel).toBe('Access Point');
    expect(accessor.schemaLabel).toBe('Access Point Group');
    expect(accessor.path).toEqual(['MyDP', 'myAP']);
    expect(accessor.hashCode).toBeDefined();
    expect(typeof accessor.hashCode).toBe('string');
  });

  test('DataProductAccessor path omits schema when undefined', () => {
    const dp = new DataProduct('MyDP');
    const rt = makeRelationType();
    const accessor = new DataProductAccessor('MyDP', undefined, 'myAP', rt, dp);

    expect(accessor.path).toEqual(['MyDP', 'myAP']);
  });

  test('IngestionAccessor hashCode is a string', () => {
    const ingest = new IngestDefinition('MyIngest');
    const rt = makeRelationType();
    const accessor = new IngestionAccessor(
      'MyIngest',
      undefined,
      'ds1',
      rt,
      ingest,
    );

    expect(typeof accessor.hashCode).toBe('string');
    expect(accessor.hashCode.length).toBeGreaterThan(0);
  });

  test('AccessorInstanceValue stores values and computes hash', () => {
    const ingest = new IngestDefinition('MyIngest');
    const rt = makeRelationType();
    const accessor = new IngestionAccessor(
      'MyIngest',
      undefined,
      'ds1',
      rt,
      ingest,
    );

    const instanceValue = new AccessorInstanceValue();
    instanceValue.values = [accessor];

    expect(instanceValue.values).toHaveLength(1);
    expect(instanceValue.values[0]).toBe(accessor);
    expect(typeof instanceValue.hashCode).toBe('string');
    expect(instanceValue.hashCode.length).toBeGreaterThan(0);
  });

  test('AccessorInstanceValue with empty values has a hash', () => {
    const instanceValue = new AccessorInstanceValue();
    expect(instanceValue.values).toHaveLength(0);
    expect(typeof instanceValue.hashCode).toBe('string');
  });
});

describe(
  unitTest(
    'createAccessorFromPackageableElement — IngestDefinition (matview datasets)',
  ),
  () => {
    const createMatViewDataSet = (
      name: string,
      lambdaBody?: object,
    ): MatViewDataSet => ({
      name,
      source: {
        function: new RawLambda([], lambdaBody ?? {}),
      },
    });

    const createMockRelationTypeMetadata = (
      columns: { name: string; type: string }[],
    ): RelationTypeMetadata => {
      const metadata = new RelationTypeMetadata();
      metadata.columns = columns.map(
        (col) =>
          new RelationTypeColumnMetadata(
            col.type,
            col.name,
            new Multiplicity(1, 1),
          ),
      );
      return metadata;
    };

    test('creates IngestionAccessor from first matview dataset when no non-matview datasets exist and tableName not specified', async () => {
      const ingest = new IngestDefinition('MatviewIngest');
      // content has only the same datasets as the matview list (no non-matview)
      ingest.content = {
        datasets: [
          {
            name: 'matview_ds1',
            primaryKey: [],
            source: {
              _type: 'ingestSource',
              schema: { _type: 'schema', columns: [] },
            },
          },
          {
            name: 'matview_ds2',
            primaryKey: [],
            source: {
              _type: 'ingestSource',
              schema: { _type: 'schema', columns: [] },
            },
          },
        ],
      } as PlainObject;
      ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS = [
        createMatViewDataSet('matview_ds1'),
        createMatViewDataSet('matview_ds2'),
      ];

      const mockMetadata = createMockRelationTypeMetadata([
        { name: 'id', type: 'Integer' },
        { name: 'amount', type: 'Float' },
      ]);

      const spy = jest
        .spyOn(graphManagerState.graphManager, 'getLambdaRelationType')
        .mockResolvedValue(mockMetadata);

      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest),
      );

      expect(accessor).toBeInstanceOf(IngestionAccessor);
      expect(accessor.accessor).toBe('matview_ds1');
      expect(accessor.parentElement).toBe(ingest);
      expect(accessor.relationType.columns).toHaveLength(2);
      expect(guaranteeNonNullable(accessor.relationType.columns[0]).name).toBe(
        'id',
      );
      expect(guaranteeNonNullable(accessor.relationType.columns[1]).name).toBe(
        'amount',
      );
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS[0]?.source.function,
        graphManagerState.graph,
      );

      spy.mockRestore();
    });

    test('creates IngestionAccessor for a specific matview dataset by tableName', async () => {
      const ingest = new IngestDefinition('MatviewIngest');
      ingest.content = {} as PlainObject;
      ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS = [
        createMatViewDataSet('matview_ds1'),
        createMatViewDataSet('matview_ds2'),
      ];

      const mockMetadata = createMockRelationTypeMetadata([
        { name: 'name', type: 'String' },
        { name: 'active', type: 'Boolean' },
        { name: 'score', type: 'Decimal' },
      ]);

      const spy = jest
        .spyOn(graphManagerState.graphManager, 'getLambdaRelationType')
        .mockResolvedValue(mockMetadata);

      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest, {
          tableName: 'matview_ds2',
          schemaName: undefined,
        }),
      );

      expect(accessor).toBeInstanceOf(IngestionAccessor);
      expect(accessor.accessor).toBe('matview_ds2');
      expect(accessor.relationType.columns).toHaveLength(3);
      expect(guaranteeNonNullable(accessor.relationType.columns[0]).name).toBe(
        'name',
      );
      expect(guaranteeNonNullable(accessor.relationType.columns[1]).name).toBe(
        'active',
      );
      expect(guaranteeNonNullable(accessor.relationType.columns[2]).name).toBe(
        'score',
      );
      expect(spy).toHaveBeenCalledWith(
        ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS[1]?.source.function,
        graphManagerState.graph,
      );

      spy.mockRestore();
    });

    test('falls through to non-matview path when non-matview datasets exist and tableName not specified', async () => {
      const ingest = new IngestDefinition('MixedIngest');
      // content has both matview and non-matview datasets
      ingest.content = {
        datasets: [
          {
            name: 'regular_ds',
            primaryKey: [],
            source: {
              _type: 'ingestSource',
              schema: {
                _type: 'schema',
                columns: [
                  {
                    name: 'id',
                    genericType: {
                      rawType: {
                        _type: 'packageableType',
                        fullPath: 'Integer',
                      },
                    },
                    multiplicity: { lowerBound: 1, upperBound: 1 },
                  },
                ],
              },
            },
          },
          {
            name: 'matview_ds1',
            primaryKey: [],
            source: {
              _type: 'ingestSource',
              schema: { _type: 'schema', columns: [] },
            },
          },
        ],
      } as PlainObject;
      ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS = [
        createMatViewDataSet('matview_ds1'),
      ];

      const spy = jest.spyOn(
        graphManagerState.graphManager,
        'getLambdaRelationType',
      );

      // Should use the non-matview dataset (regular_ds) via the sync path
      const accessor = guaranteeNonNullable(
        await createAccessorFromPackageableElement(ingest),
      );

      expect(accessor).toBeInstanceOf(IngestionAccessor);
      // The sync path picks the first dataset in content.datasets
      expect(accessor.accessor).toBe('regular_ds');
      expect(accessor.relationType.columns).toHaveLength(1);
      expect(guaranteeNonNullable(accessor.relationType.columns[0]).name).toBe(
        'id',
      );
      // Should NOT have called getLambdaRelationType since it fell through
      expect(spy).not.toHaveBeenCalled();

      spy.mockRestore();
    });
  },
);
