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

import type { DepotServerClient } from '@finos/legend-server-depot';
import type { PlainObject } from '@finos/legend-shared';
import type { CubeModelOutline } from '../../../CubeEngine.js';
import {
  type CubeProjectCoordinates,
  isCubeMovingProjectVersion,
} from '../../../CubeProject.js';
import type {
  CubeProjectCatalog,
  CubeProjectSummary,
} from '../../../CubeProjectCatalog.js';
import { V1_buildCubeModelOutline } from './V1_CubeModelOutlineBuilder.js';

/** Versions newest first, by number part by part, so 1.10.0 comes before 1.9.0 */
export const V1_compareCubeProjectVersionsNewestFirst = (
  left: string,
  right: string,
): number => {
  const parts = (version: string): number[] =>
    version.split(/[.-]/u).map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parts(left), parts(right)];
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (b[index] ?? 0) - (a[index] ?? 0);
    if (difference) {
      return difference;
    }
  }
  return 0;
};

/** The paths of a model's Databases */
const databasePathsOf = (modelData: PlainObject): Set<string> =>
  new Set(
    (Array.isArray(modelData.elements) ? modelData.elements : [])
      .filter(
        (element: PlainObject) =>
          element._type === 'relational' &&
          typeof element.package === 'string' &&
          typeof element.name === 'string',
      )
      .map(
        (element: PlainObject) =>
          `${element.package as string}::${element.name as string}`,
      ),
  );

/**
 * Lists projects, versions and outlines from the host's depot. An outline is
 * read once per project version and page: a release doesn't change
 */
export class V1_LegendCubeProjectCatalog implements CubeProjectCatalog {
  private readonly depotServerClient: DepotServerClient;
  private readonly outlines = new Map<string, Promise<CubeModelOutline>>();

  constructor(depotServerClient: DepotServerClient) {
    this.depotServerClient = depotServerClient;
  }

  async listProjects(): Promise<readonly CubeProjectSummary[]> {
    const projects = await this.depotServerClient.getProjects();
    return projects
      .filter(
        (project) =>
          typeof project.groupId === 'string' &&
          typeof project.artifactId === 'string',
      )
      .map((project) => ({
        groupId: project.groupId as string,
        artifactId: project.artifactId as string,
      }))
      .sort((left, right) =>
        `${left.groupId}:${left.artifactId}`.localeCompare(
          `${right.groupId}:${right.artifactId}`,
        ),
      );
  }

  async listVersions(project: CubeProjectSummary): Promise<readonly string[]> {
    const versions = await this.depotServerClient.getVersions(
      project.groupId,
      project.artifactId,
      false,
    );
    return versions
      .filter((version) => !isCubeMovingProjectVersion(version))
      .sort(V1_compareCubeProjectVersionsNewestFirst);
  }

  loadOutline(project: CubeProjectCoordinates): Promise<CubeModelOutline> {
    const key = JSON.stringify([
      project.groupId,
      project.artifactId,
      project.versionId,
    ]);
    let outline = this.outlines.get(key);
    if (!outline) {
      outline = this.readOutline(project);
      // a failed read is tried again next time
      outline.catch(() => this.outlines.delete(key));
      this.outlines.set(key, outline);
    }
    return outline;
  }

  private async readOutline(
    project: CubeProjectCoordinates,
  ): Promise<CubeModelOutline> {
    const [own, withDependencies] = await Promise.all([
      this.depotServerClient.getPureModelContextData(
        project.groupId,
        project.artifactId,
        project.versionId,
        false,
      ),
      this.depotServerClient.getPureModelContextData(
        project.groupId,
        project.artifactId,
        project.versionId,
        true,
      ),
    ]);
    const ownDatabases = databasePathsOf(own);
    const outline = V1_buildCubeModelOutline(withDependencies);
    return {
      ...outline,
      databases: outline.databases.filter((database) =>
        ownDatabases.has(database.path),
      ),
    };
  }
}
