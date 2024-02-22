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
import {
  guaranteeNonNullable,
  IllegalStateError,
  SerializationFactory,
} from '@finos/legend-shared';
import { EntityChangeType } from '../entity/EntityChange.js';
import { extractEntityNameFromPath } from '@finos/legend-storage';
import { createModelSchema, optional, primitive } from 'serializr';

export const getChangeTypeIconFromChange = (val: EntityChangeType): string => {
  switch (val) {
    case EntityChangeType.CREATE:
      return 'N';
    case EntityChangeType.DELETE:
      return 'D';
    case EntityChangeType.MODIFY:
      return 'M';
    case EntityChangeType.RENAME:
      return 'R';
    default:
      return '';
  }
};
export class EntityDiff {
  newPath?: string | undefined;
  oldPath?: string | undefined;
  entityChangeType: EntityChangeType;

  constructor(
    oldPath: string | undefined,
    newPath: string | undefined,
    entityChangeType: EntityChangeType,
  ) {
    makeObservable(this, {
      newPath: observable,
      oldPath: observable,
      entityChangeType: observable,
      entityName: computed,
      entityPath: computed,
      key: computed,
    });

    this.oldPath = oldPath;
    this.newPath = newPath;
    this.entityChangeType = entityChangeType;
  }

  get entityName(): string {
    return extractEntityNameFromPath(this.entityPath);
  }

  get entityPath(): string {
    return guaranteeNonNullable(
      this.entityChangeType === EntityChangeType.DELETE
        ? this.oldPath
        : this.newPath,
      `Can't find diff entity path`,
    );
  }

  get key(): string {
    return `old-${this.oldPath ?? ''}--new-${this.newPath ?? ''}`;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(EntityDiff, {
      oldPath: optional(primitive()),

      newPath: optional(primitive()),
      entityChangeType: primitive(),
    }),
  );

  getChangeTypeIcon(): string {
    return getChangeTypeIconFromChange(this.entityChangeType);
  }

  static shouldOldEntityExist = (diff: EntityDiff): boolean =>
    diff.entityChangeType === EntityChangeType.DELETE ||
    diff.entityChangeType === EntityChangeType.MODIFY ||
    diff.entityChangeType === EntityChangeType.RENAME;

  static shouldNewEntityExist = (diff: EntityDiff): boolean =>
    diff.entityChangeType === EntityChangeType.CREATE ||
    diff.entityChangeType === EntityChangeType.MODIFY ||
    diff.entityChangeType === EntityChangeType.RENAME;

  getValidatedOldPath(): string {
    const errorMessage = `old entity path is not defined for change type '${this.entityChangeType}'`;
    if (EntityDiff.shouldOldEntityExist(this)) {
      return guaranteeNonNullable(this.oldPath, errorMessage);
    }
    throw new IllegalStateError(errorMessage);
  }

  getValidatedNewPath(): string {
    const errorMessage = `new entity path is not defined for change type '${this.entityChangeType}'`;
    if (EntityDiff.shouldNewEntityExist(this)) {
      return guaranteeNonNullable(this.newPath, errorMessage);
    }
    throw new IllegalStateError(errorMessage);
  }
}
