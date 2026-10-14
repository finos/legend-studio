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

import { beforeEach, describe, expect, test } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import {
  colSpec,
  colSpecArray,
  columnAccess,
  dataProductAccessor,
  func,
  ingestAccessor,
  lambda,
  literal,
  aggregationColSpec,
  variable,
  type IR,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
} from '../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeIngestCatalog,
  FAKE_INGEST_ORDERS,
} from '../../__test-utils__/FakeCubeIngestCatalog.js';
import { CubeDataProductEnvironmentType } from '../../graph-manager/CubeDataProduct.js';
import { serializeCubeLambdaForHost } from '../../graph-manager/protocol/pure/CubeEngineBuilder.js';
import type { CubeHost } from '../../stores/CubeHost.js';
import { CUBE_LAMBDA_IMPORT_MESSAGE } from '../../stores/CubeLambdaImportState.js';
import { CUBE_LAMBDA_SOURCES_MESSAGE } from '../../stores/CubeLambdaSources.js';
import { CubeEditor } from '../CubeEditor.js';

// Import Pure (PLAN §11.18): the page opened on a host's lambda, as Studio's
// Edit MatView opens Cube on a materialized view

const LABEL = 'materialized view BIG_TRADES';
const TRADES = ingestAccessor([FAKE_INGEST_ORDERS, 'TRADES']);
const row = (name: string): IR => columnAccess('row', name);
const integer = (value: string): IR => literal({ kind: 'integer', value });

/** As Cube writes a Filter, a Group and a Limit of TRADES */
const BIG_TRADES = serializeCubeLambdaForHost(
  lambda(
    [],
    [
      func('limit', [
        func('groupBy', [
          func('filter', [
            TRADES,
            lambda(
              ['row'],
              [func('greaterThan', [row('TRADE_ID'), integer('10')])],
            ),
          ]),
          colSpecArray([colSpec('DESK')]),
          colSpecArray([
            aggregationColSpec(
              'TRADES',
              lambda(['x'], [columnAccess('x', 'TRADE_ID')]),
              lambda(['y'], [func('count', [variable('y')])]),
            ),
          ]),
        ]),
        integer('5'),
      ]),
    ],
  ),
);

/** A host that reads one producer's ingest data sets, of one class, as Studio's project does */
const ingestHost = (): CubeHost => {
  const { host } = TEST__createCubeHost();
  const ingest = createFakeCubeIngestCatalog();
  return {
    ...host,
    dataProductCatalog: undefined,
    ingestCatalog: {
      ...ingest.catalog,
      environmentTypes: [CubeDataProductEnvironmentType.PRODUCTION],
      listProducers: async (environmentType) =>
        (await ingest.catalog.listProducers(environmentType)).slice(0, 1),
    },
  };
};

const renderOn = async (host: CubeHost, json: PlainObject): Promise<void> => {
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialLambda={{ lambda: json, label: LABEL }} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
};

/** The import's banner, once the lambda is read */
const findBanner = async (): Promise<HTMLElement> =>
  screen.findByTestId(LEGEND_CUBE_TEST_ID.LAMBDA_IMPORT);

beforeEach(() => {
  localStorage.clear();
});

describe('Opening the page on a lambda', () => {
  test('Reads the lambda into the steps that wrote it, on the canvas, written back the same', async () => {
    await renderOn(ingestHost(), BIG_TRADES);
    await TEST__findCanvasNode('limit101');
    expect(
      TEST__getCanvasNodes().map((node) =>
        node.closest('.react-flow__node')?.getAttribute('data-id'),
      ),
    ).toEqual(
      expect.arrayContaining([
        'ingestDataset101',
        'filter101',
        'group101',
        'limit101',
      ]),
    );
    expect(TEST__getCanvasNodes()).toHaveLength(4);
    // Cube writes it back the same, so there's nothing to say
    await waitFor(() =>
      expect(
        screen.queryByText(CUBE_LAMBDA_IMPORT_MESSAGE.READING(LABEL)),
      ).toBeNull(),
    );
    expect(screen.queryByTestId(LEGEND_CUBE_TEST_ID.LAMBDA_IMPORT)).toBeNull();
  });

  test('Says when Cube writes the lambda another way, which reads the same rows', async () => {
    // sorted before the filter: Cube writes the sort just before the limit
    const sortedFirst = serializeCubeLambdaForHost(
      lambda(
        [],
        [
          func('limit', [
            func('filter', [
              func('sort', [TRADES, func('descending', [colSpec('TRADE_ID')])]),
              lambda(
                ['row'],
                [func('greaterThan', [row('TRADE_ID'), integer('10')])],
              ),
            ]),
            integer('5'),
          ]),
        ],
      ),
    );
    await renderOn(ingestHost(), sortedFirst);
    expect((await findBanner()).textContent).toContain(
      CUBE_LAMBDA_IMPORT_MESSAGE.REWRITTEN(LABEL),
    );
    expect(TEST__getCanvasNodes()).toHaveLength(4);
  });

  test("Leaves the cube empty and says why when the lambda can't be read", async () => {
    // a materialized view of the definition: never a source
    await renderOn(
      ingestHost(),
      serializeCubeLambdaForHost(
        lambda([], [ingestAccessor([FAKE_INGEST_ORDERS, 'DAILY'])]),
      ),
    );
    const banner = await findBanner();
    expect(banner.textContent).toContain(
      CUBE_LAMBDA_IMPORT_MESSAGE.CANT_READ(LABEL),
    );
    expect(banner.textContent).toContain(
      CUBE_LAMBDA_SOURCES_MESSAGE.DATA_SET_UNREADABLE(
        'DAILY',
        FAKE_INGEST_ORDERS,
        'It is a materialized view, which Cube does not support yet',
      ),
    );
    expect(TEST__getCanvasNodes()).toHaveLength(0);
  });

  test('Asks for a source first when the host has several ingest deployments', async () => {
    const { host } = TEST__createCubeHost();
    await renderOn(
      { ...host, ingestCatalog: createFakeCubeIngestCatalog().catalog },
      BIG_TRADES,
    );
    expect((await findBanner()).textContent).toContain(
      CUBE_LAMBDA_SOURCES_MESSAGE.INGEST_SETTINGS,
    );
  });

  test('Refuses a lambda reading two kinds of source', async () => {
    await renderOn(
      ingestHost(),
      serializeCubeLambdaForHost(
        lambda(
          [],
          [
            func('concatenate', [
              TRADES,
              dataProductAccessor(['sales::Product', 'trades']),
            ]),
          ],
        ),
      ),
    );
    expect((await findBanner()).textContent).toContain(
      CUBE_LAMBDA_SOURCES_MESSAGE.MIXED,
    );
  });
});
