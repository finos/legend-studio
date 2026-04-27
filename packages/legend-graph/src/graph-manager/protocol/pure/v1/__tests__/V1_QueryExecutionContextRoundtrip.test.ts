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
  V1_Query,
  V1_QueryExplicitExecutionContext,
  V1_QueryDataSpaceExecutionContext,
  V1_DataProductNativeExecutionContext,
  V1_DataProductModelAccessExecutionContext,
  V1_DataProductLakehouseExecutionContext,
  V1_deserializeQueryExecutionContext,
  V1_serializeQueryExecutionContext,
} from '../engine/query/V1_Query.js';
import type { PlainObject } from '@finos/legend-shared';

// --------------------------------
// Test data
// --------------------------------

const TEST_DATA__explicitExecutionContextQueryJson = {
  name: 'MyTestQuery',
  id: 'test-query-id-1',
  groupId: 'com.example',
  artifactId: 'test-artifact',
  versionId: '1.0.0',
  content: '|model::Person.all()->project()',
  executionContext: {
    _type: 'explicitExecutionContext',
    mapping: 'model::MyMapping',
    runtime: 'model::MyRuntime',
  },
};

const TEST_DATA__dataSpaceExecutionContextQueryJson = {
  name: 'MyDataSpaceQuery',
  id: 'test-query-id-2',
  groupId: 'com.example',
  artifactId: 'test-artifact',
  versionId: '1.0.0',
  content: '|model::Person.all()->project()',
  executionContext: {
    _type: 'dataSpaceExecutionContext',
    dataSpacePath: 'model::MyDataSpace',
    executionKey: 'default',
  },
};

const TEST_DATA__dataProductNativeExecutionContextQueryJson = {
  name: 'MyDataProductNativeQuery',
  id: 'test-query-id-3',
  groupId: 'com.example',
  artifactId: 'test-artifact',
  versionId: '1.0.0',
  content: '|model::Person.all()->project()',
  executionContext: {
    _type: 'dataProductNativeExecutionContext',
    dataProductPath: 'model::MyDataProduct',
    executionKey: 'nativeExecKey',
  },
};

const TEST_DATA__dataProductModelAccessExecutionContextQueryJson = {
  name: 'MyDataProductModelAccessQuery',
  id: 'test-query-id-4',
  groupId: 'com.example',
  artifactId: 'test-artifact',
  versionId: '1.0.0',
  content: '|model::Person.all()->project()',
  executionContext: {
    _type: 'dataProductModelAccessExecutionContext',
    dataProductPath: 'model::MyDataProduct',
    accessPointGroupId: 'my-access-point-group',
  },
};

const TEST_DATA__dataProductLakehouseExecutionContextQueryJson = {
  name: 'MyDataProductLakehouseQuery',
  id: 'test-query-id-5',
  groupId: 'com.example',
  artifactId: 'test-artifact',
  versionId: '1.0.0',
  content: '|model::Person.all()->project()',
  executionContext: {
    _type: 'dataProductLakehouseAccessExecutionContext',
    dataProductPath: 'model::MyDataProduct',
    accessPointId: 'my-lakehouse-access-point',
    accessGroupId: 'my-lakehouse-access-group',
  },
};

// --------------------------------
// Execution context roundtrip tests
// --------------------------------

describe(unitTest('Query execution context serialization roundtrip'), () => {
  test('Explicit execution context roundtrip', () => {
    const json: PlainObject = {
      _type: 'explicitExecutionContext',
      mapping: 'model::MyMapping',
      runtime: 'model::MyRuntime',
    };
    const context = V1_deserializeQueryExecutionContext(json);
    expect(context).toBeInstanceOf(V1_QueryExplicitExecutionContext);
    const reserialized = V1_serializeQueryExecutionContext(context);
    expect(reserialized).toEqual(json);
  });

  test('DataSpace execution context roundtrip', () => {
    const json: PlainObject = {
      _type: 'dataSpaceExecutionContext',
      dataSpacePath: 'model::MyDataSpace',
      executionKey: 'default',
    };
    const context = V1_deserializeQueryExecutionContext(json);
    expect(context).toBeInstanceOf(V1_QueryDataSpaceExecutionContext);
    const reserialized = V1_serializeQueryExecutionContext(context);
    expect(reserialized).toEqual(json);
  });

  test('DataProduct native execution context roundtrip', () => {
    const json: PlainObject = {
      _type: 'dataProductNativeExecutionContext',
      dataProductPath: 'model::MyDataProduct',
      executionKey: 'nativeExecKey',
    };
    const context = V1_deserializeQueryExecutionContext(json);
    expect(context).toBeInstanceOf(V1_DataProductNativeExecutionContext);
    const native = context as V1_DataProductNativeExecutionContext;
    expect(native.dataProductPath).toBe('model::MyDataProduct');
    expect(native.executionKey).toBe('nativeExecKey');
    const reserialized = V1_serializeQueryExecutionContext(context);
    expect(reserialized).toEqual(json);
  });

  test('DataProduct model access execution context roundtrip', () => {
    const json: PlainObject = {
      _type: 'dataProductModelAccessExecutionContext',
      dataProductPath: 'model::MyDataProduct',
      accessPointGroupId: 'my-access-point-group',
    };
    const context = V1_deserializeQueryExecutionContext(json);
    expect(context).toBeInstanceOf(V1_DataProductModelAccessExecutionContext);
    const modelAccess = context as V1_DataProductModelAccessExecutionContext;
    expect(modelAccess.dataProductPath).toBe('model::MyDataProduct');
    expect(modelAccess.accessPointGroupId).toBe('my-access-point-group');
    const reserialized = V1_serializeQueryExecutionContext(context);
    expect(reserialized).toEqual(json);
  });

  test('DataProduct lakehouse execution context roundtrip', () => {
    const json: PlainObject = {
      _type: 'dataProductLakehouseAccessExecutionContext',
      dataProductPath: 'model::MyDataProduct',
      accessPointId: 'my-lakehouse-access-point',
      accessGroupId: 'my-lakehouse-access-group',
    };
    const context = V1_deserializeQueryExecutionContext(json);
    expect(context).toBeInstanceOf(V1_DataProductLakehouseExecutionContext);
    const lakehouse = context as V1_DataProductLakehouseExecutionContext;
    expect(lakehouse.dataProductPath).toBe('model::MyDataProduct');
    expect(lakehouse.accessPointId).toBe('my-lakehouse-access-point');
    expect(lakehouse.accessGroupId).toBe('my-lakehouse-access-group');
    const reserialized = V1_serializeQueryExecutionContext(context);
    expect(reserialized).toEqual(json);
  });

  test('Unsupported execution context type throws', () => {
    const json: PlainObject = {
      _type: 'unknownExecutionContext',
    };
    expect(() => V1_deserializeQueryExecutionContext(json)).toThrow();
  });
});

// --------------------------------
// V1_Query full roundtrip tests
// --------------------------------

describe(unitTest('V1_Query serialization roundtrip'), () => {
  test('V1_Query with explicit execution context roundtrip', () => {
    const v1Query = V1_Query.serialization.fromJson(
      TEST_DATA__explicitExecutionContextQueryJson,
    );
    expect(v1Query.name).toBe('MyTestQuery');
    expect(v1Query.executionContext).toBeInstanceOf(
      V1_QueryExplicitExecutionContext,
    );
    const reserialized = V1_Query.serialization.toJson(v1Query);
    expect(reserialized).toEqual(TEST_DATA__explicitExecutionContextQueryJson);
  });

  test('V1_Query with dataSpace execution context roundtrip', () => {
    const v1Query = V1_Query.serialization.fromJson(
      TEST_DATA__dataSpaceExecutionContextQueryJson,
    );
    expect(v1Query.name).toBe('MyDataSpaceQuery');
    expect(v1Query.executionContext).toBeInstanceOf(
      V1_QueryDataSpaceExecutionContext,
    );
    const reserialized = V1_Query.serialization.toJson(v1Query);
    expect(reserialized).toEqual(TEST_DATA__dataSpaceExecutionContextQueryJson);
  });

  test('V1_Query with dataProduct native execution context roundtrip', () => {
    const v1Query = V1_Query.serialization.fromJson(
      TEST_DATA__dataProductNativeExecutionContextQueryJson,
    );
    expect(v1Query.name).toBe('MyDataProductNativeQuery');
    expect(v1Query.executionContext).toBeInstanceOf(
      V1_DataProductNativeExecutionContext,
    );
    const exec =
      v1Query.executionContext as V1_DataProductNativeExecutionContext;
    expect(exec.dataProductPath).toBe('model::MyDataProduct');
    expect(exec.executionKey).toBe('nativeExecKey');
    const reserialized = V1_Query.serialization.toJson(v1Query);
    expect(reserialized).toEqual(
      TEST_DATA__dataProductNativeExecutionContextQueryJson,
    );
  });

  test('V1_Query with dataProduct model access execution context roundtrip', () => {
    const v1Query = V1_Query.serialization.fromJson(
      TEST_DATA__dataProductModelAccessExecutionContextQueryJson,
    );
    expect(v1Query.name).toBe('MyDataProductModelAccessQuery');
    expect(v1Query.executionContext).toBeInstanceOf(
      V1_DataProductModelAccessExecutionContext,
    );
    const exec =
      v1Query.executionContext as V1_DataProductModelAccessExecutionContext;
    expect(exec.dataProductPath).toBe('model::MyDataProduct');
    expect(exec.accessPointGroupId).toBe('my-access-point-group');
    const reserialized = V1_Query.serialization.toJson(v1Query);
    expect(reserialized).toEqual(
      TEST_DATA__dataProductModelAccessExecutionContextQueryJson,
    );
  });

  test('V1_Query with dataProduct lakehouse execution context roundtrip', () => {
    const v1Query = V1_Query.serialization.fromJson(
      TEST_DATA__dataProductLakehouseExecutionContextQueryJson,
    );
    expect(v1Query.name).toBe('MyDataProductLakehouseQuery');
    expect(v1Query.executionContext).toBeInstanceOf(
      V1_DataProductLakehouseExecutionContext,
    );
    const exec =
      v1Query.executionContext as V1_DataProductLakehouseExecutionContext;
    expect(exec.dataProductPath).toBe('model::MyDataProduct');
    expect(exec.accessPointId).toBe('my-lakehouse-access-point');
    expect(exec.accessGroupId).toBe('my-lakehouse-access-group');
    const reserialized = V1_Query.serialization.toJson(v1Query);
    expect(reserialized).toEqual(
      TEST_DATA__dataProductLakehouseExecutionContextQueryJson,
    );
  });

  test('V1_Query without execution context roundtrip', () => {
    const json = {
      name: 'NoExecContextQuery',
      id: 'test-query-id-5',
      groupId: 'com.example',
      artifactId: 'test-artifact',
      versionId: '1.0.0',
      content: '|model::Person.all()->project()',
    };
    const v1Query = V1_Query.serialization.fromJson(json);
    expect(v1Query.name).toBe('NoExecContextQuery');
    expect(v1Query.executionContext).toBeUndefined();
    const reserialized = V1_Query.serialization.toJson(v1Query);
    expect(reserialized).toEqual(json);
  });
});
