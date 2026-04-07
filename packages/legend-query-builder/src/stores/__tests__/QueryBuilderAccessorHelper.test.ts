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
  Database,
  IngestDefinition,
  LakehouseRuntime,
  EngineRuntime,
  PackageableRuntime,
  DataProduct,
  type GraphManagerState,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { getCompatibleRuntimesFromAccessorOwner } from '../workflows/accessor/AccessorQueryBuilderHelper.js';

// helper to create a PackageableRuntime with the given runtimeValue
const makeRuntime = (runtimeValue: EngineRuntime): PackageableRuntime => {
  const rt = new PackageableRuntime('testRuntime');
  rt.runtimeValue = runtimeValue;
  return rt;
};

const createMockGraphManagerState = (
  runtimes: PackageableRuntime[],
): GraphManagerState =>
  ({
    usableRuntimes: runtimes,
  }) as unknown as GraphManagerState;

describe(unitTest('getCompatibleRuntimesFromAccessorOwner'), () => {
  test('returns LakehouseRuntime runtimes for IngestDefinition', () => {
    const lakehouseRuntime = makeRuntime(new LakehouseRuntime());
    const engineRuntime = makeRuntime(new EngineRuntime());
    const graphManagerState = createMockGraphManagerState([
      lakehouseRuntime,
      engineRuntime,
    ]);

    const ingest = new IngestDefinition('TestIngest');
    const result = getCompatibleRuntimesFromAccessorOwner(
      ingest,
      graphManagerState,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(lakehouseRuntime);
  });

  test('returns only LakehouseRuntime runtimes (not plain EngineRuntime) for IngestDefinition', () => {
    const engineRuntime1 = makeRuntime(new EngineRuntime());
    const engineRuntime2 = makeRuntime(new EngineRuntime());
    const graphManagerState = createMockGraphManagerState([
      engineRuntime1,
      engineRuntime2,
    ]);

    const ingest = new IngestDefinition('TestIngest');
    const result = getCompatibleRuntimesFromAccessorOwner(
      ingest,
      graphManagerState,
    );

    expect(result).toHaveLength(0);
  });

  test('returns EngineRuntime runtimes with no mappings for Database', () => {
    const engineRuntime = new EngineRuntime();
    engineRuntime.mappings = [];
    const rt = makeRuntime(engineRuntime);

    const graphManagerState = createMockGraphManagerState([rt]);

    const db = new Database('TestDB');
    const result = getCompatibleRuntimesFromAccessorOwner(
      db,
      graphManagerState,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(rt);
  });

  test('excludes LakehouseRuntime runtimes for Database', () => {
    const lakehouseRuntime = new LakehouseRuntime();
    lakehouseRuntime.mappings = [];
    const rt = makeRuntime(lakehouseRuntime);

    const graphManagerState = createMockGraphManagerState([rt]);

    const db = new Database('TestDB');
    const result = getCompatibleRuntimesFromAccessorOwner(
      db,
      graphManagerState,
    );

    expect(result).toHaveLength(0);
  });

  test('excludes runtimes with mappings for Database', () => {
    const engineRuntime = new EngineRuntime();
    // Simulate having mappings by adding a non-empty array
    (engineRuntime as unknown as { mappings: object[] }).mappings = [{}];
    const rt = makeRuntime(engineRuntime);

    const graphManagerState = createMockGraphManagerState([rt]);

    const db = new Database('TestDB');
    const result = getCompatibleRuntimesFromAccessorOwner(
      db,
      graphManagerState,
    );

    expect(result).toHaveLength(0);
  });

  test('returns empty array for unknown accessor owner type', () => {
    const engineRuntime = makeRuntime(new EngineRuntime());
    const graphManagerState = createMockGraphManagerState([engineRuntime]);

    // Use an object that is neither IngestDefinition, Database, nor DataProduct
    const unknownElement = {} as Parameters<
      typeof getCompatibleRuntimesFromAccessorOwner
    >[0];
    const result = getCompatibleRuntimesFromAccessorOwner(
      unknownElement,
      graphManagerState,
    );

    expect(result).toHaveLength(0);
  });

  test('throws UnsupportedOperationError for DataProduct', () => {
    const graphManagerState = createMockGraphManagerState([]);
    const dataProduct = new DataProduct('TestDataProduct');

    expect(() =>
      getCompatibleRuntimesFromAccessorOwner(dataProduct, graphManagerState),
    ).toThrow(UnsupportedOperationError);
  });
});
