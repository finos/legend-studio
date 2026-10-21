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

import {
  type CubeDraft,
  type CubeSearch,
  type CubeStore,
  CubeStoreError,
  CubeStoreErrorKind,
  SavedCube,
  SavedCubeSummary,
} from '../graph-manager/CubeStore.js';

const MAX_SEARCH_RESULTS = 100;

interface StoredEntry {
  latest: SavedCube;
  deleted: boolean;
}

/** The data callers of one in-memory store share */
class InMemoryCubeStoreData {
  readonly cubes = new Map<string, StoredEntry>();
  readonly versions = new Map<string, SavedCube[]>();
  nextId = 1;
  now = 1_700_000_000_000;
}

/**
 * The engine's Cube store in memory, for tests (PLAN §11.13): the same
 * refusals and messages (a version saved since is a conflict, only owners
 * change a cube, a deleted cube is gone), ids `cube-1`, `cube-2`…, and a
 * clock that moves one second per change. `asUser` is another caller on the
 * same cubes; `failNext` makes the next call fail; `hold` keeps answers until
 * released, to see a page's pending states.
 */
export class InMemoryCubeStore implements CubeStore {
  readonly user: string;
  private readonly data: InMemoryCubeStoreData;
  private nextFailure: CubeStoreError | undefined;
  private held: Promise<void> | undefined;
  private release: (() => void) | undefined;
  /** Every call made, e.g. `save cube-1@1`, in order */
  readonly calls: string[];

  constructor(user = 'alice', data?: InMemoryCubeStoreData, calls?: string[]) {
    this.user = user;
    this.data = data ?? new InMemoryCubeStoreData();
    this.calls = calls ?? [];
  }

  /** Another caller on the same cubes */
  asUser(user: string): InMemoryCubeStore {
    return new InMemoryCubeStore(user, this.data, this.calls);
  }

  /** The next call fails with this error */
  failNext(kind: CubeStoreErrorKind, message: string): void {
    this.nextFailure = new CubeStoreError(kind, message);
  }

  /** Answers wait until `releaseHeld()` */
  hold(): void {
    this.held = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  releaseHeld(): void {
    this.release?.();
    this.held = undefined;
    this.release = undefined;
  }

  /** Every saved version of a cube, oldest first */
  getVersions(id: string): readonly SavedCube[] {
    return this.data.versions.get(id) ?? [];
  }

  private async begin(call: string): Promise<void> {
    this.calls.push(call);
    if (this.held) {
      await this.held;
    }
    const failure = this.nextFailure;
    if (failure) {
      this.nextFailure = undefined;
      throw failure;
    }
  }

  private tick(): number {
    this.data.now += 1000;
    return this.data.now;
  }

  private record(cube: SavedCube): SavedCube {
    this.data.versions.set(cube.id, [...this.getVersions(cube.id), cube]);
    return cube;
  }

  private changeable(id: string, version: number): StoredEntry {
    const entry = this.data.cubes.get(id);
    if (!entry || entry.deleted) {
      throw new CubeStoreError(
        CubeStoreErrorKind.NOT_FOUND,
        `Can't find cube '${id}'`,
      );
    }
    if (!entry.latest.owners.includes(this.user)) {
      throw new CubeStoreError(
        CubeStoreErrorKind.FORBIDDEN,
        `Only current owners can change this cube. Current owners are ${entry.latest.owners.join(', ')}.`,
      );
    }
    if (entry.latest.version !== version) {
      throw new CubeStoreError(
        CubeStoreErrorKind.CONFLICT,
        `Cannot change version ${version} of cube '${id}': its current version is ${entry.latest.version}.`,
      );
    }
    return entry;
  }

  async createCube(draft: CubeDraft): Promise<SavedCube> {
    await this.begin(`create ${draft.name}`);
    const now = this.tick();
    const cube = new SavedCube({
      id: `cube-${this.data.nextId++}`,
      version: 1,
      name: draft.name.trim(),
      owners: [this.user],
      tags: [],
      formatVersion: draft.formatVersion,
      content: draft.content,
      sourceRefs: draft.sourceRefs,
      createdBy: this.user,
      createdAt: now,
      updatedBy: this.user,
      updatedAt: now,
    });
    this.data.cubes.set(cube.id, { latest: cube, deleted: false });
    return this.record(cube);
  }

  async saveCube(
    id: string,
    version: number,
    draft: CubeDraft,
  ): Promise<SavedCube> {
    await this.begin(`save ${id}@${version}`);
    const entry = this.changeable(id, version);
    const cube = new SavedCube({
      ...entry.latest,
      version: version + 1,
      name: draft.name.trim(),
      formatVersion: draft.formatVersion,
      content: draft.content,
      sourceRefs: draft.sourceRefs,
      updatedBy: this.user,
      updatedAt: this.tick(),
    });
    entry.latest = cube;
    return this.record(cube);
  }

  async getCube(id: string): Promise<SavedCube> {
    await this.begin(`get ${id}`);
    const entry = this.data.cubes.get(id);
    if (!entry || entry.deleted) {
      throw new CubeStoreError(
        CubeStoreErrorKind.NOT_FOUND,
        `Can't find cube '${id}'`,
      );
    }
    return entry.latest;
  }

  async searchCubes(search: CubeSearch): Promise<readonly SavedCubeSummary[]> {
    await this.begin(`search ${search.searchTerm ?? ''}`);
    const term = search.searchTerm?.trim().toLowerCase() ?? '';
    return Array.from(this.data.cubes.values())
      .filter((entry) => !entry.deleted)
      .map((entry) => entry.latest)
      .filter(
        (cube) =>
          !term ||
          cube.id === search.searchTerm?.trim() ||
          cube.name.toLowerCase().includes(term) ||
          cube.owners.some((owner) => owner.toLowerCase().includes(term)),
      )
      .filter((cube) => !search.owner || cube.owners.includes(search.owner))
      .sort(
        (left, right) =>
          (right.updatedAt ?? 0) - (left.updatedAt ?? 0) ||
          left.id.localeCompare(right.id),
      )
      .slice(
        0,
        Math.min(search.limit ?? MAX_SEARCH_RESULTS, MAX_SEARCH_RESULTS),
      )
      .map((cube) => {
        // a summary, as the engine answers it: no spec
        const { content: _content, ...fields } = cube;
        return new SavedCubeSummary(fields);
      });
  }

  async deleteCube(id: string, version: number): Promise<void> {
    await this.begin(`delete ${id}@${version}`);
    this.changeable(id, version).deleted = true;
  }
}
