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
import { UnsupportedOperationError } from '@finos/legend-shared';
import type { EntityDiff } from '../comparison/EntityDiff.js';
import { type EntityChange, EntityChangeType } from './EntityChange.js';

export const applyEntityChanges = (
  entities: Entity[],
  changes: EntityChange[],
): Entity[] => {
  changes
    .filter((change: EntityChange) => {
      if (change.type !== EntityChangeType.DELETE && !change.content) {
        return false;
      }
      return true;
    })
    .forEach((change) => {
      switch (change.type) {
        case EntityChangeType.DELETE:
          {
            const elementIdx = entities.findIndex(
              (e) => e.path === change.entityPath,
            );
            if (elementIdx !== -1) {
              entities.splice(elementIdx, 1);
            }
          }
          break;
        case EntityChangeType.CREATE:
          {
            if (!entities.find((e) => e.path === change.entityPath)) {
              const entity = {
                classifierPath: change.classifierPath ?? '',
                path: change.entityPath,
                content: change.content ?? {},
              };
              entities.push(entity);
            }
          }
          break;
        case EntityChangeType.MODIFY: {
          const entity = entities.find((e) => e.path === change.entityPath);
          if (entity) {
            entity.content = change.content ?? {};
            entity.classifierPath = change.classifierPath ?? '';
          }
          break;
        }
        default:
          throw new UnsupportedOperationError(
            `Can't apply entity change`,
            change,
          );
      }
    });
  return entities;
};

export const convertEntityDiffsToEntityChanges = (
  diffs: EntityDiff[],
  toEntityGetter: (entityPath: string | undefined) => Entity | undefined,
): EntityChange[] => {
  const entityChanges: EntityChange[] = [];
  diffs.forEach((diff) => {
    switch (diff.entityChangeType) {
      case EntityChangeType.DELETE:
        entityChanges.push({
          type: diff.entityChangeType,
          entityPath: diff.entityPath,
        });
        break;
      case EntityChangeType.CREATE:
      case EntityChangeType.MODIFY:
        {
          const entity = toEntityGetter(diff.entityPath);
          if (entity) {
            entityChanges.push({
              type: diff.entityChangeType,
              entityPath: entity.path,
              content: entity.content,
            });
          }
        }
        break;
      case EntityChangeType.RENAME:
        {
          const entity = toEntityGetter(diff.entityPath);
          if (entity) {
            entityChanges.push({
              type: EntityChangeType.DELETE,
              entityPath: diff.oldPath ?? '',
            });
            entityChanges.push({
              type: EntityChangeType.CREATE,
              entityPath: entity.path,
              content: entity.content,
            });
          }
        }
        break;
      default:
        throw new UnsupportedOperationError(
          `Can't convert entity diff to entity change`,
          diff,
        );
    }
  });
  return entityChanges;
};
