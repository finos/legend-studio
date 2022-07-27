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

import { observable, computed, makeObservable } from 'mobx';
import type { EntityDiff } from '../comparison/EntityDiff.js';
import { EntityChangeType } from '../entity/EntityChange.js';
import { IllegalStateError, shallowStringify } from '@finos/legend-shared';
import { type Entity, extractEntityNameFromPath } from '@finos/legend-storage';

export class EntityChangeConflictResolution {
  entityPath: string;
  resolvedEntity?: Entity | undefined;

  constructor(entityPath: string, resolvedEntity: Entity | undefined) {
    makeObservable(this, {
      entityPath: observable,
      resolvedEntity: observable,
    });

    this.entityPath = entityPath;
    this.resolvedEntity = resolvedEntity;
  }
}

export class EntityChangeConflict {
  entityPath: string;
  incomingChangeEntityDiff: EntityDiff;
  currentChangeEntityDiff: EntityDiff;

  constructor(
    entityPath: string,
    incomingChangeEntityDiff: EntityDiff,
    currentChangeEntityDiff: EntityDiff,
  ) {
    makeObservable(this, {
      entityPath: observable,
      incomingChangeEntityDiff: observable,
      currentChangeEntityDiff: observable,
      entityName: computed,
      conflictReason: computed,
    });

    this.entityPath = entityPath;
    this.incomingChangeEntityDiff = incomingChangeEntityDiff;
    this.currentChangeEntityDiff = currentChangeEntityDiff;
  }

  get entityName(): string {
    return extractEntityNameFromPath(this.entityPath);
  }

  get conflictReason(): string {
    if (
      this.incomingChangeEntityDiff.entityChangeType ===
        EntityChangeType.CREATE &&
      this.currentChangeEntityDiff.entityChangeType === EntityChangeType.CREATE
    ) {
      return 'Entity is created in both incoming changes and current changes but the contents are different';
    } else if (
      this.incomingChangeEntityDiff.entityChangeType ===
        EntityChangeType.MODIFY &&
      this.currentChangeEntityDiff.entityChangeType === EntityChangeType.MODIFY
    ) {
      return 'Entity is modified in both incoming changes and current changes but the contents are different';
    } else if (
      this.incomingChangeEntityDiff.entityChangeType ===
        EntityChangeType.DELETE &&
      this.currentChangeEntityDiff.entityChangeType === EntityChangeType.MODIFY
    ) {
      return 'Entity is deleted in incoming changes but modified in current changes';
    } else if (
      this.incomingChangeEntityDiff.entityChangeType ===
        EntityChangeType.MODIFY &&
      this.currentChangeEntityDiff.entityChangeType === EntityChangeType.DELETE
    ) {
      return 'Entity is modified in incoming changes but deleted in current changes';
    }
    throw new IllegalStateError(
      `Detected unfeasible state while computing entity change conflict for entity '${
        this.entityPath
      }', with current change: ${shallowStringify(
        this.currentChangeEntityDiff,
      )}, and incoming change: ${shallowStringify(
        this.incomingChangeEntityDiff,
      )}`,
    );
  }
}
