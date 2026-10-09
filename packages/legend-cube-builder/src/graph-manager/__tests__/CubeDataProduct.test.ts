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

import { describe, expect, test } from '@jest/globals';
import type { ModelContext } from '@finos/legend-cube';
import {
  checkCubeDataProductModel,
  createCubeDataProductModel,
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
  getCubeDataProductProject,
  getEffectiveCubeWarehouse,
} from '../CubeDataProduct.js';

const MODEL = createCubeDataProductModel({
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.0.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
});

const withField = (key: string, value: unknown): ModelContext =>
  ({ ...MODEL, [key]: value }) as ModelContext;

describe("A data product cube's model", () => {
  test('Holds the project, its version and the environment type, and a warehouse once picked', () => {
    expect(MODEL).toEqual({
      _type: 'cubeDataProduct',
      groupId: 'com.example.sales',
      artifactId: 'orders-products',
      versionId: '1.0.0',
      environmentType: 'PRODUCTION',
    });
    expect(
      createCubeDataProductModel({
        ...(getCubeDataProductProject(MODEL) as NonNullable<
          ReturnType<typeof getCubeDataProductProject>
        >),
        warehouse: 'SALES_WH',
      }).warehouse,
    ).toBe('SALES_WH');
    expect(checkCubeDataProductModel(MODEL)).toEqual([]);
  });

  test.each(['groupId', 'artifactId', 'versionId'])(
    'Refuses a model without a %s, or with one that is not a name',
    (key) => {
      [undefined, '', 1].forEach((value) => {
        const model = withField(key, value);
        expect(checkCubeDataProductModel(model)).toEqual([
          `The data product's project has no ${key}`,
        ]);
        expect(getCubeDataProductProject(model)).toBeUndefined();
      });
    },
  );

  test('Refuses an environment type it does not know, naming it, and never takes it for production', () => {
    expect(
      checkCubeDataProductModel(withField('environmentType', 'QA')),
    ).toEqual([`Cube doesn't know the environment type "QA"`]);
    expect(
      checkCubeDataProductModel(withField('environmentType', undefined)),
    ).toEqual([`Cube doesn't know the environment type "undefined"`]);
    expect(
      getCubeDataProductProject(withField('environmentType', 'production')),
    ).toBeUndefined();
  });

  test('Runs a saved development cube as development', () => {
    expect(
      getCubeDataProductProject(withField('environmentType', 'DEVELOPMENT'))
        ?.environmentType,
    ).toBe(CubeDataProductEnvironmentType.DEVELOPMENT);
  });

  test('Refuses a warehouse that is not a name', () => {
    [null, '', 3].forEach((value) =>
      expect(checkCubeDataProductModel(withField('warehouse', value))).toEqual([
        `The cube's warehouse must be a name`,
      ]),
    );
  });

  test('Is no data product model when it is another kind', () => {
    expect(
      getCubeDataProductProject({ _type: 'text', code: '' }),
    ).toBeUndefined();
  });

  test("Runs on the cube's warehouse, else the viewer's last, else the default", () => {
    expect(getEffectiveCubeWarehouse({ warehouse: 'CUBE_WH' }, 'MY_WH')).toBe(
      'CUBE_WH',
    );
    expect(getEffectiveCubeWarehouse({}, 'MY_WH')).toBe('MY_WH');
    expect(getEffectiveCubeWarehouse({}, undefined)).toBe(
      CUBE_DEFAULT_CONSUMER_WAREHOUSE,
    );
    expect(getEffectiveCubeWarehouse({}, '')).toBe(
      CUBE_DEFAULT_CONSUMER_WAREHOUSE,
    );
    expect(CUBE_DEFAULT_CONSUMER_WAREHOUSE).toBe(
      'LAKEHOUSE_CONSUMER_DEFAULT_WH',
    );
  });
});
