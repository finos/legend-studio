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
import { runCubeStoreContract } from '../__test-utils__/CubeStoreContract.js';
import {
  InMemoryCubeStore,
  TEST_CUBE_DEPLOYMENT,
} from '../__test-utils__/InMemoryCubeStore.js';
import {
  CubeDeploymentOwnership,
  CubeDraft,
  CubeStoreError,
  CubeStoreErrorKind,
} from '../graph-manager/CubeStore.js';

runCubeStoreContract('in memory, without deployments checked', () => {
  const store = new InMemoryCubeStore('alice');
  return {
    store,
    user: 'alice',
    otherUser: store.asUser('bob'),
    deployment: TEST_CUBE_DEPLOYMENT,
  };
});

runCubeStoreContract('in memory, with deployments checked', () => {
  const store = new InMemoryCubeStore('alice');
  store.setDeploymentMembers(TEST_CUBE_DEPLOYMENT, ['alice']);
  return {
    store,
    user: 'alice',
    otherUser: store.asUser('bob'),
    deployment: TEST_CUBE_DEPLOYMENT,
  };
});

const owned = new CubeDeploymentOwnership(TEST_CUBE_DEPLOYMENT);

const draft = (name: string): CubeDraft =>
  new CubeDraft(name, 1, `{"formatVersion":1,"name":"${name}"}`, []);

describe('The in-memory Cube store', () => {
  test("Refuses with the engine's messages", async () => {
    const store = new InMemoryCubeStore('alice');
    const created = await store.createCube(draft('A'), owned);
    await store.saveCube(created.id, 1, draft('B'));
    await expect(store.saveCube(created.id, 1, draft('C'))).rejects.toThrow(
      `Cannot change version 1 of cube 'cube-1': its current version is 2.`,
    );
    await expect(
      store.asUser('bob').saveCube(created.id, 2, draft('C')),
    ).rejects.toThrow(
      "Only this cube's creator, alice, can change it: this engine can't check who belongs to deployment 1234, which owns it.",
    );
    await expect(store.getCube('nope')).rejects.toThrow(
      `Can't find cube 'nope'`,
    );
    expect(store.getVersions(created.id).map((cube) => cube.name)).toEqual([
      'A',
      'B',
    ]);
  });

  test('Checks deployments once told their members, as an engine with a verifier', async () => {
    const store = new InMemoryCubeStore('alice');
    store.setDeploymentMembers(TEST_CUBE_DEPLOYMENT, ['alice', 'bob']);
    await expect(
      store.asUser('carol').createCube(draft('A'), owned),
    ).rejects.toThrow(
      "A cube can only be given to a deployment you are a member of, and you aren't a member of deployment 1234.",
    );
    const created = await store.createCube(draft('A'), owned);
    // any member saves it, not only its creator
    expect(
      (await store.asUser('bob').saveCube(created.id, 1, draft('B'))).updatedBy,
    ).toBe('bob');
    await expect(
      store.asUser('carol').deleteCube(created.id, 2),
    ).rejects.toThrow(
      'Only members of deployment 1234, which owns this cube, can change it.',
    );
  });

  test('Lists the latest saved first, by deployment or creator, at most the limit', async () => {
    const store = new InMemoryCubeStore('alice');
    await store.createCube(draft('First'), owned);
    await store
      .asUser('bob')
      .createCube(draft('Second'), new CubeDeploymentOwnership('Rates.EU'));
    await store.createCube(draft('Third'), owned);
    expect((await store.searchCubes({})).map((cube) => cube.name)).toEqual([
      'Third',
      'Second',
      'First',
    ]);
    expect(
      (await store.searchCubes({ deployment: 'Rates.EU' })).map(
        (cube) => cube.name,
      ),
    ).toEqual(['Second']);
    expect(
      (await store.searchCubes({ creator: 'alice' })).map((cube) => cube.name),
    ).toEqual(['Third', 'First']);
    expect(
      (await store.searchCubes({ searchTerm: 'rates.' })).map(
        (cube) => cube.name,
      ),
    ).toEqual(['Second']);
    expect(await store.searchCubes({ limit: 1 })).toHaveLength(1);
  });

  test('Fails the next call when told, and holds answers until released', async () => {
    const store = new InMemoryCubeStore('alice');
    store.failNext(
      CubeStoreErrorKind.UNAVAILABLE,
      'This engine has no Cube store',
    );
    const failure = await store
      .searchCubes({})
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CubeStoreError);
    expect((failure as CubeStoreError).kind).toBe(
      CubeStoreErrorKind.UNAVAILABLE,
    );
    expect(await store.searchCubes({})).toEqual([]);

    store.hold();
    let answered = false;
    const pending = store.createCube(draft('Held'), owned).then(() => {
      answered = true;
    });
    await Promise.resolve();
    expect(answered).toBe(false);
    store.releaseHeld();
    await pending;
    expect(answered).toBe(true);
    expect(store.calls).toEqual(['search ', 'search ', 'create Held']);
  });
});
