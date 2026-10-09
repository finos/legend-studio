/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import type { Schema } from '@finos/legend-cube';

/** A data set of a deployed ingest definition, as the definition declares it */
export class CubeIngestDataSet {
  readonly name: string;
  /** Its columns: the declared ones, then the milestoning ones of its write mode; none when they can't be read */
  readonly schema: Schema | undefined;
  /** Why it can't be picked, e.g. it is a materialized view; none when it can */
  readonly disabledReason: string | undefined;
  readonly primaryKey: readonly string[];

  constructor(fields: {
    name: string;
    schema?: Schema | undefined;
    disabledReason?: string | undefined;
    primaryKey?: readonly string[];
  }) {
    this.name = fields.name;
    this.schema = fields.schema;
    this.disabledReason = fields.disabledReason;
    this.primaryKey = fields.primaryKey ?? [];
  }

  get isPickable(): boolean {
    return this.disabledReason === undefined && this.schema !== undefined;
  }
}
