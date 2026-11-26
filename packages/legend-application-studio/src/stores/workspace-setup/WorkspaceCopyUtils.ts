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

import { type PlainObject, deepEqual } from '@finos/legend-shared';
import { type Entity, GAV_DELIMITER } from '@finos/legend-storage';
import {
  type EntityChange,
  type ProjectConfiguration,
  type ProjectDependency,
  EntityChangeType,
} from '@finos/legend-server-sdlc';

/**
 * What a workspace did to one element since it was created: the element at
 * the workspace's BASE revision against the element now.
 */
export interface WorkspaceElementChange {
  type:
    | EntityChangeType.CREATE
    | EntityChangeType.MODIFY
    | EntityChangeType.DELETE;
  entityPath: string;
  classifierPath: string;
  /**
   * The element's content at the BASE revision, undefined when the workspace
   * created it
   */
  baseContent: PlainObject | undefined;
  /**
   * The element's content now, undefined when the workspace deleted it
   */
  content: PlainObject | undefined;
}

const CHANGE_TYPE_ORDER = [
  EntityChangeType.CREATE,
  EntityChangeType.MODIFY,
  EntityChangeType.DELETE,
];

// NOTE: `deepEqual` doesn't depend on the order of an object's keys
const isSameContent = (
  a: PlainObject | undefined,
  b: PlainObject | undefined,
): boolean => (a === undefined || b === undefined ? a === b : deepEqual(a, b));

const indexByPath = (entities: Entity[]): Map<string, Entity> =>
  new Map(entities.map((entity) => [entity.path, entity]));

/**
 * The elements a workspace created, modified or deleted since it was
 * created, new ones first, then modified, then deleted, each by path.
 */
export const getWorkspaceElementChanges = (
  baseEntities: Entity[],
  entities: Entity[],
): WorkspaceElementChange[] => {
  const baseEntitiesByPath = indexByPath(baseEntities);
  const entitiesByPath = indexByPath(entities);
  const changes: WorkspaceElementChange[] = [];
  entities.forEach((entity) => {
    const baseEntity = baseEntitiesByPath.get(entity.path);
    if (!baseEntity) {
      changes.push({
        type: EntityChangeType.CREATE,
        entityPath: entity.path,
        classifierPath: entity.classifierPath,
        baseContent: undefined,
        content: entity.content,
      });
    } else if (!isSameContent(baseEntity.content, entity.content)) {
      changes.push({
        type: EntityChangeType.MODIFY,
        entityPath: entity.path,
        classifierPath: entity.classifierPath,
        baseContent: baseEntity.content,
        content: entity.content,
      });
    }
  });
  baseEntities.forEach((baseEntity) => {
    if (!entitiesByPath.has(baseEntity.path)) {
      changes.push({
        type: EntityChangeType.DELETE,
        entityPath: baseEntity.path,
        classifierPath: baseEntity.classifierPath,
        baseContent: baseEntity.content,
        content: undefined,
      });
    }
  });
  return changes.sort(
    (a, b) =>
      CHANGE_TYPE_ORDER.indexOf(a.type) - CHANGE_TYPE_ORDER.indexOf(b.type) ||
      a.entityPath.localeCompare(b.entityPath),
  );
};

export const countWorkspaceElementChanges = (
  changes: WorkspaceElementChange[],
): { created: number; modified: number; deleted: number } => ({
  created: changes.filter((change) => change.type === EntityChangeType.CREATE)
    .length,
  modified: changes.filter((change) => change.type === EntityChangeType.MODIFY)
    .length,
  deleted: changes.filter((change) => change.type === EntityChangeType.DELETE)
    .length,
});

/**
 * The paths of the elements that the workspace's line (HEAD or a patch) also
 * changed since the workspace was created, to something else: copying the
 * workspace's changes onto the line replaces the line's version of them.
 */
export const getPathsAlsoChangedOnLine = (
  changes: WorkspaceElementChange[],
  lineEntities: Entity[],
): Set<string> => {
  const lineEntitiesByPath = indexByPath(lineEntities);
  return new Set(
    changes
      .filter((change) => {
        const lineContent = lineEntitiesByPath.get(change.entityPath)?.content;
        return (
          !isSameContent(lineContent, change.baseContent) &&
          !isSameContent(lineContent, change.content)
        );
      })
      .map((change) => change.entityPath),
  );
};

/**
 * The entity changes that apply a workspace's changes onto a line whose latest
 * entities are `lineEntities`. The workspace's version of an element wins, and
 * a change the line already has is left out, as SDLC refuses to create an
 * element that exists, or to modify or delete one that doesn't.
 */
export const buildWorkspaceCopyEntityChanges = (
  changes: WorkspaceElementChange[],
  lineEntities: Entity[],
): EntityChange[] => {
  const lineEntitiesByPath = indexByPath(lineEntities);
  return changes.flatMap((change): EntityChange[] => {
    const lineEntity = lineEntitiesByPath.get(change.entityPath);
    if (change.type === EntityChangeType.DELETE || !change.content) {
      return lineEntity
        ? [{ type: EntityChangeType.DELETE, entityPath: change.entityPath }]
        : [];
    }
    if (lineEntity && isSameContent(lineEntity.content, change.content)) {
      return [];
    }
    return [
      {
        type: lineEntity ? EntityChangeType.MODIFY : EntityChangeType.CREATE,
        entityPath: change.entityPath,
        classifierPath: change.classifierPath,
        content: change.content,
      },
    ];
  });
};

/**
 * What copying all the elements of a workspace of another project brings to a
 * line whose latest entities are `lineEntities`: an element the line doesn't
 * have is new (CREATE), and one it has with other content is replaced
 * (MODIFY). One it has as is is left out, and nothing is deleted.
 */
export const getOtherProjectWorkspaceCopyChanges = (
  lineEntities: Entity[],
  entities: Entity[],
): WorkspaceElementChange[] =>
  getWorkspaceElementChanges(lineEntities, entities).filter(
    (change) => change.type !== EntityChangeType.DELETE,
  );

/**
 * How the project dependencies of the project a workspace is copied from
 * compare with those of the project it is copied into, by project
 * (`groupId:artifactId`).
 */
export interface WorkspaceCopyDependencyDiff {
  /**
   * The source's dependencies on projects the target doesn't depend on
   */
  missing: ProjectDependency[];
  /**
   * The projects both depend on, at different versions
   */
  mismatched: { source: ProjectDependency; target: ProjectDependency }[];
}

export const getWorkspaceCopyDependencyDiff = (
  source: ProjectConfiguration,
  target: ProjectConfiguration,
): WorkspaceCopyDependencyDiff => {
  const targetDependencies = new Map(
    target.projectDependencies.map((dependency) => [
      dependency.projectId,
      dependency,
    ]),
  );
  // NOTE: the copied elements find what they need from the target in the
  // target itself, and a project can't depend on itself
  const targetCoordinates = new Set([
    `${target.groupId}${GAV_DELIMITER}${target.artifactId}`,
    target.projectId,
  ]);
  const diff: WorkspaceCopyDependencyDiff = { missing: [], mismatched: [] };
  source.projectDependencies.forEach((dependency) => {
    if (targetCoordinates.has(dependency.projectId)) {
      return;
    }
    const targetDependency = targetDependencies.get(dependency.projectId);
    if (!targetDependency) {
      diff.missing.push(dependency);
    } else if (targetDependency.versionId !== dependency.versionId) {
      diff.mismatched.push({ source: dependency, target: targetDependency });
    }
  });
  return diff;
};
