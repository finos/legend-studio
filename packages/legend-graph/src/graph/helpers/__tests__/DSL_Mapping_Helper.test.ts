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
import { Mapping } from '../../metamodel/pure/packageableElements/mapping/Mapping.js';
import { PackageableElementExplicitReference } from '../../metamodel/pure/packageableElements/PackageableElementReference.js';
import { PackageableRuntime } from '../../metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
import {
  EngineRuntime,
  LakehouseRuntime,
  LakehouseSingleStoreRuntime,
} from '../../metamodel/pure/packageableElements/runtime/Runtime.js';
import { getMappingCompatibleRuntimes } from '../DSL_Mapping_Helper.js';

const createPackageableRuntime = (
  name: string,
  runtimeValue: EngineRuntime,
): PackageableRuntime => {
  const runtime = new PackageableRuntime(name);
  runtime.runtimeValue = runtimeValue;
  return runtime;
};

test(
  unitTest(
    'getMappingCompatibleRuntimes treats LakehouseSingleStoreRuntime as compatible with any mapping, same as LakehouseRuntime',
  ),
  () => {
    const mapping = new Mapping('test::MyMapping');
    const unrelatedEngineRuntime = createPackageableRuntime(
      'test::UnrelatedRuntime',
      new EngineRuntime(),
    );
    const lakehouseRuntime = createPackageableRuntime(
      'test::LakehouseRuntime',
      new LakehouseRuntime(),
    );
    const lakehouseSingleStoreRuntime = createPackageableRuntime(
      'test::LakehouseSingleStoreRuntime',
      new LakehouseSingleStoreRuntime(),
    );

    const compatibleRuntimes = getMappingCompatibleRuntimes(mapping, [
      unrelatedEngineRuntime,
      lakehouseRuntime,
      lakehouseSingleStoreRuntime,
    ]);

    expect(compatibleRuntimes).not.toContain(unrelatedEngineRuntime);
    expect(compatibleRuntimes).toContain(lakehouseRuntime);
    expect(compatibleRuntimes).toContain(lakehouseSingleStoreRuntime);
  },
);

test(
  unitTest(
    'getMappingCompatibleRuntimes includes a plain EngineRuntime that directly references the mapping',
  ),
  () => {
    const mapping = new Mapping('test::MyMapping');
    const engineRuntime = new EngineRuntime();
    engineRuntime.mappings = [
      PackageableElementExplicitReference.create(mapping),
    ];
    const packageableRuntime = createPackageableRuntime(
      'test::MappedRuntime',
      engineRuntime,
    );

    const compatibleRuntimes = getMappingCompatibleRuntimes(mapping, [
      packageableRuntime,
    ]);

    expect(compatibleRuntimes).toContain(packageableRuntime);
  },
);
