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

import { User } from '../User.js';
import {
  SKIP,
  custom,
  createModelSchema,
  primitive,
  list,
  optional,
} from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import type { WorkspaceType } from '../workspace/Workspace.js';

export enum ReviewState {
  OPEN = 'OPEN',
  COMMITTED = 'COMMITTED',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN',
}

export class Review {
  id!: string;
  state!: ReviewState;
  author!: User;
  title!: string;
  projectId!: string;
  workspaceId!: string;
  webURL!: string;
  createdAt!: Date;
  closedAt?: Date;
  lastUpdatedAt?: Date;
  committedAt?: Date;
  workspaceType!: WorkspaceType;
  labels: string[] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(Review, {
      author: usingModelSchema(User.serialization.schema),
      closedAt: custom(
        () => SKIP,
        (value: string | null | undefined) => (value ? new Date(value) : SKIP),
      ),
      committedAt: custom(
        () => SKIP,
        (value: string | null | undefined) => (value ? new Date(value) : SKIP),
      ),
      createdAt: custom(
        () => SKIP,
        (value: string) => new Date(value),
      ),
      id: primitive(),
      lastUpdatedAt: custom(
        () => SKIP,
        (value: string | null | undefined) => (value ? new Date(value) : SKIP),
      ),
      projectId: primitive(),
      state: primitive(),
      labels: optional(list(primitive())),
      title: primitive(),
      webURL: primitive(),
      workspaceId: primitive(),
      workspaceType: primitive(),
    }),
  );
}
