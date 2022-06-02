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

import { createModelSchema, primitive } from 'serializr';
import { observable, makeObservable } from 'mobx';
import { VersionId } from '../version/VersionId.js';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';

export class Version {
  projectId!: string;
  revisionId!: string;
  notes!: string;
  id!: VersionId;

  constructor() {
    makeObservable(this, {
      projectId: observable,
      revisionId: observable,
      notes: observable,
      id: observable,
    });
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(Version, {
      id: usingModelSchema(VersionId.serialization.schema),
      notes: primitive(),
      projectId: primitive(),
      revisionId: primitive(),
    }),
  );
}
