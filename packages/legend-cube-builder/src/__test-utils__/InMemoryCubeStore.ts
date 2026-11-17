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
  CubeDeploymentOwnership,
  type CubeDraft,
  type CubeOwnership,
  type CubeSearch,
  type CubeStore,
  CubeStoreError,
  CubeStoreErrorKind,
  SavedCube,
  SavedCubeSummary,
} from '../graph-manager/CubeStore.js';

const MAX_SEARCH_RESULTS = 100;
const MAX_TEXT_LENGTH = 255;

/** The deployment the page's tests save cubes to */
export const TEST_CUBE_DEPLOYMENT = '1234';

interface StoredEntry {
  latest: SavedCube;
  deleted: boolean;
}

/** The data callers of one in-memory store share */
class InMemoryCubeStoreData {
  readonly cubes = new Map<string, StoredEntry>();
  readonly versions = new Map<string, SavedCube[]>();
  /** Each deployment's members, once a test says who they are; until then only a cube's creator changes it */
  members: Map<string, ReadonlySet<string>> | undefined;
  nextId = 1;
  now = 1_700_000_000_000;
}

const describeOwnership = (ownership: CubeOwnership): string =>
  ownership instanceof CubeDeploymentOwnership
    ? `deployment ${ownership.identifier}`
    : 'no deployment';

/** A summary, as the engine answers it: no spec */
const toSummary = (cube: SavedCube): SavedCubeSummary => {
  const { content: _content, ...fields } = cube;
  return new SavedCubeSummary(fields);
};

/**
 * The engine's Cube store in memory, for tests (PLAN §11.13): the same
 * refusals and messages (a version saved since is a conflict, a deleted cube
 * is gone, and only its creator changes a cube, as on an engine that can't
 * check deployments, until `setDeploymentMembers` says who belongs to one),
 * ids `cube-1`, `cube-2`…, and a clock that moves one second per change.
 * `asUser` is another caller on the same cubes; `failNext` makes the next
 * call fail; `hold` keeps answers until released, to see a page's pending
 * states.
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

  /** The store checks deployments from now on, as an engine with a verifier: these are a deployment's members */
  setDeploymentMembers(identifier: string, users: readonly string[]): void {
    this.data.members = new Map(this.data.members).set(
      identifier,
      new Set(users),
    );
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

  private isMember(ownership: CubeOwnership): boolean {
    return (
      ownership instanceof CubeDeploymentOwnership &&
      Boolean(this.data.members?.get(ownership.identifier)?.has(this.user))
    );
  }

  private existing(id: string): StoredEntry {
    const entry = this.data.cubes.get(id);
    if (!entry || entry.deleted) {
      throw new CubeStoreError(
        CubeStoreErrorKind.NOT_FOUND,
        `Can't find cube '${id}'`,
      );
    }
    return entry;
  }

  private changeable(id: string, version: number): StoredEntry {
    const entry = this.existing(id);
    const { latest } = entry;
    if (!this.data.members && latest.createdBy !== this.user) {
      throw new CubeStoreError(
        CubeStoreErrorKind.FORBIDDEN,
        `Only this cube's creator, ${latest.createdBy}, can change it: this engine can't check who belongs to ${describeOwnership(latest.ownership)}, which owns it.`,
      );
    }
    if (this.data.members && !this.isMember(latest.ownership)) {
      throw new CubeStoreError(
        CubeStoreErrorKind.FORBIDDEN,
        `Only members of ${describeOwnership(latest.ownership)}, which owns this cube, can change it.`,
      );
    }
    if (latest.version !== version) {
      throw new CubeStoreError(
        CubeStoreErrorKind.CONFLICT,
        `Cannot change version ${version} of cube '${id}': its current version is ${latest.version}.`,
      );
    }
    return entry;
  }

  async createCube(
    draft: CubeDraft,
    ownership: CubeOwnership,
  ): Promise<SavedCube> {
    await this.begin(`create ${draft.name}`);
    if (!(ownership instanceof CubeDeploymentOwnership)) {
      throw new CubeStoreError(
        CubeStoreErrorKind.INVALID,
        "Cube ownership must be a deployment's",
      );
    }
    const identifier = ownership.identifier.trim();
    if (!identifier) {
      throw new CubeStoreError(
        CubeStoreErrorKind.INVALID,
        "Cube ownership's deployment identifier is missing or empty",
      );
    }
    if (identifier.length > MAX_TEXT_LENGTH) {
      throw new CubeStoreError(
        CubeStoreErrorKind.INVALID,
        `Cube ownership's deployment identifier is longer than ${MAX_TEXT_LENGTH} characters`,
      );
    }
    const owner = new CubeDeploymentOwnership(identifier);
    if (this.data.members && !this.isMember(owner)) {
      throw new CubeStoreError(
        CubeStoreErrorKind.FORBIDDEN,
        `A cube can only be given to a deployment you are a member of, and you aren't a member of deployment ${identifier}.`,
      );
    }
    const now = this.tick();
    const cube = new SavedCube({
      id: `cube-${this.data.nextId++}`,
      version: 1,
      name: draft.name.trim(),
      ownership: owner,
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
    return this.existing(id).latest;
  }

  async getCubeHistory(id: string): Promise<readonly SavedCubeSummary[]> {
    await this.begin(`history ${id}`);
    this.existing(id);
    return [...this.getVersions(id)].reverse().map(toSummary);
  }

  async getCubeVersion(id: string, version: number): Promise<SavedCube> {
    await this.begin(`get ${id}@${version}`);
    this.existing(id);
    const cube = this.getVersions(id).find(
      (candidate) => candidate.version === version,
    );
    if (!cube) {
      throw new CubeStoreError(
        CubeStoreErrorKind.NOT_FOUND,
        `Can't find version ${version} of cube '${id}'`,
      );
    }
    return cube;
  }

  async searchCubes(search: CubeSearch): Promise<readonly SavedCubeSummary[]> {
    await this.begin(`search ${search.searchTerm ?? ''}`);
    const term = search.searchTerm?.trim().toLowerCase() ?? '';
    const deploymentOf = (cube: SavedCube): string | undefined =>
      cube.ownership instanceof CubeDeploymentOwnership
        ? cube.ownership.identifier
        : undefined;
    return Array.from(this.data.cubes.values())
      .filter((entry) => !entry.deleted)
      .map((entry) => entry.latest)
      .filter(
        (cube) =>
          !term ||
          cube.id === search.searchTerm?.trim() ||
          cube.name.toLowerCase().includes(term) ||
          Boolean(deploymentOf(cube)?.toLowerCase().includes(term)),
      )
      .filter(
        (cube) =>
          search.deployment === undefined ||
          deploymentOf(cube) === search.deployment,
      )
      .filter(
        (cube) =>
          search.creator === undefined || cube.createdBy === search.creator,
      )
      .sort(
        (left, right) =>
          (right.updatedAt ?? 0) - (left.updatedAt ?? 0) ||
          left.id.localeCompare(right.id),
      )
      .slice(
        0,
        Math.min(search.limit ?? MAX_SEARCH_RESULTS, MAX_SEARCH_RESULTS),
      )
      .map(toSummary);
  }

  async deleteCube(id: string, version: number): Promise<void> {
    await this.begin(`delete ${id}@${version}`);
    this.changeable(id, version).deleted = true;
  }
}
