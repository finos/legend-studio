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

import { Entity } from '@finos/legend-model-storage';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { type EntityChange, EntityChangeType } from './EntityChange';

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
              const entity = new Entity();
              entity.content = change.content ?? {};
              entity.path = change.entityPath;
              entity.classifierPath = change.classifierPath ?? '';
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
