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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  V1_DatabaseDDL,
  V1_DataProductArtifact,
  V1_FunctionAccessPoint,
  V1_serializeResourceBuilder,
  V1_UnknownResourceBuilder,
} from '../V1_DataProductArtifact.js';

const TEST_DATA__databaseDDL = {
  _type: 'databaseDDL',
  reproducible: false,
  targetEnvironment: 'Snowflake',
  script: 'CREATE VIEW POSITIONS AS SELECT 1',
  resourceType: 'VIEW',
};

const TEST_DATA__functionAccessPoint = {
  _type: 'functionAccessPoint',
  functionGrammar: '|1',
};

const buildArtifactJson = (resourceBuilder?: unknown) => ({
  dataProduct: {
    path: 'test::DataProduct',
    deploymentId: '11111',
  },
  accessPointGroups: [
    {
      id: 'group',
      accessPointImplementations: [
        {
          id: 'positions',
          ...(resourceBuilder === undefined ? {} : { resourceBuilder }),
          dependencyDatasets: [],
          dependencyAccessPoints: [],
        },
      ],
    },
  ],
});

const getResourceBuilders = (json: ReturnType<typeof buildArtifactJson>) =>
  V1_DataProductArtifact.serialization.fromJson(json).accessPointGroups[0]
    ?.accessPointImplementations[0]?.resourceBuilder;

describe('V1_AccessPointImplementation resourceBuilder', () => {
  test(unitTest('deserializes a list of resource builders'), () => {
    const resourceBuilders = getResourceBuilders(
      buildArtifactJson([
        TEST_DATA__databaseDDL,
        TEST_DATA__functionAccessPoint,
      ]),
    );
    expect(resourceBuilders).toHaveLength(2);
    expect(resourceBuilders?.[0]).toBeInstanceOf(V1_DatabaseDDL);
    expect((resourceBuilders?.[0] as V1_DatabaseDDL).script).toBe(
      'CREATE VIEW POSITIONS AS SELECT 1',
    );
    expect(resourceBuilders?.[1]).toBeInstanceOf(V1_FunctionAccessPoint);
  });

  test(
    unitTest('deserializes a missing or null resource builder as empty'),
    () => {
      expect(getResourceBuilders(buildArtifactJson())).toEqual([]);
      expect(getResourceBuilders(buildArtifactJson(null))).toEqual([]);
    },
  );

  test(
    unitTest('deserializes resource builders of unknown type without failing'),
    () => {
      const unknownTypeJson = { _type: 'somethingNew', foo: 'bar' };
      const noTypeJson = { foo: 'bar' };
      const resourceBuilders = getResourceBuilders(
        buildArtifactJson([
          TEST_DATA__databaseDDL,
          unknownTypeJson,
          noTypeJson,
        ]),
      );
      expect(resourceBuilders).toHaveLength(3);
      expect(resourceBuilders?.[0]).toBeInstanceOf(V1_DatabaseDDL);
      expect(resourceBuilders?.[1]).toBeInstanceOf(V1_UnknownResourceBuilder);
      expect((resourceBuilders?.[1] as V1_UnknownResourceBuilder).content).toBe(
        unknownTypeJson,
      );
      expect(resourceBuilders?.[2]).toBeInstanceOf(V1_UnknownResourceBuilder);
      expect(
        V1_serializeResourceBuilder(
          resourceBuilders?.[1] as V1_UnknownResourceBuilder,
        ),
      ).toBe(unknownTypeJson);
    },
  );
});

// NOTE: artifacts generated before the resource builder became a list carry a
// single resource builder object, these must keep loading
describe('V1_AccessPointImplementation resourceBuilder (legacy singular)', () => {
  test(
    unitTest('deserializes a singular databaseDDL as a one-element list'),
    () => {
      const resourceBuilders = getResourceBuilders(
        buildArtifactJson({
          ...TEST_DATA__databaseDDL,
          classification: 'DP10',
        }),
      );
      expect(resourceBuilders).toHaveLength(1);
      expect(resourceBuilders?.[0]).toBeInstanceOf(V1_DatabaseDDL);
      const ddl = resourceBuilders?.[0] as V1_DatabaseDDL;
      expect(ddl.reproducible).toBe(false);
      expect(ddl.targetEnvironment).toBe('Snowflake');
      expect(ddl.script).toBe('CREATE VIEW POSITIONS AS SELECT 1');
      expect(ddl.resourceType).toBe('VIEW');
      expect(ddl.classification).toBe('DP10');
    },
  );

  test(
    unitTest(
      'deserializes a singular functionAccessPoint as a one-element list',
    ),
    () => {
      const resourceBuilders = getResourceBuilders(
        buildArtifactJson(TEST_DATA__functionAccessPoint),
      );
      expect(resourceBuilders).toHaveLength(1);
      expect(resourceBuilders?.[0]).toBeInstanceOf(V1_FunctionAccessPoint);
      expect(
        (resourceBuilders?.[0] as V1_FunctionAccessPoint).functionGrammar,
      ).toBe('|1');
    },
  );

  test(
    unitTest('deserializes a singular resource builder of unknown type'),
    () => {
      const unknownTypeJson = { _type: 'somethingNew', foo: 'bar' };
      const resourceBuilders = getResourceBuilders(
        buildArtifactJson(unknownTypeJson),
      );
      expect(resourceBuilders).toHaveLength(1);
      expect(resourceBuilders?.[0]).toBeInstanceOf(V1_UnknownResourceBuilder);
      expect((resourceBuilders?.[0] as V1_UnknownResourceBuilder).content).toBe(
        unknownTypeJson,
      );
    },
  );

  test(
    unitTest(
      'deserializes an artifact mixing singular and list resource builders',
    ),
    () => {
      const artifact = V1_DataProductArtifact.serialization.fromJson({
        dataProduct: { path: 'test::DataProduct', deploymentId: '11111' },
        accessPointGroups: [
          {
            id: 'group',
            accessPointImplementations: [
              { id: 'legacy', resourceBuilder: TEST_DATA__databaseDDL },
              {
                id: 'modern',
                resourceBuilder: [
                  TEST_DATA__databaseDDL,
                  TEST_DATA__functionAccessPoint,
                ],
              },
            ],
          },
        ],
      });
      const [legacy, modern] =
        artifact.accessPointGroups[0]?.accessPointImplementations ?? [];
      expect(legacy?.resourceBuilder).toHaveLength(1);
      expect(legacy?.resourceBuilder[0]).toBeInstanceOf(V1_DatabaseDDL);
      expect(modern?.resourceBuilder).toHaveLength(2);
      expect(modern?.resourceBuilder[1]).toBeInstanceOf(V1_FunctionAccessPoint);
    },
  );
});
