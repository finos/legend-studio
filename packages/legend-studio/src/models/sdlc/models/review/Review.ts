/**
 * Copyright 2020 Goldman Sachs
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

import { User } from '../User';
import {
  SKIP,
  custom,
  createModelSchema,
  primitive,
  optional,
} from 'serializr';
import {
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-studio-shared';

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

  static readonly serialization = new SerializationFactory(
    createModelSchema(Review, {
      author: usingModelSchema(User.serialization.schema),
      closedAt: optional(
        custom(
          () => SKIP,
          (value: string | undefined) => (value ? new Date(value) : undefined),
        ),
      ),
      committedAt: optional(
        custom(
          () => SKIP,
          (value: string | undefined) => (value ? new Date(value) : undefined),
        ),
      ),
      createdAt: custom(
        () => SKIP,
        (value: string) => new Date(value),
      ),
      id: primitive(),
      lastUpdatedAt: optional(
        custom(
          () => SKIP,
          (value: string | undefined) => (value ? new Date(value) : undefined),
        ),
      ),
      projectId: primitive(),
      state: primitive(),
      title: primitive(),
      webURL: primitive(),
      workspaceId: primitive(),
    }),
  );
}

export interface CreateReviewCommand {
  workspaceId: string;
  title: string;
  description: string;
}

export interface CommitReviewCommand {
  message: string;
}
