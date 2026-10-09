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
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import type { CubeHost } from '../CubeHost.js';

describe('Cube host', () => {
  test('Gives the page a connection explorer and a data product catalog only when it has them', () => {
    const { host, connections, dataProducts } = TEST__createCubeHost();
    expect(host.connectionExplorer).toBe(connections.explorer);
    expect(host.dataProductCatalog).toBe(dataProducts.catalog);
    const withoutEither: CubeHost = {
      applicationStore: host.applicationStore,
      engine: host.engine,
      modelCatalog: host.modelCatalog,
    };
    expect(withoutEither.connectionExplorer).toBeUndefined();
    expect(withoutEither.dataProductCatalog).toBeUndefined();
  });
});
