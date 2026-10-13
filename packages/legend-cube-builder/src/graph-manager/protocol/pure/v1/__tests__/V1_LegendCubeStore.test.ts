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

import { describe, expect, jest, test } from '@jest/globals';
import { NetworkClientError, TracerService } from '@finos/legend-shared';
import {
  CubeDraft,
  CubeSourceRef,
  CubeStoreError,
  CubeStoreErrorKind,
  SavedCube,
  SavedCubeSummary,
} from '../../../../CubeStore.js';
import {
  V1_LegendCubeStore,
  V1_toCubeStoreError,
} from '../V1_LegendCubeStore.js';

const STORED = {
  audit: {
    createdAt: 1791898778643,
    createdBy: 'anonymous',
    updatedAt: 1791898779810,
    updatedBy: 'bob',
  },
  content: '{"formatVersion":1,"meta":{"a.b":null}}',
  formatVersion: 1,
  id: '5d057208-dd12-4bd8-b32a-9e08d3ce2c3b',
  lastOpenAt: 1791898779126,
  name: 'Orders "FR"',
  owners: ['anonymous', 'bob'],
  sourceRefs: [
    {
      element: 'S.T',
      path: 'my::Db',
      type: 'table',
      project: 'org.finos:northwind',
    },
  ],
  tags: [],
  version: 3,
  // a field the engine adds later is ignored
  deleted: null,
  futureField: { a: 1 },
};

const createStore = (queryBaseUrl?: string): V1_LegendCubeStore =>
  new V1_LegendCubeStore(
    { baseUrl: 'http://engine/api', queryBaseUrl },
    new TracerService(),
  );

const draft = new CubeDraft('Orders', 1, '{"formatVersion":1}', [
  new CubeSourceRef('table', 'my::Db', 'S.T'),
  new CubeSourceRef('dataProductAccessPoint', 'my::Product', 'ap1', undefined),
]);

const clientError = (status: number, payload?: unknown): NetworkClientError =>
  new NetworkClientError(
    { status, statusText: String(status), url: 'http://engine' } as Response,
    payload as NetworkClientError['payload'],
  );

describe("The engine's Cube store", () => {
  test("Calls the store on Query's query server, else on the engine", async () => {
    const onQueryServer = createStore('http://query/api');
    const post = jest
      .spyOn(onQueryServer.client, 'post')
      .mockResolvedValue([] as never);
    await onQueryServer.searchCubes({ searchTerm: 'orders' });
    expect(post.mock.calls[0]?.[0]).toBe(
      'http://query/api/pure/v1/query/cube/search',
    );
    expect(post.mock.calls[0]?.[1]).toEqual({ searchTerm: 'orders' });

    const onEngine = createStore();
    const get = jest
      .spyOn(onEngine.client, 'get')
      .mockResolvedValue(STORED as never);
    await onEngine.getCube('a/b c');
    expect(get.mock.calls[0]?.[0]).toBe(
      'http://engine/api/pure/v1/query/cube/a%2Fb%20c',
    );
  });

  test('Reads a saved cube into its classes, the spec as saved', async () => {
    const store = createStore();
    jest.spyOn(store.client, 'get').mockResolvedValue(STORED as never);
    const cube = await store.getCube(STORED.id);
    expect(cube).toBeInstanceOf(SavedCube);
    expect(cube.id).toBe(STORED.id);
    expect(cube.version).toBe(3);
    expect(cube.name).toBe('Orders "FR"');
    expect(cube.owners).toEqual(['anonymous', 'bob']);
    expect(cube.content).toBe(STORED.content);
    expect(cube.createdBy).toBe('anonymous');
    expect(cube.updatedBy).toBe('bob');
    expect(cube.updatedAt).toBe(1791898779810);
    expect(cube.sourceRefs).toEqual([
      new CubeSourceRef('table', 'my::Db', 'S.T', 'org.finos:northwind'),
    ]);
    expect(cube.sourceRefs[0]).toBeInstanceOf(CubeSourceRef);
  });

  test('Creates without an id or owners, saves with the version read, deletes at it', async () => {
    const store = createStore();
    const post = jest
      .spyOn(store.client, 'post')
      .mockResolvedValue(STORED as never);
    const put = jest
      .spyOn(store.client, 'put')
      .mockResolvedValue(STORED as never);
    const del = jest
      .spyOn(store.client, 'delete')
      .mockResolvedValue(undefined as never);

    await store.createCube(draft);
    expect(post.mock.calls[0]?.[0]).toBe(
      'http://engine/api/pure/v1/query/cube',
    );
    expect(post.mock.calls[0]?.[1]).toEqual({
      name: 'Orders',
      formatVersion: 1,
      content: '{"formatVersion":1}',
      sourceRefs: [
        { type: 'table', path: 'my::Db', element: 'S.T' },
        { type: 'dataProductAccessPoint', path: 'my::Product', element: 'ap1' },
      ],
    });

    await store.saveCube(STORED.id, 3, draft);
    expect(put.mock.calls[0]?.[0]).toBe(
      `http://engine/api/pure/v1/query/cube/${STORED.id}`,
    );
    expect(put.mock.calls[0]?.[1]).toEqual({
      version: 3,
      name: 'Orders',
      formatVersion: 1,
      content: '{"formatVersion":1}',
      sourceRefs: [
        { type: 'table', path: 'my::Db', element: 'S.T' },
        { type: 'dataProductAccessPoint', path: 'my::Product', element: 'ap1' },
      ],
    });

    await store.deleteCube(STORED.id, 3);
    expect(del.mock.calls[0]?.[0]).toBe(
      `http://engine/api/pure/v1/query/cube/${STORED.id}`,
    );
    // the version goes in the query parameters, not the headers
    expect(del.mock.calls[0]?.[3]).toBeUndefined();
    expect(del.mock.calls[0]?.[4]).toEqual({ version: 3 });
  });

  test('Lists summaries, without a spec', async () => {
    const store = createStore();
    const { content: _content, ...summary } = STORED;
    jest.spyOn(store.client, 'post').mockResolvedValue([summary] as never);
    const found = await store.searchCubes({});
    expect(found).toHaveLength(1);
    expect(found[0]).toBeInstanceOf(SavedCubeSummary);
    expect(found[0]).not.toBeInstanceOf(SavedCube);
    expect(found[0]?.name).toBe('Orders "FR"');
  });

  test('Says what failed, from the status and the store’s message', () => {
    const kindOf = (error: unknown): [CubeStoreErrorKind, string] => {
      const storeError = V1_toCubeStoreError(error);
      return [storeError.kind, storeError.message];
    };
    const message = (text: string) => ({ message: text });
    expect(
      kindOf(
        clientError(
          409,
          message(
            "Cannot change version 1 of cube 'a': its current version is 2.",
          ),
        ),
      ),
    ).toEqual([
      CubeStoreErrorKind.CONFLICT,
      "Cannot change version 1 of cube 'a': its current version is 2.",
    ]);
    expect(kindOf(clientError(403, message('Only current owners…')))).toEqual([
      CubeStoreErrorKind.FORBIDDEN,
      'Only current owners…',
    ]);
    expect(kindOf(clientError(401, message('Sign in')))).toEqual([
      CubeStoreErrorKind.FORBIDDEN,
      'Sign in',
    ]);
    expect(kindOf(clientError(404, message("Can't find cube 'a'")))).toEqual([
      CubeStoreErrorKind.NOT_FOUND,
      "Can't find cube 'a'",
    ]);
    // a route the engine doesn't have: an engine without the store
    expect(kindOf(clientError(404, '<html>Not Found</html>'))).toEqual([
      CubeStoreErrorKind.UNAVAILABLE,
      'This engine has no Cube store',
    ]);
    expect(
      kindOf(clientError(400, message('Cube name is missing or empty'))),
    ).toEqual([CubeStoreErrorKind.INVALID, 'Cube name is missing or empty']);
    expect(
      kindOf(
        clientError(
          500,
          message(
            'RuntimeException: Cube store MongoDB database has not been configured properly',
          ),
        ),
      ),
    ).toEqual([
      CubeStoreErrorKind.UNAVAILABLE,
      'RuntimeException: Cube store MongoDB database has not been configured properly',
    ]);
    expect(kindOf(clientError(502))).toEqual([
      CubeStoreErrorKind.UNAVAILABLE,
      'The Cube store failed (HTTP 502)',
    ]);
    expect(kindOf(new TypeError('Failed to fetch'))).toEqual([
      CubeStoreErrorKind.UNAVAILABLE,
      "The Cube store couldn't be reached: Failed to fetch",
    ]);
  });

  test('Refuses an answer it cannot read', async () => {
    const store = createStore();
    const get = jest.spyOn(store.client, 'get');
    get.mockResolvedValueOnce({ ...STORED, content: undefined } as never);
    await expect(store.getCube('a')).rejects.toThrow(
      'The Cube store answered a cube without its spec',
    );
    get.mockResolvedValueOnce({ ...STORED, version: undefined } as never);
    await expect(store.getCube('a')).rejects.toThrow(
      'The Cube store answered a cube without its version',
    );
    jest.spyOn(store.client, 'post').mockResolvedValue({} as never);
    const failure = await store
      .searchCubes({})
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CubeStoreError);
    expect((failure as CubeStoreError).message).toBe(
      'The Cube store answered a search with no list',
    );
  });
});
