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
import type { AcquisitionProtocol } from './DSL_Mastery_AcquisitionProtocol.js';
import type { Trigger } from './DSL_Mastery_Trigger.js';
import type { Authorization } from './DSL_Mastery_Authorization.js';

export enum RecordSourceStatus {
  Development,
  TestOnly,
  Production,
  Dormant,
  Decommissioned,
}

export enum Profile {
  Large,
  Medium,
  Small,
  ExtraSmall,
}

export class RecordSourceDependency implements Hashable {
  dependentRecordSourceId!: string;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.RECORD_SOURCE_DEPENDENCY,
      this.dependentRecordSourceId,
    ]);
  }
}

export class RecordSource implements Hashable {
  id!: string;
  status!: RecordSourceStatus;
  description!: string;
  recordService?: RecordService | undefined;
  sequentialData?: boolean | undefined;
  stagedLoad?: boolean | undefined;
  createPermitted?: boolean | undefined;
  createBlockedException?: boolean | undefined;
  allowFieldDelete?: boolean | undefined;
  trigger?: Trigger | undefined;
  authorization?: Authorization | undefined;
  dataProvider?: string | undefined;
  partitions?: RecordSourcePartition[] | undefined;
  parseService?: string | undefined;
  transformService?: string | undefined;
  raiseExceptionWorkflow?: boolean | undefined;
  runProfile?: Profile | undefined;
  timeoutInMinutes?: number | undefined;
  dependencies: RecordSourceDependency[] | undefined;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.RECORD_SOURCE,
      this.id,
      this.status,
      this.description,
      this.recordService ?? '',
      this.sequentialData?.toString() ?? '',
      this.stagedLoad?.toString() ?? '',
      this.createPermitted?.toString() ?? '',
      this.createBlockedException?.toString() ?? '',
      this.allowFieldDelete?.toString() ?? '',
      this.trigger ?? '',
      this.authorization ?? '',
      this.dataProvider ?? '',
      this.partitions ? hashArray(this.partitions) : '',
      this.parseService ?? '',
      this.transformService ?? '',
      this.raiseExceptionWorkflow?.toString() ?? '',
      this.runProfile ?? '',
      this.timeoutInMinutes ?? '',
      this.dependencies ? hashArray(this.dependencies) : '',
    ]);
  }
}

export class RecordService implements Hashable {
  acquisitionProtocol?: AcquisitionProtocol | undefined;
  parseService?: string | undefined;
  transformService!: string;

  get hashCode(): string {
    return hashArray([
      MASTERY_HASH_STRUCTURE.RECORD_SERVICE,
      this.acquisitionProtocol ?? '',
      this.parseService ?? '',
      this.transformService,
    ]);
  }
}

export class RecordSourcePartition implements Hashable {
  id!: string;

  get hashCode(): string {
    return hashArray([MASTERY_HASH_STRUCTURE.RECORD_SOURCE_PARTITION, this.id]);
  }
}
