/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serializable, alias, custom, SKIP } from 'serializr';

export enum RevisionAlias {
  BASE = 'BASE',
  CURRENT = 'CURRENT', // NOTE: `current`, `latest`, `HEAD` are equivalent alias
  // LATEST = 'LATEST',
  // HEAD = 'HEAD',
}

export class Revision {
  @serializable id!: string;
  @serializable authorName!: string;
  @serializable(alias('authoredTimestamp', custom(() => SKIP, value => new Date(value)))) authoredAt!: Date;
  @serializable committerName!: string;
  @serializable(alias('committedTimestamp', custom(() => SKIP, value => new Date(value)))) committedAt!: Date;
  @serializable message!: string;
}
