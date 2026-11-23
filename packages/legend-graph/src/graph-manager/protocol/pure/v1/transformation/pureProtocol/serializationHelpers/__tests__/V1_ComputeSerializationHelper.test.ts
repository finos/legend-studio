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
import { deserialize, serialize } from 'serializr';
import { unitTest } from '@finos/legend-shared/test';
import { V1_computeModelSchema } from '../V1_ComputeSerializationHelper.js';
import {
  V1_ComputeSpecificationType,
  V1_SinglestoreComputeSpecification,
  V1_UnknownComputeSpecification,
} from '../../../../model/packageableElements/compute/V1_Compute.js';
import { SinglestoreClusterSize } from '../../../../../../../../graph/metamodel/pure/compute/Compute.js';

const computeJson = (specification: Record<string, unknown>) => ({
  _type: 'compute',
  name: 'Reader',
  package: 'test',
  owner: {
    _type: 'appDir',
    production: { appDirId: 12345, level: 'DEPLOYMENT' },
  },
  specification,
});

describe(unitTest('SingleStore compute specification serialization'), () => {
  test('round-trips a cluster size', () => {
    const json = computeJson({
      _type: V1_ComputeSpecificationType.SINGLESTORE,
      clusterSize: SinglestoreClusterSize.S_4,
    });

    const compute = deserialize(V1_computeModelSchema, json);

    expect(compute.specification).toBeInstanceOf(
      V1_SinglestoreComputeSpecification,
    );
    expect(
      (compute.specification as V1_SinglestoreComputeSpecification).clusterSize,
    ).toBe(SinglestoreClusterSize.S_4);
    expect(serialize(V1_computeModelSchema, compute)).toEqual(json);
  });

  test('keeps an omitted cluster size omitted', () => {
    const json = computeJson({
      _type: V1_ComputeSpecificationType.SINGLESTORE,
    });

    const compute = deserialize(V1_computeModelSchema, json);

    expect(serialize(V1_computeModelSchema, compute)).toEqual(json);
  });

  test('uses the protocol type the engine generates', () => {
    expect(V1_ComputeSpecificationType.SINGLESTORE).toBe(
      'singlestoreComputeSpecification',
    );
  });

  test('still preserves unknown specification types', () => {
    const compute = deserialize(
      V1_computeModelSchema,
      computeJson({ _type: 'otherComputeSpecification', x: 1 }),
    );
    expect(compute.specification).toBeInstanceOf(
      V1_UnknownComputeSpecification,
    );
  });

  test('hash changes with the cluster size', () => {
    const small = new V1_SinglestoreComputeSpecification();
    small.clusterSize = SinglestoreClusterSize.S_1;
    const large = new V1_SinglestoreComputeSpecification();
    large.clusterSize = SinglestoreClusterSize.S_2;
    expect(small.hashCode).not.toBe(large.hashCode);
  });
});
