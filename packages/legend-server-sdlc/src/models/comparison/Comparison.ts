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

import { observable, makeObservable, action } from 'mobx';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { EntityDiff } from '../comparison/EntityDiff.js';
import { createModelSchema, list, primitive } from 'serializr';

export class Comparison {
  toRevisionId: string;
  fromRevisionId: string;
  entityDiffs: EntityDiff[] = [];
  projectConfigurationUpdated = false;

  constructor(
    fromRevisionId: string,
    toRevisionId: string,
    diffs: EntityDiff[],
  ) {
    makeObservable(this, {
      toRevisionId: observable,
      fromRevisionId: observable,
      entityDiffs: observable,
      projectConfigurationUpdated: observable,
      setEntityDiffs: action,
    });

    this.fromRevisionId = fromRevisionId;
    this.toRevisionId = toRevisionId;
    this.entityDiffs = diffs;
  }

  setEntityDiffs(diffs: EntityDiff[]): void {
    this.entityDiffs = diffs;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(Comparison, {
      toRevisionId: primitive(),
      fromRevisionId: primitive(),
      projectConfigurationUpdated: primitive(),
      entityDiffs: list(usingModelSchema(EntityDiff.serialization.schema)),
    }),
  );
}
