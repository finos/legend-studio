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

import { EntityDiff } from '../models/comparison/EntityDiff.js';
import { EntityChangeType } from '../models/entity/EntityChange.js';

export const reprocessEntityDiffs = (diffs: EntityDiff[]): EntityDiff[] => {
  const processed: EntityDiff[] = [];
  const deleted: Map<string, EntityDiff> = new Map();
  const created: Map<string, EntityDiff> = new Map();
  diffs.forEach((_diff) => {
    if (_diff.entityChangeType === EntityChangeType.DELETE && _diff.oldPath) {
      deleted.set(_diff.oldPath, _diff);
    } else if (
      _diff.entityChangeType === EntityChangeType.CREATE &&
      _diff.newPath
    ) {
      created.set(_diff.newPath, _diff);
    } else {
      processed.push(_diff);
    }
  });
  Array.from(deleted.entries()).forEach(([key, value]) => {
    // create new
    const createdEntity = created.get(key);
    if (createdEntity) {
      const modified = new EntityDiff(
        value.oldPath,
        createdEntity.newPath,
        EntityChangeType.MODIFY,
      );
      processed.push(modified);
      deleted.delete(key);
      created.delete(key);
    }
  });
  const deletedValues = Array.from(deleted.values());
  deletedValues.forEach((val) => {
    val.newPath = undefined;
  });
  const createdValues = Array.from(created.values());
  createdValues.forEach((val) => {
    val.oldPath = undefined;
  });
  return [...processed, ...deletedValues, ...createdValues];
};
