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

import { serialize, deserialize } from 'serializr';
import { V1_DataProductOriginType } from '@finos/legend-graph';
import { it, expect, describe } from '@jest/globals';
import {
  RawLakehouseConsumerDataCubeSource,
  RawLakehouseSdlcOrigin,
  RawLakehouseAdhocOrigin,
} from '../../stores/model/LakehouseConsumerDataCubeSource.js';
import type { PlainObject } from '@finos/legend-shared';

describe('RawLakehouseConsumerDataCubeSource serialization', () => {
  const baseSetup = () => {
    const source = new RawLakehouseConsumerDataCubeSource();
    source.warehouse = 'WH_TEST';
    source.environment = 'dev';
    source.paths = ['dp1', 'ap1'];
    source.deploymentId = 42;
    return source;
  };

  it('serializes and deserializes correctly with dpCoordinates (backward compat)', () => {
    // 👇 simulate old JSON with only dpCoordinates at top level
    const json = {
      _type: 'lakehouseConsumer',
      warehouse: 'WH_TEST',
      environment: 'dev',
      paths: ['dp1', 'ap1'],
      deploymentId: 42,
      dpCoordinates: {
        groupId: 'com.test',
        artifactId: 'dp',
        versionId: '1.0.0',
      },
    };

    const result = deserialize(
      RawLakehouseConsumerDataCubeSource.serialization.schema,
      json,
    );

    expect(result).toBeInstanceOf(RawLakehouseConsumerDataCubeSource);
    expect(result.origin).toBeInstanceOf(RawLakehouseSdlcOrigin);

    const origin = result.origin as RawLakehouseSdlcOrigin;
    expect(origin.dpCoordinates).toEqual({
      groupId: 'com.test',
      artifactId: 'dp',
      versionId: '1.0.0',
    });

    // ensure serialization matches new format
    const serialized = serialize(
      RawLakehouseConsumerDataCubeSource.serialization.schema,
      result,
    ) as PlainObject<RawLakehouseConsumerDataCubeSource>;
    expect(serialized.origin).toMatchObject({
      _type: V1_DataProductOriginType.SDLC_DEPLOYMENT,
      dpCoordinates: {
        groupId: 'com.test',
        artifactId: 'dp',
        versionId: '1.0.0',
      },
    });
  });

  it('serializes and deserializes correctly with SDLC origin (no dpCoordinates at top)', () => {
    const source = baseSetup();
    const sdlcOrigin = new RawLakehouseSdlcOrigin();
    sdlcOrigin.dpCoordinates = {
      groupId: 'com.test',
      artifactId: 'dp',
      versionId: '2.0.0',
    };
    source.origin = sdlcOrigin;

    const json = serialize(
      RawLakehouseConsumerDataCubeSource.serialization.schema,
      source,
    ) as PlainObject<RawLakehouseConsumerDataCubeSource>;

    expect(json.origin).toMatchObject({
      _type: V1_DataProductOriginType.SDLC_DEPLOYMENT,
      dpCoordinates: {
        groupId: 'com.test',
        artifactId: 'dp',
        versionId: '2.0.0',
      },
    });

    const result = deserialize(
      RawLakehouseConsumerDataCubeSource.serialization.schema,
      json,
    );

    expect(result.origin).toBeInstanceOf(RawLakehouseSdlcOrigin);
    const origin = result.origin as RawLakehouseSdlcOrigin;
    expect(origin.dpCoordinates).toEqual({
      groupId: 'com.test',
      artifactId: 'dp',
      versionId: '2.0.0',
    });
  });

  it('serializes and deserializes correctly with Adhoc origin', () => {
    const source = baseSetup();
    const adhocOrigin = new RawLakehouseAdhocOrigin();
    source.origin = adhocOrigin;

    const json = serialize(
      RawLakehouseConsumerDataCubeSource.serialization.schema,
      source,
    ) as PlainObject<RawLakehouseConsumerDataCubeSource>;

    expect(json.origin).toMatchObject({
      _type: V1_DataProductOriginType.AD_HOC_DEPLOYMENT,
    });

    const result = deserialize(
      RawLakehouseConsumerDataCubeSource.serialization.schema,
      json,
    );

    expect(result.origin).toBeInstanceOf(RawLakehouseAdhocOrigin);
  });
});
