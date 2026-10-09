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

import { beforeAll, describe, expect, test } from '@jest/globals';
import {
  V1_LakehouseRuntime,
  V1_LegendSDLC,
  V1_PackageableRuntime,
  V1_PureModelContextPointer,
  V1_serializePackageableElement,
  V1_serializePureModelContext,
  V1_setupEngineRuntimeSerialization,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import {
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  type CubeDataProductProject,
  CubeDataProductEnvironmentType,
} from '../../../../CubeDataProduct.js';
import {
  V1_buildCubeDataProductExecutionContext,
  V1_buildCubeDataProductTypingContext,
} from '../V1_CubeDataProductModel.js';

const PROJECT: CubeDataProductProject = {
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.0.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
  warehouse: 'SALES_WH',
};

/**
 * What legend-graph writes for the same model, as Data Cube builds it: its
 * pointer and its runtime element, each through legend-graph's serializer
 * (the whole data context's needs a setup legend-graph doesn't export)
 */
const legendGraphContext = (
  project: CubeDataProductProject,
  environment: string,
  warehouse: string,
): PlainObject => {
  const runtime = new V1_LakehouseRuntime();
  runtime.environment = environment;
  runtime.warehouse = warehouse;
  const element = new V1_PackageableRuntime();
  element.package = 'cube::dataProduct';
  element.name = 'Runtime';
  element.runtimeValue = runtime;
  return {
    _type: 'combination',
    contexts: [
      V1_serializePureModelContext(
        new V1_PureModelContextPointer(
          undefined,
          new V1_LegendSDLC(
            project.groupId,
            project.artifactId,
            project.versionId,
          ),
        ),
      ),
      {
        _type: 'data',
        elements: [V1_serializePackageableElement(element, [])],
      },
    ],
  };
};

describe("A data product cube's models", () => {
  beforeAll(() => {
    // as legend-graph's graph manager does before its first serialization
    V1_setupEngineRuntimeSerialization([]);
  });

  test("Runs on the project at its saved version, then a lakehouse runtime at Cube's own path", () => {
    expect(
      V1_buildCubeDataProductExecutionContext(PROJECT, 'prod-env', 'SALES_WH'),
    ).toEqual({
      _type: 'combination',
      contexts: [
        {
          _type: 'pointer',
          sdlcInfo: {
            _type: 'alloy',
            baseVersion: 'latest',
            version: '1.0.0',
            packageableElementPointers: [],
            groupId: 'com.example.sales',
            artifactId: 'orders-products',
          },
        },
        {
          _type: 'data',
          elements: [
            {
              _type: 'runtime',
              package: 'cube::dataProduct',
              name: 'Runtime',
              runtimeValue: {
                _type: 'LakehouseRuntime',
                connectionStores: [],
                connections: [],
                mappings: [],
                environment: 'prod-env',
                warehouse: 'SALES_WH',
              },
            },
          ],
        },
      ],
    });
  });

  test('Is what legend-graph writes for the same model', () => {
    expect(
      V1_buildCubeDataProductExecutionContext(PROJECT, 'prod-env', 'SALES_WH'),
    ).toEqual(legendGraphContext(PROJECT, 'prod-env', 'SALES_WH'));
  });

  test('Sends the saved version as it is, a snapshot one included', () => {
    ['1.0.0', 'feature-returns-SNAPSHOT'].forEach((versionId) => {
      const project = { ...PROJECT, versionId };
      const [pointer] = V1_buildCubeDataProductExecutionContext(
        project,
        'env',
        'WH',
      ).contexts as PlainObject[] as [PlainObject];
      expect((pointer.sdlcInfo as PlainObject).version).toBe(versionId);
      expect(
        (V1_buildCubeDataProductTypingContext(project).sdlcInfo as PlainObject)
          .version,
      ).toBe(versionId);
    });
  });

  test("Holds exactly one element besides the project: the runtime, at Cube's own path, with a warehouse", () => {
    const [, data] = V1_buildCubeDataProductExecutionContext(
      PROJECT,
      'env',
      'WH',
    ).contexts as [PlainObject, PlainObject];
    const elements = data.elements as PlainObject[];
    expect(elements).toHaveLength(1);
    const [runtime] = elements as [PlainObject];
    expect(`${runtime.package as string}::${runtime.name as string}`).toBe(
      CUBE_DATA_PRODUCT_RUNTIME_PATH,
    );
    // a project element at this path would win over it, so it is Cube's own
    expect(CUBE_DATA_PRODUCT_RUNTIME_PATH.startsWith('cube::')).toBe(true);
    expect((runtime.runtimeValue as PlainObject).warehouse).toBe('WH');
  });

  test('Types on the project alone, with no environment or warehouse', () => {
    expect(V1_buildCubeDataProductTypingContext(PROJECT)).toEqual({
      _type: 'pointer',
      sdlcInfo: {
        _type: 'alloy',
        baseVersion: 'latest',
        version: '1.0.0',
        packageableElementPointers: [],
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
      },
    });
  });
});
