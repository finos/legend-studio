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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  DataProductAccessType,
  V1_DataProductArtifact,
  V1_DataProductInfo,
  V1_ModelAccessPointGroupInfo,
  V1_NativeModelAccessInfo,
  V1_NativeModelExecutionContextInfo,
} from '@finos/legend-graph';
import { resolveDefaultDataProductAccessType } from '../data-product/query-builder/DataProductArtifactHelper.js';

const createDataProductInfo = (path: string): V1_DataProductInfo => {
  const info = new V1_DataProductInfo();
  info.path = path;
  return info;
};

const createModelAccessPointGroup = (
  id: string,
): V1_ModelAccessPointGroupInfo => {
  const group = new V1_ModelAccessPointGroupInfo();
  group.id = id;
  return group;
};

const createNativeModelAccess = (key: string): V1_NativeModelAccessInfo => {
  const native = new V1_NativeModelAccessInfo();
  native.defaultExecutionContext = key;
  const ctx = new V1_NativeModelExecutionContextInfo();
  ctx.key = key;
  native.nativeModelExecutionContexts = [ctx];
  return native;
};

describe(unitTest('resolveDefaultDataProductAccessType'), () => {
  test(unitTest('resolves to the model access point group'), () => {
    const artifact = new V1_DataProductArtifact();
    artifact.dataProduct = createDataProductInfo('model::MyDP');
    artifact.accessPointGroups = [createModelAccessPointGroup('grp1')];

    const resolved = resolveDefaultDataProductAccessType(artifact);

    expect(resolved.type).toBe(DataProductAccessType.MODEL);
    expect(resolved.id).toBe('grp1');
  });

  test(
    unitTest(
      'ignores native model access and resolves to the model access point group when both are present',
    ),
    () => {
      const artifact = new V1_DataProductArtifact();
      artifact.dataProduct = createDataProductInfo('model::MixedDP');
      artifact.accessPointGroups = [createModelAccessPointGroup('grp1')];
      artifact.nativeModelAccess = createNativeModelAccess('ctx1');

      const resolved = resolveDefaultDataProductAccessType(artifact);

      expect(resolved.type).toBe(DataProductAccessType.MODEL);
      expect(resolved.id).toBe('grp1');
    },
  );

  test(
    unitTest('throws when the data product only exposes native model access'),
    () => {
      const artifact = new V1_DataProductArtifact();
      artifact.dataProduct = createDataProductInfo('model::NativeDP');
      artifact.accessPointGroups = [];
      artifact.nativeModelAccess = createNativeModelAccess('ctx1');

      expect(() => resolveDefaultDataProductAccessType(artifact)).toThrow(
        `Data Product not supported for querying on legend query model::NativeDP. Must contain a model access point.`,
      );
    },
  );
});
