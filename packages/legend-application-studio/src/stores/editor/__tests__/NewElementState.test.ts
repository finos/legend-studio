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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  EngineRuntime,
  LakehouseRuntime,
  LakehouseSingleStoreRuntime,
  Mapping,
  PackageableRuntime,
} from '@finos/legend-graph';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import {
  NewPackageableRuntimeDriver,
  NewRuntimeType,
} from '../NewElementState.js';

test(
  unitTest(
    'NewPackageableRuntimeDriver creates a LakehouseRuntime for LAKEHOUSE',
  ),
  () => {
    const editorStore = TEST__getTestEditorStore();
    const driver = new NewPackageableRuntimeDriver(editorStore);
    driver.setType(NewRuntimeType.LAKEHOUSE);

    const runtime = driver.createElement('test::MyRuntime');

    expect(runtime).toBeInstanceOf(PackageableRuntime);
    expect(runtime.runtimeValue).toBeInstanceOf(LakehouseRuntime);
    expect((runtime.runtimeValue as LakehouseRuntime).environment).toBe('');
    expect((runtime.runtimeValue as LakehouseRuntime).warehouse).toBe('');
  },
);

test(
  unitTest(
    'NewPackageableRuntimeDriver creates a plain EngineRuntime with a mapping for LEGACY',
  ),
  () => {
    const editorStore = TEST__getTestEditorStore();
    const driver = new NewPackageableRuntimeDriver(editorStore);
    driver.setMapping(new Mapping('test::MyMapping'));
    driver.setType(NewRuntimeType.LEGACY);

    const runtime = driver.createElement('test::MyRuntime');

    expect(runtime.runtimeValue).toBeInstanceOf(EngineRuntime);
    expect(runtime.runtimeValue).not.toBeInstanceOf(LakehouseRuntime);
    expect(runtime.runtimeValue).not.toBeInstanceOf(
      LakehouseSingleStoreRuntime,
    );
  },
);
