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

// The Cube store (PLAN §11.13): where a host keeps saved cubes. The page reads
// and writes them through this port only; Legend's implementation calls the
// engine's Cube store, and tests use an in-memory one.

/**
 * A source a saved cube reads, kept beside its spec so cubes can be searched
 * by it: a table `{type: 'table', path: <database>, element: '<schema>.<table>',
 * project?: '<group>:<artifact>'}`, a data product's access point, an ingest
 * data set
 */
export class CubeSourceRef {
  readonly type: string;
  readonly path: string;
  readonly element: string | undefined;
  readonly project: string | undefined;

  constructor(type: string, path: string, element?: string, project?: string) {
    this.type = type;
    this.path = path;
    this.element = element;
    this.project = project;
  }
}

/** A saved cube, as a search lists it: everything but its spec */
export class SavedCubeSummary {
  /** Made by the store, never reused */
  readonly id: string;
  /** 1 when created, one more on each save; a save sends the version it read */
  readonly version: number;
  readonly name: string;
  /** Who may change it, the creator first */
  readonly owners: readonly string[];
  readonly tags: readonly string[];
  readonly formatVersion: number;
  readonly sourceRefs: readonly CubeSourceRef[];
  readonly createdBy: string | undefined;
  /** In epoch milliseconds */
  readonly createdAt: number | undefined;
  readonly updatedBy: string | undefined;
  /** In epoch milliseconds */
  readonly updatedAt: number | undefined;

  constructor(fields: {
    id: string;
    version: number;
    name: string;
    owners: readonly string[];
    tags: readonly string[];
    formatVersion: number;
    sourceRefs: readonly CubeSourceRef[];
    createdBy?: string | undefined;
    createdAt?: number | undefined;
    updatedBy?: string | undefined;
    updatedAt?: number | undefined;
  }) {
    this.id = fields.id;
    this.version = fields.version;
    this.name = fields.name;
    this.owners = fields.owners;
    this.tags = fields.tags;
    this.formatVersion = fields.formatVersion;
    this.sourceRefs = fields.sourceRefs;
    this.createdBy = fields.createdBy;
    this.createdAt = fields.createdAt;
    this.updatedBy = fields.updatedBy;
    this.updatedAt = fields.updatedAt;
  }
}

/** A saved cube with its spec, as opened or saved */
export class SavedCube extends SavedCubeSummary {
  /** The spec's JSON (PLAN §10.3), exactly as saved */
  readonly content: string;

  constructor(
    fields: ConstructorParameters<typeof SavedCubeSummary>[0] & {
      content: string;
    },
  ) {
    super(fields);
    this.content = fields.content;
  }
}

/** What a save writes: the spec, its name and format version, and the sources it reads */
export class CubeDraft {
  readonly name: string;
  readonly formatVersion: number;
  readonly content: string;
  readonly sourceRefs: readonly CubeSourceRef[];

  constructor(
    name: string,
    formatVersion: number,
    content: string,
    sourceRefs: readonly CubeSourceRef[],
  ) {
    this.name = name;
    this.formatVersion = formatVersion;
    this.content = content;
    this.sourceRefs = sourceRefs;
  }
}

/** A search of the store; what is given narrows it */
export interface CubeSearch {
  /** The id exactly, or part of the name or of an owner, in any case */
  readonly searchTerm?: string | undefined;
  /** Cubes this user owns */
  readonly owner?: string | undefined;
  /** At most 100, the store's cap */
  readonly limit?: number | undefined;
}

export enum CubeStoreErrorKind {
  /** The cube was saved elsewhere since it was read */
  CONFLICT = 'conflict',
  /** The caller isn't one of its owners, or isn't signed in */
  FORBIDDEN = 'forbidden',
  /** No such cube, or it was deleted */
  NOT_FOUND = 'notFound',
  /** The store refused what was sent */
  INVALID = 'invalid',
  /** The store can't be reached, or the host's engine has none */
  UNAVAILABLE = 'unavailable',
}

export class CubeStoreError extends Error {
  readonly kind: CubeStoreErrorKind;

  constructor(kind: CubeStoreErrorKind, message: string) {
    super(message);
    this.name = 'CubeStoreError';
    this.kind = kind;
  }
}

/**
 * Saved cubes. Every change sends the version it read, and the store refuses
 * a cube saved since (`CONFLICT`) rather than overwrite it; only owners change
 * a cube (`FORBIDDEN`). Failures are `CubeStoreError`s.
 */
export interface CubeStore {
  /** A new cube at version 1, the caller its first owner */
  createCube(draft: CubeDraft): Promise<SavedCube>;
  /** Saves over the version read, and answers the next version */
  saveCube(id: string, version: number, draft: CubeDraft): Promise<SavedCube>;
  /** The latest version; opening it is recorded */
  getCube(id: string): Promise<SavedCube>;
  /** Cubes not deleted, the latest saved first, without their spec */
  searchCubes(search: CubeSearch): Promise<readonly SavedCubeSummary[]>;
  /** Deletes softly: the cube is no longer read, searched or saved */
  deleteCube(id: string, version: number): Promise<void>;
}
