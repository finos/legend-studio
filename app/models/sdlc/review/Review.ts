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

import { serializable, object, SKIP, custom } from 'serializr';

export enum ReviewState {
  OPEN = 'OPEN',
  COMMITTED = 'COMMITTED',
  CLOSED = 'CLOSED',
  UNKNOWN = 'UNKNOWN'
}

export class Author {
  @serializable name!: string;
  @serializable userId!: string;
}

export class Review {
  @serializable id!: string;
  @serializable state!: ReviewState;
  @serializable(object(Author)) author!: Author;
  @serializable title!: string;
  @serializable projectId!: string;
  @serializable workspaceId!: string;
  @serializable webURL!: string;
  @serializable(custom(() => SKIP, (value: string) => new Date(value))) createdAt!: Date;
  @serializable(custom(() => SKIP, (value: string | undefined) => value ? new Date(value) : undefined)) closedAt?: Date;
  @serializable(custom(() => SKIP, (value: string | undefined) => value ? new Date(value) : undefined)) lastUpdatedAt?: Date;
  @serializable(custom(() => SKIP, (value: string | undefined) => value ? new Date(value) : undefined)) committedAt?: Date;
}

export interface CreateReviewCommand {
  workspaceId: string;
  title: string;
  description: string;
}

export interface CommitReviewCommand {
  message: string;
}
