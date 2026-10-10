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

import { readFileSync } from 'node:fs';

// The Legend Cube sample projects the mock depot serves beside its test
// project (data/cube-depot/projects.json, written by
// scripts/generate-cube-depot.mjs): their versions, entities, dependencies,
// and the model the engine fetches for a pointer

interface Coordinates {
  groupId: string;
  artifactId: string;
  versionId: string;
}

interface Entity {
  path: string;
  classifierPath: string;
  content: Record<string, unknown>;
}

interface ProjectVersion {
  versionId: string;
  dependencies: Coordinates[];
  entities: Entity[];
}

interface Project {
  groupId: string;
  artifactId: string;
  projectId: string;
  versions: ProjectVersion[];
}

const PROJECTS: Project[] = JSON.parse(
  readFileSync(
    new URL('../data/cube-depot/projects.json', import.meta.url),
    'utf8',
  ),
) as Project[];

const isSnapshot = (versionId: string): boolean =>
  versionId.endsWith('SNAPSHOT');

/** Versions in release order: by number, part by part, so 1.10.0 is after 1.9.0 */
const compareVersions = (left: string, right: string): number => {
  const parts = (version: string): number[] =>
    version.split('.').map((part) => Number.parseInt(part, 10));
  const [a, b] = [parts(left), parts(right)];
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) {
      return difference;
    }
  }
  return 0;
};

export const findCubeProject = (
  groupId: string,
  artifactId: string,
): Project | undefined =>
  PROJECTS.find(
    (project) =>
      project.groupId === groupId && project.artifactId === artifactId,
  );

/** The project's releases, oldest first, as the depot lists them */
const releasesOf = (project: Project): string[] =>
  project.versions
    .map((version) => version.versionId)
    .filter((versionId) => !isSnapshot(versionId))
    .sort(compareVersions);

/** A version by id, `latest` being the newest release */
export const findCubeProjectVersion = (
  project: Project,
  versionId: string,
): ProjectVersion | undefined => {
  const id = versionId === 'latest' ? releasesOf(project).at(-1) : versionId;
  return project.versions.find((version) => version.versionId === id);
};

/** The projects, as the depot's project configurations */
export const CUBE_PROJECT_CONFIGURATIONS = PROJECTS.map((project) => ({
  projectId: project.projectId,
  groupId: project.groupId,
  artifactId: project.artifactId,
}));

/** The project's versions: its releases, and its snapshots when asked for */
export const getCubeProjectVersions = (
  project: Project,
  snapshots: boolean,
): string[] => [
  ...releasesOf(project),
  ...(snapshots
    ? project.versions.map((version) => version.versionId).filter(isSnapshot)
    : []),
];

/** The versions a project version depends on, its own dependencies first, each once */
const dependencyClosure = (version: ProjectVersion): ProjectVersion[] => {
  const found = new Map<string, ProjectVersion>();
  const visit = (current: ProjectVersion): void =>
    current.dependencies.forEach((dependency) => {
      const key = `${dependency.groupId}:${dependency.artifactId}`;
      const project = findCubeProject(
        dependency.groupId,
        dependency.artifactId,
      );
      const resolved =
        project && findCubeProjectVersion(project, dependency.versionId);
      if (resolved && !found.has(key)) {
        found.set(key, resolved);
        visit(resolved);
      }
    });
  visit(version);
  return [...found.values()];
};

/** The project version's dependencies, each with its entities */
export const getCubeProjectDependencies = (
  version: ProjectVersion,
): (Coordinates & { entities: Entity[] })[] =>
  dependencyClosure(version).map((dependency) => {
    const coordinates = PROJECTS.flatMap((project) =>
      project.versions.includes(dependency)
        ? [
            {
              groupId: project.groupId,
              artifactId: project.artifactId,
              versionId: dependency.versionId,
            },
          ]
        : [],
    )[0] as Coordinates;
    return { ...coordinates, entities: dependency.entities };
  });

/**
 * The project version's model, as the engine fetches it for a pointer: its
 * elements, then its dependencies' unless asked not to
 */
export const getCubeProjectModel = (
  project: Project,
  version: ProjectVersion,
  withDependencies: boolean,
): Record<string, unknown> => ({
  _type: 'data',
  serializer: { name: 'pure', version: 'vX_X_X' },
  origin: {
    _type: 'pointer',
    sdlcInfo: {
      _type: 'alloy',
      groupId: project.groupId,
      artifactId: project.artifactId,
      // the engine refuses a model whose origin sets `version`
      baseVersion: version.versionId,
    },
  },
  elements: [
    ...version.entities,
    ...(withDependencies
      ? dependencyClosure(version).flatMap((dependency) => dependency.entities)
      : []),
  ].map((entity) => entity.content),
});
