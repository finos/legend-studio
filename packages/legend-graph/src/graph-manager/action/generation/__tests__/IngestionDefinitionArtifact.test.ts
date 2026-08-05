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

import { test, describe, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { UnsupportedOperationError } from '@finos/legend-shared';
import {
  IngestionArtifactAppDirProducer,
  IngestionArtifactDependentAccessPoint,
  IngestionArtifactDependentDataset,
  IngestionArtifactIngestDefinitionRef,
  IngestionArtifactKerberosProducer,
  IngestionArtifactMatViewImplementation,
  IngestionArtifactSQLQuery,
  IngestionArtifactStoreClusterKeys,
  IngestionDefinitionArtifact,
} from '../IngestionDefinitionArtifact.js';
import { RelationType } from '../../../../graph/metamodel/pure/packageableElements/relation/RelationType.js';

// --------------------------------
// Test data
// --------------------------------

const TEST_DATA__appDirIngestDefinitionRefJson = {
  path: 'model::ingest::Definition',
  producer: {
    _type: 'AppDir',
    appDirId: 12345,
  },
};

const TEST_DATA__kerberosIngestDefinitionRefJson = {
  path: 'model::ingest::Definition',
  producer: {
    _type: 'Kerberos',
    kerberos: 'svc-user',
  },
};

const TEST_DATA__sqlQueryJson = {
  _type: 'SQLExpression',
  sql: 'SELECT * FROM t',
};

const TEST_DATA__storeClusterKeysJson = {
  dataset: 'my_dataset',
  clusterKeys: ['col_a', 'col_b'],
};

const TEST_DATA__dependentDatasetJson = {
  schema: 'my_schema',
  dataset: 'my_dataset',
  ingestDefinition: TEST_DATA__appDirIngestDefinitionRefJson,
};

const TEST_DATA__dependentAccessPointJson = {
  accessPoint: 'my_access_point',
  dataProduct: {
    path: 'model::MyDataProduct',
    deploymentId: 'deployment-1',
    description: 'A data product',
    title: 'My Data Product',
  },
};

const TEST_DATA__relationTypeJson = {
  _type: 'RelationType',
  columns: [
    {
      name: 'id',
      genericType: {
        rawType: { _type: 'packageableType', fullPath: 'String' },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: { lowerBound: 1, upperBound: 1 },
    },
    {
      name: 'value',
      genericType: {
        rawType: { _type: 'packageableType', fullPath: 'Integer' },
        typeArguments: [],
        typeVariableValues: [],
      },
      multiplicity: { lowerBound: 0, upperBound: 1 },
    },
  ],
};

const TEST_DATA__matViewFullJson = {
  datasetName: 'DATASET_A',
  refreshType: 'INCREMENTAL',
  autoTrigger: true,
  primaryKey: ['id', 'version'],
  dependentDatasets: [TEST_DATA__dependentDatasetJson],
  dependentAccessPoints: [TEST_DATA__dependentAccessPointJson],
  viewFunctionQuery: TEST_DATA__sqlQueryJson,
  barrierQuery: { _type: 'SQLExpression', sql: 'SELECT barrier FROM t' },
  selectQuery: { _type: 'SQLExpression', sql: 'SELECT sel FROM t' },
  schema: TEST_DATA__relationTypeJson,
};

const TEST_DATA__matViewMinimalJson = {
  datasetName: 'DATASET_B',
  refreshType: 'FULL',
  autoTrigger: false,
  primaryKey: [],
  dependentDatasets: [],
  dependentAccessPoints: [],
  viewFunctionQuery: TEST_DATA__sqlQueryJson,
};

const TEST_DATA__ingestionDefinitionArtifactJson = {
  ingestDefinition: TEST_DATA__appDirIngestDefinitionRefJson,
  storeClusterKeys: [TEST_DATA__storeClusterKeysJson],
  matViewImplementations: [
    TEST_DATA__matViewFullJson,
    TEST_DATA__matViewMinimalJson,
  ],
};

// --------------------------------
// Producer roundtrips
// --------------------------------

describe(unitTest('IngestionArtifactProducer serialization roundtrip'), () => {
  test('AppDir producer roundtrip', () => {
    const ref = IngestionArtifactIngestDefinitionRef.serialization.fromJson(
      TEST_DATA__appDirIngestDefinitionRefJson,
    );
    expect(ref.path).toBe('model::ingest::Definition');
    expect(ref.producer).toBeInstanceOf(IngestionArtifactAppDirProducer);
    expect((ref.producer as IngestionArtifactAppDirProducer).appDirId).toBe(
      12345,
    );
    expect(
      IngestionArtifactIngestDefinitionRef.serialization.toJson(ref),
    ).toEqual(TEST_DATA__appDirIngestDefinitionRefJson);
  });

  test('Kerberos producer roundtrip', () => {
    const ref = IngestionArtifactIngestDefinitionRef.serialization.fromJson(
      TEST_DATA__kerberosIngestDefinitionRefJson,
    );
    expect(ref.path).toBe('model::ingest::Definition');
    expect(ref.producer).toBeInstanceOf(IngestionArtifactKerberosProducer);
    expect((ref.producer as IngestionArtifactKerberosProducer).kerberos).toBe(
      'svc-user',
    );
    expect(
      IngestionArtifactIngestDefinitionRef.serialization.toJson(ref),
    ).toEqual(TEST_DATA__kerberosIngestDefinitionRefJson);
  });

  test('unknown producer _type throws on deserialization', () => {
    expect(() =>
      IngestionArtifactIngestDefinitionRef.serialization.fromJson({
        path: 'model::ingest::Definition',
        producer: { _type: 'Unknown', foo: 'bar' },
      }),
    ).toThrow(UnsupportedOperationError);
  });
});

// --------------------------------
// Leaf model roundtrips
// --------------------------------

describe(unitTest('IngestionArtifact leaf model roundtrips'), () => {
  test('IngestionArtifactSQLQuery roundtrip', () => {
    const q = IngestionArtifactSQLQuery.serialization.fromJson(
      TEST_DATA__sqlQueryJson,
    );
    expect(q.sql).toBe('SELECT * FROM t');
    expect(IngestionArtifactSQLQuery.serialization.toJson(q)).toEqual(
      TEST_DATA__sqlQueryJson,
    );
  });

  test('IngestionArtifactStoreClusterKeys roundtrip', () => {
    const keys = IngestionArtifactStoreClusterKeys.serialization.fromJson(
      TEST_DATA__storeClusterKeysJson,
    );
    expect(keys.dataset).toBe('my_dataset');
    expect(keys.clusterKeys).toEqual(['col_a', 'col_b']);
    expect(
      IngestionArtifactStoreClusterKeys.serialization.toJson(keys),
    ).toEqual(TEST_DATA__storeClusterKeysJson);
  });

  test('IngestionArtifactDependentDataset roundtrip', () => {
    const dep = IngestionArtifactDependentDataset.serialization.fromJson(
      TEST_DATA__dependentDatasetJson,
    );
    expect(dep.schema).toBe('my_schema');
    expect(dep.dataset).toBe('my_dataset');
    expect(dep.ingestDefinition).toBeInstanceOf(
      IngestionArtifactIngestDefinitionRef,
    );
    expect(dep.ingestDefinition.producer).toBeInstanceOf(
      IngestionArtifactAppDirProducer,
    );
    expect(IngestionArtifactDependentDataset.serialization.toJson(dep)).toEqual(
      TEST_DATA__dependentDatasetJson,
    );
  });

  test('IngestionArtifactDependentAccessPoint roundtrip', () => {
    const dep = IngestionArtifactDependentAccessPoint.serialization.fromJson(
      TEST_DATA__dependentAccessPointJson,
    );
    expect(dep.accessPoint).toBe('my_access_point');
    expect(dep.dataProduct.path).toBe('model::MyDataProduct');
    expect(dep.dataProduct.deploymentId).toBe('deployment-1');
    expect(dep.dataProduct.description).toBe('A data product');
    expect(dep.dataProduct.title).toBe('My Data Product');
    expect(
      IngestionArtifactDependentAccessPoint.serialization.toJson(dep),
    ).toEqual(TEST_DATA__dependentAccessPointJson);
  });
});

// --------------------------------
// MatView roundtrips
// --------------------------------

describe(
  unitTest('IngestionArtifactMatViewImplementation serialization roundtrip'),
  () => {
    test('full mat view (with barrier + select queries) roundtrip', () => {
      const mv = IngestionArtifactMatViewImplementation.serialization.fromJson(
        TEST_DATA__matViewFullJson,
      );
      expect(mv.datasetName).toBe('DATASET_A');
      expect(mv.refreshType).toBe('INCREMENTAL');
      expect(mv.autoTrigger).toBe(true);
      expect(mv.primaryKey).toEqual(['id', 'version']);
      expect(mv.dependentDatasets).toHaveLength(1);
      expect(mv.dependentAccessPoints).toHaveLength(1);
      expect(mv.viewFunctionQuery).toBeInstanceOf(IngestionArtifactSQLQuery);
      expect(mv.viewFunctionQuery.sql).toBe('SELECT * FROM t');
      expect(mv.barrierQuery?.sql).toBe('SELECT barrier FROM t');
      expect(mv.selectQuery?.sql).toBe('SELECT sel FROM t');
      // `schema` is not part of the serializr schema — it is populated only
      // via the `buildRelationType` callback on `IngestionDefinitionArtifact.fromJson`.
      expect(mv.schema).toBeUndefined();
      const { schema: _ignored, ...matViewJsonWithoutSchema } =
        TEST_DATA__matViewFullJson;
      expect(
        IngestionArtifactMatViewImplementation.serialization.toJson(mv),
      ).toEqual(matViewJsonWithoutSchema);
    });

    test('minimal mat view (no barrier/select queries) roundtrip', () => {
      const mv = IngestionArtifactMatViewImplementation.serialization.fromJson(
        TEST_DATA__matViewMinimalJson,
      );
      expect(mv.datasetName).toBe('DATASET_B');
      expect(mv.refreshType).toBe('FULL');
      expect(mv.autoTrigger).toBe(false);
      expect(mv.primaryKey).toEqual([]);
      expect(mv.dependentDatasets).toEqual([]);
      expect(mv.dependentAccessPoints).toEqual([]);
      expect(mv.barrierQuery).toBeUndefined();
      expect(mv.selectQuery).toBeUndefined();
      expect(
        IngestionArtifactMatViewImplementation.serialization.toJson(mv),
      ).toEqual(TEST_DATA__matViewMinimalJson);
    });
  },
);

// --------------------------------
// IngestionDefinitionArtifact roundtrip
// --------------------------------

describe(
  unitTest('IngestionDefinitionArtifact serialization roundtrip'),
  () => {
    test('full artifact roundtrip via serialization.fromJson', () => {
      const artifact = IngestionDefinitionArtifact.serialization.fromJson(
        TEST_DATA__ingestionDefinitionArtifactJson,
      );
      expect(artifact.ingestDefinition).toBeInstanceOf(
        IngestionArtifactIngestDefinitionRef,
      );
      expect(artifact.ingestDefinition.path).toBe('model::ingest::Definition');
      expect(artifact.storeClusterKeys).toHaveLength(1);
      expect(artifact.matViewImplementations).toHaveLength(2);
      expect(artifact.matViewImplementations[0]?.datasetName).toBe('DATASET_A');
      expect(artifact.matViewImplementations[1]?.datasetName).toBe('DATASET_B');
      // `schema` on mat views is not part of the serializr schema, so the
      // roundtripped JSON will not carry it back.
      const { schema: _ignored, ...matViewFullJsonWithoutSchema } =
        TEST_DATA__matViewFullJson;
      expect(
        IngestionDefinitionArtifact.serialization.toJson(artifact),
      ).toEqual({
        ...TEST_DATA__ingestionDefinitionArtifactJson,
        matViewImplementations: [
          matViewFullJsonWithoutSchema,
          TEST_DATA__matViewMinimalJson,
        ],
      });
    });

    test('fromJson preserves original json on the content field', () => {
      const artifact = IngestionDefinitionArtifact.fromJson(
        TEST_DATA__ingestionDefinitionArtifactJson,
      );
      expect(artifact.content).toBe(TEST_DATA__ingestionDefinitionArtifactJson);
      expect(artifact.matViewImplementations).toHaveLength(2);
    });

    test('fromJson without buildRelationType leaves mat view schemas undefined', () => {
      const artifact = IngestionDefinitionArtifact.fromJson(
        TEST_DATA__ingestionDefinitionArtifactJson,
      );
      expect(artifact.matViewImplementations[0]?.schema).toBeUndefined();
      expect(artifact.matViewImplementations[1]?.schema).toBeUndefined();
    });

    test('fromJson invokes buildRelationType per mat view that carries a schema payload', () => {
      const calls: unknown[] = [];
      const builtRelationType = new RelationType(RelationType.ID);
      const artifact = IngestionDefinitionArtifact.fromJson(
        TEST_DATA__ingestionDefinitionArtifactJson,
        (rawSchema) => {
          calls.push(rawSchema);
          return builtRelationType;
        },
      );
      // Only the first mat view has a `schema` payload in the fixture; the
      // second one omits it and should not trigger the builder.
      expect(calls).toHaveLength(1);
      expect(calls[0]).toBe(TEST_DATA__relationTypeJson);
      expect(artifact.matViewImplementations[0]?.schema).toBe(
        builtRelationType,
      );
      expect(artifact.matViewImplementations[1]?.schema).toBeUndefined();
    });

    test('fromJson swallows errors from buildRelationType and leaves schema undefined', () => {
      const artifact = IngestionDefinitionArtifact.fromJson(
        TEST_DATA__ingestionDefinitionArtifactJson,
        () => {
          throw new Error('unresolved type');
        },
      );
      expect(artifact.matViewImplementations[0]?.schema).toBeUndefined();
      expect(artifact.matViewImplementations[1]?.schema).toBeUndefined();
    });

    test('empty artifact roundtrip', () => {
      const json = {
        ingestDefinition: TEST_DATA__appDirIngestDefinitionRefJson,
        storeClusterKeys: [],
        matViewImplementations: [],
      };
      const artifact = IngestionDefinitionArtifact.serialization.fromJson(json);
      expect(artifact.storeClusterKeys).toEqual([]);
      expect(artifact.matViewImplementations).toEqual([]);
      expect(
        IngestionDefinitionArtifact.serialization.toJson(artifact),
      ).toEqual(json);
    });
  },
);
