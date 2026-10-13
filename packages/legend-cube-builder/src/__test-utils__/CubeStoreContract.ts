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
  CubeDraft,
  CubeSourceRef,
  type CubeStore,
  CubeStoreError,
  CubeStoreErrorKind,
  SavedCube,
} from '../graph-manager/CubeStore.js';

// What any `CubeStore` does (PLAN §11.13), run against the in-memory store in
// the core group and against the engine's store by hand (`cube-local`), so the
// in-memory store the page's tests use behaves as the engine's does.

export interface CubeStoreContractSubject {
  readonly store: CubeStore;
  /** The caller's user name */
  readonly user: string;
  /** Another caller on the same cubes; none when the store has one user (e.g. a local engine, `anonymous`) */
  readonly otherUser?: CubeStore | undefined;
}

/** A spec whose keys and nulls a store must keep as they are */
const contentNamed = (name: string, extra = ''): string =>
  `{"formatVersion":1,"name":${JSON.stringify(name)},"meta":{"a.b":null,"$x":{"z":1,"a":2}}${extra}}`;

const draftNamed = (name: string, extra = ''): CubeDraft =>
  new CubeDraft(name, 1, contentNamed(name, extra), [
    new CubeSourceRef('table', 'my::Database', 'NORTHWIND.ORDERS'),
  ]);

const refusal = async (
  action: Promise<unknown>,
): Promise<CubeStoreErrorKind | undefined> => {
  try {
    await action;
    return undefined;
  } catch (error) {
    expect(error).toBeInstanceOf(CubeStoreError);
    return (error as CubeStoreError).kind;
  }
};

export const runCubeStoreContract = (
  label: string,
  makeSubject: () => CubeStoreContractSubject,
): void => {
  describe(`The Cube store contract: ${label}`, () => {
    // a name no earlier run used, for stores that outlive a test
    const unique = (name: string): string =>
      `${name} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    test('Creates a cube at version 1, owned by its creator, and opens it exactly as saved', async () => {
      const { store, user } = makeSubject();
      const name = unique('French orders');
      const created = await store.createCube(draftNamed(name));
      expect(created.version).toBe(1);
      expect(created.name).toBe(name);
      expect(created.owners).toEqual([user]);
      expect(created.createdBy).toBe(user);
      expect(created.content).toBe(contentNamed(name));
      const opened = await store.getCube(created.id);
      expect(opened.id).toBe(created.id);
      expect(opened.content).toBe(contentNamed(name));
      expect(opened.formatVersion).toBe(1);
      expect(opened.sourceRefs).toEqual([
        new CubeSourceRef('table', 'my::Database', 'NORTHWIND.ORDERS'),
      ]);
    });

    test('Saves over the version read, and refuses a save over an older one', async () => {
      const { store } = makeSubject();
      const created = await store.createCube(draftNamed(unique('Orders')));
      const saved = await store.saveCube(
        created.id,
        1,
        draftNamed('Renamed', ',"query":{"nodes":[]}'),
      );
      expect(saved.id).toBe(created.id);
      expect(saved.version).toBe(2);
      expect(saved.name).toBe('Renamed');
      expect(
        await refusal(store.saveCube(created.id, 1, draftNamed('Lost'))),
      ).toBe(CubeStoreErrorKind.CONFLICT);
      const opened = await store.getCube(created.id);
      expect(opened.version).toBe(2);
      expect(opened.content).toBe(
        contentNamed('Renamed', ',"query":{"nodes":[]}'),
      );
    });

    test('Finds cubes by part of the name in any case, or by id, without their spec', async () => {
      const { store } = makeSubject();
      const name = unique('Quarterly TRADES');
      const created = await store.createCube(draftNamed(name));
      const byName = await store.searchCubes({
        searchTerm: name.toLowerCase(),
      });
      expect(byName.map((cube) => cube.id)).toEqual([created.id]);
      expect(byName[0]).not.toBeInstanceOf(SavedCube);
      expect(byName[0]?.name).toBe(name);
      const byId = await store.searchCubes({ searchTerm: created.id });
      expect(byId.map((cube) => cube.id)).toEqual([created.id]);
    });

    test('Deletes a cube at the version read: it can no longer be opened, found or saved', async () => {
      const { store } = makeSubject();
      const name = unique('Temporary');
      const created = await store.createCube(draftNamed(name));
      expect(await refusal(store.deleteCube(created.id, 2))).toBe(
        CubeStoreErrorKind.CONFLICT,
      );
      await store.deleteCube(created.id, 1);
      expect(await refusal(store.getCube(created.id))).toBe(
        CubeStoreErrorKind.NOT_FOUND,
      );
      expect(await store.searchCubes({ searchTerm: name })).toEqual([]);
      expect(
        await refusal(store.saveCube(created.id, 1, draftNamed(name))),
      ).toBe(CubeStoreErrorKind.NOT_FOUND);
      expect(await refusal(store.deleteCube(created.id, 1))).toBe(
        CubeStoreErrorKind.NOT_FOUND,
      );
    });

    test('Refuses a cube it does not have', async () => {
      const { store } = makeSubject();
      expect(await refusal(store.getCube('no-such-cube'))).toBe(
        CubeStoreErrorKind.NOT_FOUND,
      );
    });

    test('Lets only the owners change a cube', async () => {
      const { store, otherUser } = makeSubject();
      if (!otherUser) {
        return;
      }
      const created = await store.createCube(draftNamed(unique('Mine')));
      expect(
        await refusal(otherUser.saveCube(created.id, 1, draftNamed('Theirs'))),
      ).toBe(CubeStoreErrorKind.FORBIDDEN);
      expect(await refusal(otherUser.deleteCube(created.id, 1))).toBe(
        CubeStoreErrorKind.FORBIDDEN,
      );
      // anyone can open it
      expect((await otherUser.getCube(created.id)).version).toBe(1);
    });
  });
};
