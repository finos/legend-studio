/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { type Entity, EntitiesWithOrigin } from '@finos/legend-storage';
import {
  type PlainObject,
  AbstractServerClient,
  HttpHeader,
  ContentType,
} from '@finos/legend-shared';
import type { DepotScope } from './models/DepotScope.js';
import {
  type ProjectDependencyCoordinates,
  ProjectVersionEntities,
} from './models/ProjectVersionEntities.js';
import type { StoredEntity } from './models/StoredEntity.js';
import type { RawProjectDependencyReport } from './models/RawProjectDependencyReport.js';
import type { ProjectVersionPlatformDependency } from './models/ProjectVersionPlatformDependency.js';
import type { VersionedProjectData } from './models/VersionedProjectData.js';
import type { StoreProjectData } from './models/StoreProjectData.js';
import { resolveVersion } from './DepotVersionAliases.js';
import type { StoredFileGeneration } from './models/StoredFileGeneration.js';

export interface DepotServerClientConfig {
  serverUrl: string;
}

export class DepotServerClient extends AbstractServerClient {
  constructor(config: DepotServerClientConfig) {
    super({
      baseUrl: config.serverUrl,
    });
  }

  // ------------------------------------------- Projects -------------------------------------------

  private _projects = (): string => `${this.baseUrl}/projects`;
  private _projectConfigurations = (): string =>
    `${this.baseUrl}/project-configurations`;
  private _project = (groupId: string, artifactId: string): string =>
    `${this._projects()}/${encodeURIComponent(groupId)}/${encodeURIComponent(
      artifactId,
    )}`;

  getProjects = (): Promise<PlainObject<StoreProjectData>[]> =>
    this.get(this._projectConfigurations());

  getProject = (
    groupId: string,
    artifactId: string,
  ): Promise<PlainObject<StoreProjectData>> =>
    this.get(
      `${this._projectConfigurations()}/${encodeURIComponent(
        groupId,
      )}/${encodeURIComponent(artifactId)}`,
    );

  // ------------------------------------------- Entities -------------------------------------------

  private _versions = (groupId: string, artifactId: string): string =>
    `${this._project(groupId, artifactId)}/versions`;
  private _version = (
    groupId: string,
    artifactId: string,
    version: string,
    classifier?: string,
  ): string =>
    `${this._versions(groupId, artifactId)}/${encodeURIComponent(version)}${classifier ? `/classifiers/${classifier}` : ``}`;

  getAllVersions = (groupId: string, artifactId: string): Promise<string[]> =>
    this.get(this._versions(groupId, artifactId));

  getVersionEntities = (
    groupId: string,
    artifactId: string,
    version: string,
    classifier?: string,
  ): Promise<PlainObject<Entity>[]> =>
    this.get(this._version(groupId, artifactId, version, classifier));

  getEntities(
    project: StoreProjectData,
    versionId: string,
    classifier?: string,
  ): Promise<PlainObject<Entity>[]> {
    return this.getVersionEntities(
      project.groupId,
      project.artifactId,
      resolveVersion(versionId),
      classifier,
    );
  }

  getVersionEntity = (
    groupId: string,
    artifactId: string,
    version: string,
    entityPath: string,
  ): Promise<PlainObject<Entity>> =>
    this.get(
      `${this._version(
        groupId,
        artifactId,
        version,
      )}/entities/${encodeURIComponent(entityPath)}`,
    );

  getEntity(
    project: StoreProjectData,
    versionId: string,
    entityPath: string,
  ): Promise<PlainObject<Entity>> {
    return this.getVersionEntity(
      project.groupId,
      project.artifactId,
      resolveVersion(versionId),
      entityPath,
    );
  }

  // NOTE: this is experimental API to get elements by classifier path
  DEPRECATED_getEntitiesByClassifierPath = (
    classifierPath: string,
    options?: {
      search?: string | undefined;
      scope?: DepotScope | undefined;
      limit?: number | undefined;
    },
  ): Promise<PlainObject<StoredEntity>[]> =>
    this.get(
      `${this.baseUrl}/entitiesByClassifierPath/${encodeURIComponent(
        classifierPath,
      )}`,
      undefined,
      undefined,
      {
        search: options?.search,
        scope: options?.scope,
        limit: options?.limit,
      },
    );

  getEntitiesByClassifier = (
    classifierPath: string,
    options?: {
      scope?: DepotScope | undefined;
    },
  ): Promise<PlainObject<StoredEntity>[]> =>
    this.get(
      `${this.baseUrl}/classifiers/${encodeURIComponent(
        classifierPath,
      )}/entities`,
      undefined,
      undefined,
      {
        scope: options?.scope,
      },
    );

  // ------------------------------------------- Dependants -------------------------------------------

  getAllDependantProjects = (
    groupId: string,
    artifactId: string,
  ): Promise<PlainObject<ProjectVersionPlatformDependency>[]> =>
    this.get(
      `${this._versions(groupId, artifactId)}/all/dependantProjects`,
      undefined,
      undefined,
    );

  getDependantProjects = (
    groupId: string,
    artifactId: string,
    version: string,
  ): Promise<PlainObject<ProjectVersionPlatformDependency>[]> =>
    this.get(
      `${this._version(groupId, artifactId, version)}/dependantProjects`,
      undefined,
      undefined,
    );

  async getIndexedDependantProjects(
    groupId: string,
    artifactId: string,
    version?: string,
  ): Promise<PlainObject<ProjectVersionPlatformDependency>[] | undefined> {
    const dependants = version
      ? await this.getDependantProjects(groupId, artifactId, version)
      : await this.getAllDependantProjects(groupId, artifactId);
    return dependants;
  }

  // ------------------------------------------- Dependencies -------------------------------------------

  getDependencyEntities = (
    groupId: string,
    artifactId: string,
    version: string,
    /**
     * Flag indicating if transitive dependencies should be returned.
     */
    transitive: boolean,
    /**
     * Flag indicating whether to return the root of the dependency tree.
     */
    includeOrigin: boolean,
    classifier?: string,
  ): Promise<PlainObject<ProjectVersionEntities>[]> =>
    this.get(
      `${this._version(groupId, artifactId, version)}${classifier ? `/classifiers/${classifier}` : ''}/dependencies`,
      undefined,
      undefined,
      {
        transitive,
        includeOrigin,
        versioned: false, // we don't need to add version prefix to entity path
      },
    );

  async getIndexedDependencyEntities(
    project: StoreProjectData,
    versionId: string,
    classifier?: string,
  ): Promise<Map<string, EntitiesWithOrigin>> {
    const dependencyEntitiesIndex = new Map<string, EntitiesWithOrigin>();
    const dependencies = await this.getDependencyEntities(
      project.groupId,
      project.artifactId,
      resolveVersion(versionId),
      true,
      false,
      classifier,
    );
    dependencies
      .map((v) => ProjectVersionEntities.serialization.fromJson(v))
      .forEach((dependencyInfo) => {
        dependencyEntitiesIndex.set(
          dependencyInfo.id,
          new EntitiesWithOrigin(
            dependencyInfo.groupId,
            dependencyInfo.artifactId,
            dependencyInfo.versionId,
            dependencyInfo.entities,
          ),
        );
      });
    return dependencyEntitiesIndex;
  }

  collectDependencyEntities = (
    /**
     * List of (direct) dependencies.
     */
    dependencies: PlainObject<ProjectDependencyCoordinates>[],
    /**
     * Flag indicating if transitive dependencies should be returned.
     */
    transitive: boolean,
    /**
     * Flag indicating whether to return the root of the dependency tree.
     */
    includeOrigin: boolean,
  ): Promise<PlainObject<ProjectVersionEntities>[]> =>
    this.post(
      `${this._projects()}/dependencies`,
      dependencies,
      undefined,
      undefined,
      {
        transitive,
        includeOrigin,
        versioned: false, // we don't need to add version prefix to entity path
      },
    );

  analyzeDependencyTree = (
    /**
     * List of (direct) dependencies.
     */
    dependencies: PlainObject<ProjectDependencyCoordinates>[],
  ): Promise<PlainObject<RawProjectDependencyReport>> =>
    this.post(`${this._projects()}/analyzeDependencyTree`, dependencies);

  // ------------------------------------------- File Generation -------------------------------------------

  private _generationContent = (): string =>
    `${this.baseUrl}/generationFileContent`;

  private _generations = (): string => `${this.baseUrl}/generations`;

  private _generationContentByGAV = (
    groupId: string,
    artifactId: string,
    versionId: string,
  ): string =>
    `${this._generationContent()}/${encodeURIComponent(
      groupId,
    )}/${encodeURIComponent(artifactId)}/versions/${encodeURIComponent(
      versionId,
    )}`;

  private _generationsByGAV = (
    groupId: string,
    artifactId: string,
    versionId: string,
  ): string =>
    `${this._generations()}/${encodeURIComponent(
      groupId,
    )}/${encodeURIComponent(artifactId)}/${encodeURIComponent(versionId)}`;

  getGenerationContentByPath = async (
    project: StoreProjectData,
    versionId: string,
    filePath: string,
  ): Promise<string> =>
    this.get(
      `${this._generationContentByGAV(
        project.groupId,
        project.artifactId,
        resolveVersion(versionId),
      )}/file/${encodeURIComponent(filePath)}`,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
    );

  getGenerationFilesByType = async (
    project: StoreProjectData,
    versionId: string,
    type: string,
  ): Promise<PlainObject<StoredFileGeneration>[]> =>
    this.get(
      `${this._generationsByGAV(
        project.groupId,
        project.artifactId,
        resolveVersion(versionId),
      )}/types/${encodeURIComponent(type)}`,
    );

  // ------------------------------------------- Versions -------------------------------------------

  private _versionedStoreProjectData = (
    groupId: string,
    artifactId: string,
  ): string =>
    `${this.baseUrl}/versions/${encodeURIComponent(
      groupId,
    )}/${encodeURIComponent(artifactId)}`;

  getVersions = (
    groupId: string,
    artifactId: string,
    /**
     * Flag indicating whether to return the snapshot versions or not
     */
    snapshots: boolean,
  ): Promise<string[]> =>
    this.get(
      `${this._project(groupId, artifactId)}/versions`,
      undefined,
      undefined,
      {
        snapshots: snapshots,
      },
    );

  getLatestVersion = (
    groupId: string,
    artifactId: string,
  ): Promise<PlainObject<VersionedProjectData>> =>
    this.get(`${this._versionedStoreProjectData(groupId, artifactId)}/latest`);

  getVersionedProjectData = (
    groupId: string,
    artifactId: string,
    versionId: string,
  ): Promise<PlainObject<VersionedProjectData>> =>
    this.get(
      `${this._versionedStoreProjectData(
        groupId,
        artifactId,
      )}/${encodeURIComponent(versionId)}`,
    );
}
