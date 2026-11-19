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

import { V1_EngineServerClient } from '@finos/legend-graph';
import {
  NetworkClientError,
  type PlainObject,
  type TracerService,
} from '@finos/legend-shared';
import {
  CubeDeploymentOwnership,
  type CubeDraft,
  type CubeOwnership,
  type CubeSearch,
  CubeSourceRef,
  type CubeStore,
  CubeStoreError,
  CubeStoreErrorKind,
  SavedCube,
  SavedCubeSummary,
} from '../../../CubeStore.js';
import type { CubeEngineClientSettings } from '../../../CubeEngineClientSettings.js';
import type { V1_CubeEngineConfig } from './V1_LegendCubeEngine.js';
import {
  V1_CubeDeploymentOwnership,
  type V1_CubeOwnership,
  V1_CubeSearchSpecification,
  V1_CubeSourceRef,
  V1_StoredCube,
} from './V1_StoredCube.js';

// The engine's Cube store (PLAN §11.13), on the engine Legend Query keeps its
// own queries on: `${queryBaseUrl ?? baseUrl}/pure/v1/query/cube`, as
// `V1_EngineServerClient`'s Data Cube methods build theirs.

/** Why a store call failed, from the engine's status and `{message}` */
export const V1_toCubeStoreError = (error: unknown): CubeStoreError => {
  if (error instanceof CubeStoreError) {
    return error;
  }
  if (error instanceof NetworkClientError) {
    const status = error.response.status;
    const payload = error.payload;
    const raw =
      payload && typeof payload === 'object' ? payload.message : undefined;
    const message =
      typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
    switch (status) {
      case 409:
        return new CubeStoreError(
          CubeStoreErrorKind.CONFLICT,
          message ?? 'The cube was saved elsewhere since it was opened',
        );
      case 401:
      case 403:
        return new CubeStoreError(
          CubeStoreErrorKind.FORBIDDEN,
          message ??
            'Only members of the deployment that owns the cube can change it',
        );
      case 404:
        // a 404 without the store's message is a route the engine doesn't have
        return message
          ? new CubeStoreError(CubeStoreErrorKind.NOT_FOUND, message)
          : new CubeStoreError(
              CubeStoreErrorKind.UNAVAILABLE,
              'This engine has no Cube store',
            );
      case 400:
        return new CubeStoreError(
          CubeStoreErrorKind.INVALID,
          message ?? 'The Cube store refused the cube',
        );
      default:
        return new CubeStoreError(
          CubeStoreErrorKind.UNAVAILABLE,
          message ?? `The Cube store failed (HTTP ${status})`,
        );
    }
  }
  return new CubeStoreError(
    CubeStoreErrorKind.UNAVAILABLE,
    error instanceof Error && error.message
      ? `The Cube store couldn't be reached: ${error.message}`
      : `The Cube store couldn't be reached`,
  );
};

const unreadable = (what: string): CubeStoreError =>
  new CubeStoreError(
    CubeStoreErrorKind.UNAVAILABLE,
    `The Cube store answered a cube without its ${what}`,
  );

const readSourceRefs = (
  sourceRefs: V1_CubeSourceRef[] | undefined,
): CubeSourceRef[] =>
  (sourceRefs ?? []).map(
    (ref) => new CubeSourceRef(ref.type, ref.path, ref.element, ref.project),
  );

const V1_buildCubeOwnership = (
  ownership: V1_CubeOwnership | undefined,
): CubeOwnership => {
  if (ownership instanceof V1_CubeDeploymentOwnership) {
    return new CubeDeploymentOwnership(ownership.identifier);
  }
  throw unreadable('owner');
};

const V1_transformCubeOwnership = (
  ownership: CubeOwnership,
): V1_CubeOwnership => {
  if (ownership instanceof CubeDeploymentOwnership) {
    const deployment = new V1_CubeDeploymentOwnership();
    deployment.identifier = ownership.identifier;
    return deployment;
  }
  throw new CubeStoreError(
    CubeStoreErrorKind.INVALID,
    `Can't save a cube owned by ${ownership.label}`,
  );
};

/** The fields every answer has; a missing one is an unreadable answer */
const readSummaryFields = (
  cube: V1_StoredCube,
): ConstructorParameters<typeof SavedCubeSummary>[0] => {
  if (!cube.id) {
    throw unreadable('id');
  }
  if (typeof cube.version !== 'number') {
    throw unreadable('version');
  }
  return {
    id: cube.id,
    version: cube.version,
    name: cube.name,
    ownership: V1_buildCubeOwnership(cube.ownership),
    tags: cube.tags ?? [],
    formatVersion: cube.formatVersion,
    sourceRefs: readSourceRefs(cube.sourceRefs),
    createdBy: cube.audit?.createdBy,
    createdAt: cube.audit?.createdAt,
    updatedBy: cube.audit?.updatedBy,
    updatedAt: cube.audit?.updatedAt,
  };
};

export const V1_buildSavedCubeSummary = (
  json: PlainObject<V1_StoredCube>,
): SavedCubeSummary =>
  new SavedCubeSummary(
    readSummaryFields(V1_StoredCube.serialization.fromJson(json)),
  );

export const V1_buildSavedCube = (
  json: PlainObject<V1_StoredCube>,
): SavedCube => {
  const cube = V1_StoredCube.serialization.fromJson(json);
  if (typeof cube.content !== 'string') {
    throw unreadable('spec');
  }
  return new SavedCube({ ...readSummaryFields(cube), content: cube.content });
};

/** What a create or a save sends: the draft, with the ownership for a create, or the version read for a save */
export const V1_serializeCubeDraft = (
  draft: CubeDraft,
  change: { ownership: CubeOwnership } | { version: number },
): PlainObject<V1_StoredCube> => {
  const cube = new V1_StoredCube();
  if ('ownership' in change) {
    cube.ownership = V1_transformCubeOwnership(change.ownership);
  } else {
    cube.version = change.version;
  }
  cube.name = draft.name;
  cube.formatVersion = draft.formatVersion;
  cube.content = draft.content;
  cube.sourceRefs = draft.sourceRefs.map((ref) => {
    const sourceRef = new V1_CubeSourceRef();
    sourceRef.type = ref.type;
    sourceRef.path = ref.path;
    sourceRef.element = ref.element;
    sourceRef.project = ref.project;
    return sourceRef;
  });
  return V1_StoredCube.serialization.toJson(cube);
};

/** A list of summaries, which a search or a history answers */
const readSummaries = (
  answer: unknown,
  what: string,
): readonly SavedCubeSummary[] => {
  if (!Array.isArray(answer)) {
    throw new CubeStoreError(
      CubeStoreErrorKind.UNAVAILABLE,
      `The Cube store answered a ${what} with no list`,
    );
  }
  return answer.map((cube: PlainObject<V1_StoredCube>) =>
    V1_buildSavedCubeSummary(cube),
  );
};

export class V1_LegendCubeStore implements CubeStore {
  readonly client: V1_EngineServerClient;
  /** The server the host keeps its queries on, when it isn't the engine's */
  private readonly queryBaseUrl: string | undefined;

  constructor(
    config: V1_CubeEngineConfig,
    tracerService: TracerService,
    clientSettings?: CubeEngineClientSettings,
  ) {
    this.client = new V1_EngineServerClient(config);
    // every call throws without one
    this.client.setTracerService(tracerService);
    // Dev Settings' engine URL applies here too, unless the host names a query server
    clientSettings?.register(this.client);
    this.queryBaseUrl = config.queryBaseUrl;
  }

  /** Read at each call, so a change of the engine's URL applies from the next request */
  private get storeUrl(): string {
    return `${this.queryBaseUrl ?? this.client.baseUrl}/pure/v1/query/cube`;
  }

  private cubeUrl(id: string): string {
    return `${this.storeUrl}/${encodeURIComponent(id)}`;
  }

  async createCube(
    draft: CubeDraft,
    ownership: CubeOwnership,
  ): Promise<SavedCube> {
    try {
      return V1_buildSavedCube(
        await this.client.post(
          this.storeUrl,
          V1_serializeCubeDraft(draft, { ownership }),
        ),
      );
    } catch (error) {
      throw V1_toCubeStoreError(error);
    }
  }

  async saveCube(
    id: string,
    version: number,
    draft: CubeDraft,
  ): Promise<SavedCube> {
    try {
      return V1_buildSavedCube(
        await this.client.put(
          this.cubeUrl(id),
          V1_serializeCubeDraft(draft, { version }),
        ),
      );
    } catch (error) {
      throw V1_toCubeStoreError(error);
    }
  }

  async getCube(id: string): Promise<SavedCube> {
    try {
      return V1_buildSavedCube(await this.client.get(this.cubeUrl(id)));
    } catch (error) {
      throw V1_toCubeStoreError(error);
    }
  }

  async getCubeHistory(id: string): Promise<readonly SavedCubeSummary[]> {
    try {
      return readSummaries(
        await this.client.get<PlainObject<V1_StoredCube>[]>(
          `${this.cubeUrl(id)}/history`,
        ),
        'history',
      );
    } catch (error) {
      throw V1_toCubeStoreError(error);
    }
  }

  async getCubeVersion(id: string, version: number): Promise<SavedCube> {
    try {
      return V1_buildSavedCube(
        await this.client.get(
          `${this.cubeUrl(id)}/version/${encodeURIComponent(version)}`,
        ),
      );
    } catch (error) {
      throw V1_toCubeStoreError(error);
    }
  }

  async searchCubes(search: CubeSearch): Promise<readonly SavedCubeSummary[]> {
    const specification = new V1_CubeSearchSpecification();
    specification.searchTerm = search.searchTerm;
    specification.deployment = search.deployment;
    specification.creator = search.creator;
    specification.limit = search.limit;
    try {
      return readSummaries(
        await this.client.post<PlainObject<V1_StoredCube>[]>(
          `${this.storeUrl}/search`,
          V1_CubeSearchSpecification.serialization.toJson(specification),
        ),
        'search',
      );
    } catch (error) {
      throw V1_toCubeStoreError(error);
    }
  }

  async deleteCube(id: string, version: number): Promise<void> {
    try {
      await this.client.delete(
        this.cubeUrl(id),
        undefined,
        undefined,
        undefined,
        { version },
      );
    } catch (error) {
      throw V1_toCubeStoreError(error);
    }
  }
}
