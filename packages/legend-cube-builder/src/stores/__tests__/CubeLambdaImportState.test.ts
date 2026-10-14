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
  CubeDocument,
  DataProductAccessPointSource,
  dataProductAccessor,
  func,
  lambda,
  literal,
  storeAccessor,
} from '@finos/legend-cube';
import {
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
} from '../../graph-manager/CubeDataProduct.js';
import { serializeCubeLambdaForHost } from '../../graph-manager/protocol/pure/CubeEngineBuilder.js';
import { CubeEditorState } from '../CubeEditorState.js';
import {
  CubeLambdaFidelity,
  getCubeLambdaFidelity,
  readCubeLambdaDocument,
} from '../CubeLambdaImportState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';

// Import Pure's reading (PLAN §11.18), at the state: a data product's access
// point bound as the Data Product tab adds one, and when the banner may say
// that Cube writes a lambda another way that reads the same rows

describe("Reading a lambda into the page's cube", () => {
  test("Binds a data product's access point as the Data Product tab adds one, on a project host's warehouse", async () => {
    const { host } = TEST__createCubeHost();
    const editorState = new CubeEditorState({
      ...host,
      // as Studio's: the project's lakehouse runtime gives the warehouse
      project: {
        resolveRuntime: async () =>
          Promise.resolve({
            label: 'env-a, from sales::Runtime',
            warehouse: 'PROJECT_WH',
          }),
      },
    });
    const reading = await readCubeLambdaDocument(
      editorState,
      serializeCubeLambdaForHost(
        lambda(
          [],
          [
            func('limit', [
              dataProductAccessor([
                'sales::products::OrdersProduct',
                'daily_orders',
              ]),
              literal({ kind: 'integer', value: '5' }),
            ]),
          ],
        ),
      ),
    );
    const [source, limit] = reading.document.query.nodes;
    expect(source).toBeInstanceOf(DataProductAccessPointSource);
    expect(source).toMatchObject({
      dataProduct: 'sales::products::OrdersProduct',
      accessPointGroup: 'core',
      accessPoint: 'daily_orders',
      dataProductId: 'ORDERS_PRODUCT',
      deploymentId: 'deployment-orders_product',
    });
    expect(limit?.type).toBe('limit');
    expect(reading.document.context).toEqual({
      model: createCubeDataProductModel({
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        environmentType: CubeDataProductEnvironmentType.PRODUCTION,
        warehouse: 'PROJECT_WH',
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    });
    expect(reading.unchecked).toEqual([]);
  });

  test('Says a cube written another way reads the same rows only when every step was checked as it was read', () => {
    const { host } = TEST__createCubeHost();
    const editorState = new CubeEditorState(
      host,
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
        query: sliceQuery(),
      }),
    );
    // another lambda than the one the cube writes
    const other = lambda(
      [],
      [storeAccessor([NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS'])],
    );
    expect(
      getCubeLambdaFidelity(editorState, {
        lambda: other,
        isRun: false,
        unchecked: [],
      }),
    ).toBe(CubeLambdaFidelity.REWRITTEN);
    // a step read with unknown columns, e.g. a select taken for the one a
    // Join writes, may have changed the rows
    expect(
      getCubeLambdaFidelity(editorState, {
        lambda: other,
        isRun: false,
        unchecked: ['join101'],
      }),
    ).toBe(CubeLambdaFidelity.UNCHECKED);
  });
});
