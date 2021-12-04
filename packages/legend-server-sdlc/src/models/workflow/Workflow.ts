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

import { custom, SKIP, createModelSchema, primitive } from 'serializr';
import { SerializationFactory } from '@finos/legend-shared';

export enum WorkflowStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  UNKNOWN = 'UNKNOWN',
}

export class Workflow {
  id!: string;
  projectId!: string;
  revisionId!: string;
  status!: WorkflowStatus;
  createdAt!: Date;
  startedAt?: Date;
  finishedAt?: Date;
  webURL!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(Workflow, {
      id: primitive(),
      createdAt: custom(
        () => SKIP,
        (value: string) => new Date(value),
      ),
      finishedAt: custom(
        () => SKIP,
        (value: string | null | undefined) => (value ? new Date(value) : SKIP),
      ),
      projectId: primitive(),
      revisionId: primitive(),
      startedAt: custom(
        () => SKIP,
        (value: string | null | undefined) => (value ? new Date(value) : SKIP),
      ),
      status: primitive(),
      webURL: primitive(),
    }),
  );
}
