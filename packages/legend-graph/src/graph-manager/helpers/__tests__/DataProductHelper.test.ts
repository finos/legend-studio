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
import {
  resolveDataProductExecutionState,
  resolveLakehouseAccessPoint,
  findLakehouseAccessPointGroup,
} from '../DataProductHelper.js';
import {
  DataProduct,
  AccessPointGroup,
  ModelAccessPointGroup,
  LakehouseAccessPoint,
  NativeModelExecutionContext,
  type NativeModelAccess,
} from '../../../graph/metamodel/pure/dataProduct/DataProduct.js';
import { RawLambda } from '../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';
import { PackageableElementExplicitReference } from '../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { Mapping } from '../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import { PackageableRuntime } from '../../../graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import { EngineRuntime } from '../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const stubRawLambda = (): RawLambda => new RawLambda(undefined, undefined);

const createNativeDataProduct = (): DataProduct => {
  const dp = new DataProduct('NativeDP');
  const mapping = new Mapping('TestMapping');
  const runtime = new PackageableRuntime('TestRuntime');
  runtime.runtimeValue = new EngineRuntime();

  const execCtx = new NativeModelExecutionContext();
  execCtx.key = 'ctx1';
  execCtx.mapping = PackageableElementExplicitReference.create(mapping);
  execCtx.runtime = PackageableElementExplicitReference.create(runtime);

  dp.nativeModelAccess = {
    defaultExecutionContext: execCtx,
    nativeModelExecutionContexts: [execCtx],
    featuredElements: [],
    sampleQueries: [],
  } as unknown as NativeModelAccess;

  return dp;
};

const createModelDataProduct = (): DataProduct => {
  const dp = new DataProduct('ModelDP');
  const mapping = new Mapping('TestMapping');
  const group = new ModelAccessPointGroup();
  group.id = 'grp1';
  group.mapping = PackageableElementExplicitReference.create(mapping);
  dp.accessPointGroups = [group];
  return dp;
};

const createLakehouseDataProduct = (): DataProduct => {
  const dp = new DataProduct('LakehouseDP');
  const group = new AccessPointGroup();
  group.id = 'lhGroup1';
  const ap = new LakehouseAccessPoint(
    'lhAP1',
    'Snowflake',
    stubRawLambda(),
    group,
  );
  ap.title = 'Lakehouse AP';
  group.accessPoints = [ap];
  dp.accessPointGroups = [group];
  return dp;
};

const createMixedDataProduct = (): DataProduct => {
  const dp = new DataProduct('MixedDP');
  const mapping = new Mapping('TestMapping');

  const modelGroup = new ModelAccessPointGroup();
  modelGroup.id = 'modelGrp';
  modelGroup.mapping = PackageableElementExplicitReference.create(mapping);

  const lhGroup = new AccessPointGroup();
  lhGroup.id = 'lhGroup';
  const lhAP = new LakehouseAccessPoint(
    'lhAP1',
    'Snowflake',
    stubRawLambda(),
    lhGroup,
  );
  lhAP.title = 'Lake AP';
  lhGroup.accessPoints = [lhAP];

  dp.accessPointGroups = [modelGroup, lhGroup];
  return dp;
};

// ---------------------------------------------------------------------------
// Tests: resolveDataProductExecutionState
// ---------------------------------------------------------------------------

describe(unitTest('resolveDataProductExecutionState'), () => {
  test('returns native execution context for native data product', () => {
    const dp = createNativeDataProduct();
    const result = resolveDataProductExecutionState(dp);
    expect(result).toBeInstanceOf(NativeModelExecutionContext);
    expect((result as NativeModelExecutionContext).key).toBe('ctx1');
  });

  test('returns ModelAccessPointGroup for modeled data product', () => {
    const dp = createModelDataProduct();
    const result = resolveDataProductExecutionState(dp);
    expect(result).toBeInstanceOf(ModelAccessPointGroup);
    expect((result as ModelAccessPointGroup).id).toBe('grp1');
  });

  test('returns LakehouseAccessPoint for lakehouse-only data product', () => {
    const dp = createLakehouseDataProduct();
    const result = resolveDataProductExecutionState(dp);
    expect(result).toBeInstanceOf(LakehouseAccessPoint);
    expect((result as LakehouseAccessPoint).id).toBe('lhAP1');
    expect((result as LakehouseAccessPoint).__owner).toBeDefined();
    expect((result as LakehouseAccessPoint).__owner.id).toBe('lhGroup1');
  });

  test('prefers ModelAccessPointGroup over LakehouseAccessPoint in mixed product', () => {
    const dp = createMixedDataProduct();
    const result = resolveDataProductExecutionState(dp);
    expect(result).toBeInstanceOf(ModelAccessPointGroup);
    expect((result as ModelAccessPointGroup).id).toBe('modelGrp');
  });

  test('throws for data product with no access points and no native access', () => {
    const dp = new DataProduct('EmptyDP');
    expect(() => resolveDataProductExecutionState(dp)).toThrow(
      'No native model access, model access group, or lakehouse access point on data product',
    );
  });
});

// ---------------------------------------------------------------------------
// Tests: resolveLakehouseAccessPoint
// ---------------------------------------------------------------------------

describe(unitTest('resolveLakehouseAccessPoint'), () => {
  test('returns first found LakehouseAccessPoint', () => {
    const dp = createLakehouseDataProduct();
    const result = resolveLakehouseAccessPoint(dp);
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(LakehouseAccessPoint);
    expect(result?.id).toBe('lhAP1');
    expect(result?.__owner).toBeDefined();
    expect(result?.__owner.id).toBe('lhGroup1');
  });

  test('returns undefined when no lakehouse access points exist', () => {
    const dp = createModelDataProduct();
    const result = resolveLakehouseAccessPoint(dp);
    expect(result).toBeUndefined();
  });

  test('returns undefined for native-only data product', () => {
    const dp = createNativeDataProduct();
    const result = resolveLakehouseAccessPoint(dp);
    expect(result).toBeUndefined();
  });

  test('finds lakehouse access point in mixed product', () => {
    const dp = createMixedDataProduct();
    const result = resolveLakehouseAccessPoint(dp);
    expect(result).toBeDefined();
    expect(result?.id).toBe('lhAP1');
    expect(result?.__owner).toBeDefined();
    expect(result?.__owner.id).toBe('lhGroup');
  });
});

// ---------------------------------------------------------------------------
// Tests: findLakehouseAccessPointGroup
// ---------------------------------------------------------------------------

describe(unitTest('findLakehouseAccessPointGroup'), () => {
  test('returns group and access point for matching id', () => {
    const dp = createLakehouseDataProduct();
    const result = findLakehouseAccessPointGroup(dp, 'lhAP1');
    expect(result).toBeDefined();
    expect(result?.group.id).toBe('lhGroup1');
    expect(result?.accessPoint.id).toBe('lhAP1');
    expect(result?.accessPoint).toBeInstanceOf(LakehouseAccessPoint);
    expect(result?.accessPoint.__owner).toBe(result?.group);
  });

  test('returns undefined for non-existent access point id', () => {
    const dp = createLakehouseDataProduct();
    const result = findLakehouseAccessPointGroup(dp, 'nonExistentId');
    expect(result).toBeUndefined();
  });

  test('returns undefined when data product has no lakehouse access points', () => {
    const dp = createModelDataProduct();
    const result = findLakehouseAccessPointGroup(dp, 'lhAP1');
    expect(result).toBeUndefined();
  });

  test('finds access point in correct group in mixed product', () => {
    const dp = createMixedDataProduct();
    const result = findLakehouseAccessPointGroup(dp, 'lhAP1');
    expect(result).toBeDefined();
    expect(result?.group.id).toBe('lhGroup');
    expect(result?.accessPoint.id).toBe('lhAP1');
    expect(result?.accessPoint.__owner).toBe(result?.group);
  });

  test('does not match non-lakehouse access points', () => {
    const dp = createModelDataProduct();
    // ModelAccessPointGroup has no lakehouse access points
    const result = findLakehouseAccessPointGroup(dp, 'grp1');
    expect(result).toBeUndefined();
  });
});
