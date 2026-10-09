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
  EmitRole,
  func,
  ingestAccessor,
  lambda,
  literal,
  storeAccessor,
} from '@finos/legend-cube';
import {
  V1_ClassInstance,
  V1_ClassInstanceType,
  V1_IngestDefinitionAccessor,
  V1_serializeValueSpecification,
} from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import { V1_hasCubeDataProductAccessor } from '../V1_CubeDataProductModel.js';
import { V1_collectCubeStoreAccessors } from '../V1_CubeDirectModel.js';
import { V1_serializeCubeLambda } from '../V1_CubeLambdaSerializer.js';

// An ingest definition's data set as Cube sends it (`#I{definition.dataSet}#`):
// the shape legend-graph sends, which Legend Query's ingest queries already
// send to the engine

const PATH = ['a::sales::OrdersIngest', 'TRADES'] as const;

const ACCESSOR = ingestAccessor(PATH, {
  nodeId: 'ingest101',
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

describe("An ingest definition's data set, as protocol JSON", () => {
  test('Is an I instance of one, stamped with its node on the instance only, reading data, not metadata', () => {
    expect(bodyOf(V1_serializeCubeLambda(lambda([], [ACCESSOR])))).toEqual({
      _type: 'classInstance',
      type: 'I',
      multiplicity: { lowerBound: 1, upperBound: 1 },
      value: { path: ['a::sales::OrdersIngest', 'TRADES'], metadata: false },
      sourceInformation: expect.objectContaining({
        sourceId: 'cube:ingest101:accessor',
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
              [ingestAccessor(PATH), literal({ kind: 'integer', value: '5' })],
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
    const value = new V1_IngestDefinitionAccessor();
    value.path = [...PATH];
    const instance = new V1_ClassInstance();
    instance.type = V1_ClassInstanceType.INGEST_ACCESSOR;
    instance.value = value;
    const cube = bodyOf(V1_serializeCubeLambda(lambda([], [ACCESSOR])));
    expect(withoutSourceInformation(cube)).toEqual(
      withoutSourceInformation(V1_serializeValueSpecification(instance, [])),
    );
    expect((cube.value as { path: string[] }).path).toHaveLength(2);
  });

  test("Is never taken for a direct connection's table or a data product's access point", () => {
    const table = storeAccessor(['cube::direct::Database', '"S"', '"T"']);
    const both = lambda([], [func('join', [ACCESSOR, table])]);
    expect(V1_collectCubeStoreAccessors(both)).toEqual([
      ['cube::direct::Database', '"S"', '"T"'],
    ]);
    expect(V1_hasCubeDataProductAccessor(lambda([], [ACCESSOR]))).toBe(false);
  });
});
