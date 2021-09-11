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

import { observable, makeObservable } from 'mobx';
import { isNonNullable } from '@finos/legend-shared';
import { EntityDiff } from '../comparison/EntityDiff';
import { EntityChangeType } from '../entity/EntityChange';

export class Comparison {
  toRevisionId: string;
  fromRevisionId: string;
  entityDiffs: EntityDiff[] = [];
  projectConfigurationUpdated = false;

  constructor(
    fromRevisionId: string,
    toRevisionId: string,
    diffs: EntityDiff[],
    processDiff: boolean,
  ) {
    makeObservable(this, {
      toRevisionId: observable,
      fromRevisionId: observable,
      entityDiffs: observable,
      projectConfigurationUpdated: observable,
    });

    this.fromRevisionId = fromRevisionId;
    this.toRevisionId = toRevisionId;
    this.entityDiffs = processDiff ? this.processEntityDiffs(diffs) : diffs;
  }

  processEntityDiffs(diffs: EntityDiff[]): EntityDiff[] {
    return diffs
      .map((delta) => {
        switch (delta.entityChangeType) {
          case EntityChangeType.RENAME:
            return [
              new EntityDiff(delta.oldPath, undefined, EntityChangeType.DELETE),
              new EntityDiff(undefined, delta.newPath, EntityChangeType.CREATE),
            ];
          case EntityChangeType.DELETE:
            delta.newPath = undefined;
            break;
          case EntityChangeType.CREATE:
            delta.oldPath = undefined;
            break;
          default:
            break;
        }
        return new EntityDiff(
          delta.oldPath,
          delta.newPath,
          delta.entityChangeType,
        );
      })
      .flat()
      .filter(isNonNullable);
  }
}
