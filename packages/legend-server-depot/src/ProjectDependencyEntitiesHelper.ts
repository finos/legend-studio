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
  HttpStatus,
  NetworkClientError,
  UnsupportedOperationError,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { EntitiesWithOrigin } from '@finos/legend-storage';
import type { DepotServerClient } from './DepotServerClient.js';
import {
  ProjectDependencyCoordinates,
  ProjectVersionEntities,
} from './models/ProjectVersionEntities.js';
import type { ProjectDependencyGraphReport } from './models/ProjectDependencyGraph.js';
import { RawProjectDependencyReport } from './models/RawProjectDependencyReport.js';
import { buildDependencyReport } from './ProjectDependencyGraphReportHelper.js';
import {
  MASTER_SNAPSHOT_ALIAS,
  SNAPSHOT_ALIAS,
  isSnapshotVersion,
  resolveVersion,
} from './DepotVersionAliases.js';
import { StoreProjectData } from './models/StoreProjectData.js';

/** A project's dependency as its SDLC configuration declares it (`ProjectDependency` has this shape). */
export interface DeclaredProjectDependency {
  groupId?: string | undefined;
  artifactId?: string | undefined;
  versionId: string;
  exclusions?:
    | { groupId?: string | undefined; artifactId?: string | undefined }[]
    | undefined;
}

export const DEPENDENCY_VERSION_CONFLICT_MESSAGE =
  'Depending on multiple versions of a project is not supported. Found conflicts:\n';

/** *dependencies* as the coordinates Depot takes, exclusions included. */
export const buildProjectDependencyCoordinates = (
  dependencies: DeclaredProjectDependency[],
): ProjectDependencyCoordinates[] =>
  dependencies.map((dependency) => {
    const exclusions = (dependency.exclusions ?? []).map((exclusion) => ({
      groupId: guaranteeNonNullable(exclusion.groupId),
      artifactId: guaranteeNonNullable(exclusion.artifactId),
    }));
    return new ProjectDependencyCoordinates(
      guaranteeNonNullable(dependency.groupId),
      guaranteeNonNullable(dependency.artifactId),
      dependency.versionId,
      exclusions.length ? exclusions : undefined,
    );
  });

const conflictMessage = (
  report: ProjectDependencyGraphReport | undefined,
  fetchedVersions: Map<string, Set<string>>,
): string => {
  if (report?.conflicts.length) {
    return (
      DEPENDENCY_VERSION_CONFLICT_MESSAGE +
      report.conflicts
        .map(
          (conflict) =>
            `project: ${conflict.groupId}:${conflict.artifactId}\nversions:[${conflict.versions
              .map((version) => version.versionId)
              .join(',')}]`,
        )
        .join('\n')
    );
  }
  return (
    DEPENDENCY_VERSION_CONFLICT_MESSAGE +
    Array.from(fetchedVersions.entries())
      .filter(([, versions]) => versions.size > 1)
      .map(
        ([project, versions]) =>
          `project: ${project}\n versions: ${Array.from(versions.values()).join(',')}`,
      )
      .join('\n\n')
  );
};

/**
 * The entities of *coordinates*' whole dependency tree, by project, as Studio
 * builds its graph: one Depot call, direct versions overriding transitive ones.
 * Two versions of one project in the tree are refused, explained from
 * *dependencyReport* (or the tree, fetched when not given; a tree that cannot
 * be fetched is reported to *onDependencyTreeError* and the versions fetched
 * explain it instead).
 */
export const collectIndexedDependencyEntities = async (
  depotServerClient: DepotServerClient,
  coordinates: ProjectDependencyCoordinates[],
  dependencyReport?: ProjectDependencyGraphReport | undefined,
  onDependencyTreeError?: (error: Error) => void,
): Promise<Map<string, EntitiesWithOrigin>> => {
  const index = new Map<string, EntitiesWithOrigin>();
  if (!coordinates.length) {
    return index;
  }
  const requested = coordinates.map((coordinate) =>
    ProjectDependencyCoordinates.serialization.toJson(coordinate),
  );
  // NOTE: a project several direct dependencies share is returned once.
  const projects = (
    await depotServerClient.collectDependencyEntities(requested, true, true)
  ).map((json) => ProjectVersionEntities.serialization.fromJson(json));
  const fetchedVersions = new Map<string, Set<string>>();
  projects.forEach((project) => {
    // Depot and SDLC should refuse two versions of one project, but do not; this does.
    fetchedVersions.set(
      project.id,
      (fetchedVersions.get(project.id) ?? new Set<string>()).add(
        project.versionId,
      ),
    );
    index.set(
      project.id,
      new EntitiesWithOrigin(
        project.groupId,
        project.artifactId,
        project.versionId,
        project.entities,
      ),
    );
  });
  if (
    !Array.from(fetchedVersions.values()).some((versions) => versions.size > 1)
  ) {
    return index;
  }
  let report = dependencyReport;
  if (!report) {
    try {
      report = buildDependencyReport(
        RawProjectDependencyReport.serialization.fromJson(
          await depotServerClient.analyzeDependencyTree(requested),
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      onDependencyTreeError?.(error);
    }
  }
  throw new UnsupportedOperationError(conflictMessage(report, fetchedVersions));
};

/**
 * Why *coordinates*' dependency tree cannot be built -- two versions of one
 * project, in Studio's wording -- or undefined when it can. Reads only the
 * tree, not the entities: a check before anything is loaded.
 */
export const analyzeDependencyConflicts = async (
  depotServerClient: DepotServerClient,
  coordinates: ProjectDependencyCoordinates[],
): Promise<string | undefined> => {
  if (!coordinates.length) {
    return undefined;
  }
  const report = buildDependencyReport(
    RawProjectDependencyReport.serialization.fromJson(
      await depotServerClient.analyzeDependencyTree(
        coordinates.map((coordinate) =>
          ProjectDependencyCoordinates.serialization.toJson(coordinate),
        ),
      ),
    ),
  );
  return report.conflicts.length
    ? conflictMessage(report, new Map())
    : undefined;
};

/**
 * The SDLC project id Depot holds for *groupId*:*artifactId*; undefined when
 * Depot has no such project (it was never published), the answer
 * *searchFallback* may then give.
 */
export const resolveSDLCProjectId = async (
  depotServerClient: DepotServerClient,
  groupId: string,
  artifactId: string,
  searchFallback?: (
    groupId: string,
    artifactId: string,
  ) => Promise<string | undefined>,
): Promise<string | undefined> => {
  try {
    const project = StoreProjectData.serialization.fromJson(
      await depotServerClient.getProject(groupId, artifactId),
    );
    if (project.projectId) {
      return project.projectId;
    }
  } catch (error) {
    if (
      !(error instanceof NetworkClientError) ||
      error.response.status !== HttpStatus.NOT_FOUND
    ) {
      throw error;
    }
  }
  return searchFallback?.(groupId, artifactId);
};

const WORKSPACE_SNAPSHOT_SUFFIX = `-${SNAPSHOT_ALIAS}`;

/** The SDLC workspace a snapshot version names (`x-SNAPSHOT` -> `x`); undefined for a release or master's snapshot. */
export const getWorkspaceIdFromSnapshotVersion = (
  versionId: string,
): string | undefined => {
  const resolved = resolveVersion(versionId);
  if (
    resolved === MASTER_SNAPSHOT_ALIAS ||
    !isSnapshotVersion(resolved) ||
    !resolved.endsWith(WORKSPACE_SNAPSHOT_SUFFIX)
  ) {
    return undefined;
  }
  return resolved.slice(0, -WORKSPACE_SNAPSHOT_SUFFIX.length) || undefined;
};
