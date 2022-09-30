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

import { type Hashable, hashArray } from '@finos/legend-shared';
import { MASTERY_HASH_STRUCTURE } from '../../../../../DSL_Mastery_HashUtils.js';

export class RecordSource implements Hashable {
  id!: string;
  status!: string;
  description!: string;
  partitions!: RecordSourcePartition[];
  parseService?: string | undefined;
  transformService!: string;
  sequentialData?: boolean | undefined;
  stagedLoad?: boolean | undefined;
  createPermitted?: boolean | undefined;
  createBlockedException?: boolean | undefined;
  tags: string[] = [];

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.RECORD_SOURCE,
      this.id,
      this.status,
      this.description,
      hashArray(this.partitions),
      this.parseService ?? '',
      this.transformService,
      this.sequentialData?.toString() ?? '',
      this.stagedLoad?.toString() ?? '',
      this.createPermitted?.toString() ?? '',
      this.createBlockedException?.toString() ?? '',
      hashArray(this.tags),
    ]);
  }
}

export class RecordSourcePartition implements Hashable {
  id!: string;
  tags: string[] = [];

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.RECORD_SOURCE_PARTITION,
      this.id,
      hashArray(this.tags),
    ]);
  }
}
