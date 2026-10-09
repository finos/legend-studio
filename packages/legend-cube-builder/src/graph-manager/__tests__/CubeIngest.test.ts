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
import { CubeDataProductEnvironmentType } from '../CubeDataProduct.js';
import {
  checkCubeIngestModel,
  createCubeIngestModel,
  CUBE_INGEST_MODEL_TYPE,
  getCubeIngestSettings,
  isCubeIngestModel,
  parseCubeIngestUrn,
  withCubeIngestWarehouse,
} from '../CubeIngest.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

describe("An ingest cube's model", () => {
  test('Saves the class, the producer deployment and the warehouse once picked', () => {
    const model = createCubeIngestModel({
      environmentType: PRODUCTION,
      producerDeploymentId: '1234',
    });
    expect(model).toEqual({
      _type: CUBE_INGEST_MODEL_TYPE,
      environmentType: 'PRODUCTION',
      producerDeploymentId: '1234',
    });
    expect(isCubeIngestModel(model)).toBe(true);
    expect(getCubeIngestSettings(model)).toEqual({
      environmentType: PRODUCTION,
      producerDeploymentId: '1234',
      warehouse: undefined,
    });
    const onWarehouse = withCubeIngestWarehouse(model, 'SALES_WH');
    expect(getCubeIngestSettings(onWarehouse)?.warehouse).toBe('SALES_WH');
    expect(
      createCubeIngestModel({
        environmentType: PRODUCTION_PARALLEL,
        producerDeploymentId: '7',
        warehouse: 'W',
      }),
    ).toEqual({
      _type: CUBE_INGEST_MODEL_TYPE,
      environmentType: 'PRODUCTION_PARALLEL',
      producerDeploymentId: '7',
      warehouse: 'W',
    });
  });

  test('Says what is wrong with one Cube cannot use', () => {
    const model = (fields: Record<string, unknown>): ModelContext =>
      ({ _type: CUBE_INGEST_MODEL_TYPE, ...fields }) as ModelContext;
    expect(
      checkCubeIngestModel(
        model({
          environmentType: 'DEVELOPMENT',
          producerDeploymentId: 'me',
          warehouse: '',
        }),
      ),
    ).toEqual([
      `Cube doesn't know the environment type "DEVELOPMENT"`,
      `The cube's producer deployment must be a deployment id`,
      `The cube's warehouse must be a name`,
    ]);
    expect(
      checkCubeIngestModel(
        model({ environmentType: 'PRODUCTION', producerDeploymentId: 12 }),
      ),
    ).toEqual([`The cube's producer deployment must be a deployment id`]);
    expect(
      getCubeIngestSettings(model({ environmentType: 'PRODUCTION' })),
    ).toBeUndefined();
    expect(
      getCubeIngestSettings({
        _type: 'cubeDataProduct',
        environmentType: 'PRODUCTION',
        producerDeploymentId: '1',
      } as ModelContext),
    ).toBeUndefined();
  });
});

describe("A deployed ingest definition's URN", () => {
  test('Names the class, the project and the definition of an SDLC-deployed one', () => {
    expect(
      parseCubeIngestUrn(
        'urn:lakehouse:prod:ingest:definition:alloy-git:com.example~sales~sales::ingest::OrdersIngest',
      ),
    ).toEqual({
      environmentType: PRODUCTION,
      groupId: 'com.example',
      artifactId: 'sales',
      definition: 'sales::ingest::OrdersIngest',
    });
    expect(
      parseCubeIngestUrn(
        'urn:lakehouse:prod-parallel:ingest:definition:alloy-git:g~a~p::I',
      )?.environmentType,
    ).toBe(PRODUCTION_PARALLEL);
  });

  test.each([
    'urn:lakehouse:prod:ingest:definition:rest-api:1234~5678~p::I',
    'urn:lakehouse:prod:ingest:definition:rest-api:someone~p::I',
    'urn:lakehouse:non-prod:ingest:definition:alloy-git:g~a~p::I',
    'urn:lakehouse:constructor:ingest:definition:alloy-git:g~a~p::I',
    'urn:lakehouse:prod:ingest:definition:alloy-git:g~a',
    'p::I',
    '',
  ])(
    'Names nothing for an ad hoc, unknown-class or malformed URN: %s',
    (urn) => {
      expect(parseCubeIngestUrn(urn)).toBeUndefined();
    },
  );
});
