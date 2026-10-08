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
import type { PlainObject } from '@finos/legend-shared';
import {
  V1_AccessPointImplementation,
  V1_DatabaseDDL,
  V1_deserializeResourceBuilder,
  V1_FunctionAccessPoint,
  type V1_ResourceBuilder,
} from '../V1_DataProductArtifact.js';

const TEST_DATA__databaseDDL = {
  _type: 'databaseDDL',
  reproducible: false,
  targetEnvironment: 'Snowflake',
  script: 'CREATE VIEW v AS SELECT 1;',
  resourceType: 'VIEW',
};

const TEST_DATA__functionAccessPoint = {
  _type: 'functionAccessPoint',
  functionGrammar: 'model::myFunction__TabularDataSet_1_',
};

describe(unitTest('V1_ResourceBuilder deserialization'), () => {
  test('builds the known resource builder types', () => {
    const ddl = V1_deserializeResourceBuilder(TEST_DATA__databaseDDL);
    expect(ddl).toBeInstanceOf(V1_DatabaseDDL);
    expect((ddl as V1_DatabaseDDL).script).toBe('CREATE VIEW v AS SELECT 1;');
    expect(
      V1_deserializeResourceBuilder(TEST_DATA__functionAccessPoint),
    ).toBeInstanceOf(V1_FunctionAccessPoint);
  });

  test('fails on a resource builder of an unsupported type', () => {
    expect(() =>
      V1_deserializeResourceBuilder({ _type: 'someNewResourceBuilder' }),
    ).toThrow(`Unknown V1_ResourceBuilder type: someNewResourceBuilder`);
  });
});

describe(
  unitTest('V1_AccessPointImplementation resource builder deserialization'),
  () => {
    test('builds a resource builder carried as a single object', () => {
      const implementation =
        V1_AccessPointImplementation.serialization.fromJson({
          id: 'positions',
          resourceBuilder: TEST_DATA__databaseDDL,
        });
      expect(implementation.id).toBe('positions');
      expect(implementation.resourceBuilders).toHaveLength(1);
      const ddl = implementation.resourceBuilders[0];
      expect(ddl).toBeInstanceOf(V1_DatabaseDDL);
      expect((ddl as V1_DatabaseDDL).script).toBe('CREATE VIEW v AS SELECT 1;');
      expect((ddl as V1_DatabaseDDL).targetEnvironment).toBe('Snowflake');
      expect((ddl as V1_DatabaseDDL).resourceType).toBe('VIEW');
    });

    test('builds resource builders carried as a list', () => {
      const implementation =
        V1_AccessPointImplementation.serialization.fromJson({
          id: 'positions',
          resourceBuilder: [
            TEST_DATA__databaseDDL,
            TEST_DATA__functionAccessPoint,
          ],
        });
      expect(implementation.resourceBuilders).toHaveLength(2);
      expect(implementation.resourceBuilders[0]).toBeInstanceOf(V1_DatabaseDDL);
      expect(implementation.resourceBuilders[1]).toBeInstanceOf(
        V1_FunctionAccessPoint,
      );
      expect(
        (implementation.resourceBuilders[1] as V1_FunctionAccessPoint)
          .functionGrammar,
      ).toBe('model::myFunction__TabularDataSet_1_');
    });

    test('builds the object form and the single-element list form alike', () => {
      const fromObject = V1_AccessPointImplementation.serialization.fromJson({
        id: 'positions',
        resourceBuilder: TEST_DATA__databaseDDL,
      });
      const fromList = V1_AccessPointImplementation.serialization.fromJson({
        id: 'positions',
        resourceBuilder: [TEST_DATA__databaseDDL],
      });
      expect(fromObject.resourceBuilders).toEqual(fromList.resourceBuilders);
    });

    test('builds no resource builder when the artifact carries none', () => {
      expect(
        V1_AccessPointImplementation.serialization.fromJson({ id: 'positions' })
          .resourceBuilders,
      ).toEqual([]);
      expect(
        V1_AccessPointImplementation.serialization.fromJson({
          id: 'positions',
          resourceBuilder: null,
        }).resourceBuilders,
      ).toEqual([]);
      expect(
        V1_AccessPointImplementation.serialization.fromJson({
          id: 'positions',
          resourceBuilder: [],
        }).resourceBuilders,
      ).toEqual([]);
    });
  },
);

describe(
  unitTest('V1_AccessPointImplementation resource builder serialization'),
  () => {
    /**
     * The prop schemas of these fields don't tolerate a missing value, so an
     * access point implementation can only be serialized with both of them set.
     */
    const TEST_DATA__serializableFields = {
      relationElement: { columns: [], paths: [], rows: [] },
      lambdaGenericType: {
        rawType: { _type: 'packageableType', fullPath: 'model::MyRelation' },
      },
    };

    const serializeWithResourceBuilder = (
      resourceBuilder?:
        | PlainObject<V1_ResourceBuilder>
        | PlainObject<V1_ResourceBuilder>[],
    ): PlainObject<V1_AccessPointImplementation> =>
      V1_AccessPointImplementation.serialization.toJson(
        V1_AccessPointImplementation.serialization.fromJson({
          id: 'positions',
          ...TEST_DATA__serializableFields,
          ...(resourceBuilder === undefined ? {} : { resourceBuilder }),
        }),
      );

    test('serializes a resource builder carried as a single object', () => {
      expect(
        serializeWithResourceBuilder(TEST_DATA__databaseDDL).resourceBuilder,
      ).toEqual([TEST_DATA__databaseDDL]);
    });

    test('serializes resource builders carried as a list, in order', () => {
      expect(
        serializeWithResourceBuilder([
          TEST_DATA__functionAccessPoint,
          TEST_DATA__databaseDDL,
        ]).resourceBuilder,
      ).toEqual([TEST_DATA__functionAccessPoint, TEST_DATA__databaseDDL]);
    });

    test('serializes the object form and the single-element list form alike', () => {
      expect(
        serializeWithResourceBuilder(TEST_DATA__databaseDDL).resourceBuilder,
      ).toEqual(
        serializeWithResourceBuilder([TEST_DATA__databaseDDL]).resourceBuilder,
      );
    });

    test('omits the field when there is no resource builder', () => {
      expect(serializeWithResourceBuilder()).not.toHaveProperty(
        'resourceBuilder',
      );
      expect(serializeWithResourceBuilder([])).not.toHaveProperty(
        'resourceBuilder',
      );
    });
  },
);
