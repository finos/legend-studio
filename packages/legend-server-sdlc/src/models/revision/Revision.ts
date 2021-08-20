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

import { alias, custom, SKIP, createModelSchema, primitive } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';

export enum RevisionAlias {
  BASE = 'BASE',
  CURRENT = 'CURRENT', // NOTE: `current`, `latest`, `HEAD` are equivalent alias
  // LATEST = 'LATEST',
  // HEAD = 'HEAD',
}

export class Revision {
  id!: string;
  authorName!: string;
  authoredAt!: Date;
  committerName!: string;
  committedAt!: Date;
  message!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(Revision, {
      authoredAt: alias(
        'authoredTimestamp',
        custom(
          () => SKIP,
          (value) => new Date(value),
        ),
      ),
      authorName: primitive(),
      committedAt: alias(
        'committedTimestamp',
        custom(
          () => SKIP,
          (value) => new Date(value),
        ),
      ),
      committerName: primitive(),
      id: primitive(),
      message: primitive(),
    }),
  );
}
