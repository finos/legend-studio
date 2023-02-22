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

import type { Entity } from '@finos/legend-storage';
import {
  type PlainObject,
  AbstractServerClient,
  HttpHeader,
  ContentType,
} from '@finos/legend-shared';
import { resolveProjectVersion } from './DepotVersionAliases.js';
import type { DepotScope } from './models/DepotScope.js';
import type { ProjectData } from './models/ProjectData.js';
import {
  type ProjectDependencyCoordinates,
  ProjectVersionEntities,
} from './models/ProjectVersionEntities.js';
import type { StoredEntity } from './models/StoredEntity.js';
import type { RawProjectDependencyReport } from './models/RawProjectDependencyReport.js';
import type { ProjectVersionPlatformDependency } from './models/ProjectVersionPlatformDependency.js';

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
  private _project = (groupId: string, artifactId: string): string =>
    `${this._projects()}/${encodeURIComponent(groupId)}/${encodeURIComponent(
      artifactId,
    )}`;
  private _projectById = (projectId: string): string =>
    `${this._projects()}/${encodeURIComponent(projectId)}`;

  getProjects = (): Promise<PlainObject<ProjectData>[]> =>
    this.get(this._projects());
  getProject = (
    groupId: string,
    artifactId: string,
  ): Promise<PlainObject<ProjectData>> =>
    this.get(this._project(groupId, artifactId));
  getProjectById = (projectId: string): Promise<PlainObject<ProjectData>[]> =>
    this.get(this._projectById(projectId));

  // ------------------------------------------- Entities -------------------------------------------

  private _versions = (groupId: string, artifactId: string): string =>
    `${this._project(groupId, artifactId)}/versions`;
  private _version = (
    groupId: string,
    artifactId: string,
    version: string,
  ): string =>
    `${this._versions(groupId, artifactId)}/${encodeURIComponent(version)}`;

  getAllVersions = (groupId: string, artifactId: string): Promise<string[]> =>
    this.get(this._versions(groupId, artifactId));

  getVersionEntities = (
    groupId: string,
    artifactId: string,
    version: string,
  ): Promise<PlainObject<Entity>[]> =>
    this.get(this._version(groupId, artifactId, version));

  getEntities(
    project: ProjectData,
    versionId: string,
  ): Promise<PlainObject<Entity>[]> {
    return this.getVersionEntities(
      project.groupId,
      project.artifactId,
      resolveProjectVersion(project, versionId),
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
    project: ProjectData,
    versionId: string,
    entityPath: string,
  ): Promise<PlainObject<Entity>> {
    return this.getVersionEntity(
      project.groupId,
      project.artifactId,
      resolveProjectVersion(project, versionId),
      entityPath,
    );
  }

  // NOTE: this is experimental API to get elements by classifier path
  getEntitiesByClassifierPath = (
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

  // ------------------------------------------- Dependants -------------------------------------------

  getDependantProjects = (
    groupId: string,
    artifactId: string,
    version?: string,
  ): Promise<PlainObject<ProjectVersionPlatformDependency>[]> => {
    if (!version) {
      return this.get(
        `${this._versions(groupId, artifactId)}/all/dependantProjects`,
        undefined,
        undefined,
      );
    }
    return this.get(
      `${this._version(groupId, artifactId, version)}/dependantProjects`,
      undefined,
      undefined,
    );
  };

  async getIndexedDependantProjects(
    groupId: string,
    artifactId: string,
    version?: string,
  ): Promise<PlainObject<ProjectVersionPlatformDependency>[] | undefined> {
    const dependants = await this.getDependantProjects(
      groupId,
      artifactId,
      version,
    );
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
  ): Promise<PlainObject<ProjectVersionEntities>[]> =>
    this.get(
      `${this._version(groupId, artifactId, version)}/dependencies`,
      undefined,
      undefined,
      {
        transitive,
        includeOrigin,
        versioned: false, // we don't need to add version prefix to entity path
      },
    );

  async getIndexedDependencyEntities(
    project: ProjectData,
    versionId: string,
  ): Promise<Map<string, Entity[]>> {
    const dependencyEntitiesIndex = new Map<string, Entity[]>();
    const dependencies = await this.getDependencyEntities(
      project.groupId,
      project.artifactId,
      resolveProjectVersion(project, versionId),
      true,
      false,
    );
    dependencies
      .map((v) => ProjectVersionEntities.serialization.fromJson(v))
      .forEach((dependencyInfo) => {
        dependencyEntitiesIndex.set(dependencyInfo.id, dependencyInfo.entities);
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

  getGenerationContentByPath = (
    project: ProjectData,
    versionId: string,
    filePath: string,
  ): Promise<string> =>
    this.get(
      `${this._generationContentByGAV(
        project.groupId,
        project.artifactId,
        resolveProjectVersion(project, versionId),
      )}/file/${encodeURIComponent(filePath)}`,
      {},
      { [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN },
    );
}
