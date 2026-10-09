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
import {
  dataProductAccessor,
  EmitRole,
  func,
  lambda,
  literal,
  storeAccessor,
} from '@finos/legend-cube';
import {
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_DataProductAccessor,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { V1_collectCubeStoreAccessors } from '../V1_CubeDirectModel.js';
import { V1_serializeCubeLambda } from '../V1_CubeLambdaSerializer.js';

// A data product's access point as Cube sends it (`#P{dp.ap}#`, PLAN §6.8):
// the shape legend-graph sends, which Query and Data Cube already send

const PATH = ['a::sales::Orders', 'daily'] as const;

const ACCESSOR = dataProductAccessor(PATH, {
  nodeId: 'dataProduct101',
  role: EmitRole.ACCESSOR,
});

/** The JSON of the lambda's one expression */
const bodyOf = (json: PlainObject): PlainObject =>
  (json.body as PlainObject[])[0] as PlainObject;

const withoutSourceInformation = (json: unknown): unknown =>
  JSON.parse(
    JSON.stringify(json, (key, value: unknown) =>
      key === 'sourceInformation' ? undefined : value,
    ),
  );

describe("A data product's access point, as protocol JSON", () => {
  test('Is a P instance of one, stamped with its node on the instance only, with no parameters', () => {
    expect(bodyOf(V1_serializeCubeLambda(lambda([], [ACCESSOR])))).toEqual({
      _type: 'classInstance',
      type: 'P',
      multiplicity: { lowerBound: 1, upperBound: 1 },
      value: { path: ['a::sales::Orders', 'daily'], parameters: [] },
      sourceInformation: expect.objectContaining({
        sourceId: 'cube:dataProduct101:accessor',
      }),
    });
  });

  test('Takes the stamp of the call it is in when it has none of its own', () => {
    const body = bodyOf(
      V1_serializeCubeLambda(
        lambda(
          [],
          [
            func(
              'limit',
              [
                dataProductAccessor(PATH),
                literal({ kind: 'integer', value: '5' }),
              ],
              { nodeId: 'limit101', role: EmitRole.LIMIT },
            ),
          ],
        ),
      ),
    );
    const [accessor] = body.parameters as PlainObject[];
    expect(accessor?.sourceInformation).toEqual(
      expect.objectContaining({ sourceId: 'cube:limit101:limit' }),
    );
  });

  test("Is what legend-graph's serializer writes", () => {
    const value = new V1_DataProductAccessor();
    value.path = [...PATH];
    value.parameters = [];
    const instance = new V1_ClassInstance();
    instance.type = V1_ClassInstanceType.DATA_PRODUCT_ACCESSOR;
    instance.value = value;
    const cube = bodyOf(V1_serializeCubeLambda(lambda([], [ACCESSOR])));
    expect(withoutSourceInformation(cube)).toEqual(
      withoutSourceInformation(V1_serializeValueSpecification(instance, [])),
    );
    expect((cube.value as { path: string[] }).path).toHaveLength(2);
  });

  test("Is never taken for a relational table of a direct connection's model", () => {
    const table = storeAccessor(['cube::direct::Database', '"S"', '"T"']);
    expect(
      V1_collectCubeStoreAccessors(
        lambda([], [func('join', [ACCESSOR, table])]),
      ),
    ).toEqual([['cube::direct::Database', '"S"', '"T"']]);
  });
});
