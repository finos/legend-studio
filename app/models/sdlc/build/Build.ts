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

import { serializable, custom, SKIP } from 'serializr';

export enum BuildStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  UNKNOWN = 'UNKNOWN'
}

export class Build {
  @serializable id!: string;
  @serializable projectId!: string;
  @serializable revisionId!: string;
  @serializable status!: BuildStatus;
  @serializable(custom(() => SKIP, (value: string) => new Date(value))) createdAt!: Date;
  @serializable(custom(() => SKIP, (value: string | undefined) => value ? new Date(value) : undefined)) startedAt?: Date;
  @serializable(custom(() => SKIP, (value: string | undefined) => value ? new Date(value) : undefined)) finishedAt?: Date;
  @serializable webURL!: string;
}
