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

import {
  Binding,
  Connection,
  PackageableElementReference,
  V1_Connection,
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
} from '@finos/legend-graph';
import type { V1_Binding } from '@finos/legend-graph/lib/models/protocols/pure/v1/model/packageableElements/externalFormat/store/V1_DSLExternalFormat_Binding';
import { type Hashable, hashArray } from '@finos/legend-shared';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../DSLPersistence_ModelUtils';

/**********
 * persistence
 **********/

export class V1_Persistence extends V1_PackageableElement implements Hashable {
  documentation!: string;
  trigger!: V1_Trigger;
  service!: string;
  persister!: V1_Persister;
  notifier!: V1_Notifier;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE,
      this.documentation,
      this.trigger,
      this.service,
      this.persister,
      this.notifier,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

/**********
 * trigger
 **********/

export abstract class V1_Trigger implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Trigger';

  abstract get hashCode(): string;
}

export class V1_ManualTrigger extends V1_Trigger implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.MANUAL_TRIGGER]);
  }
}

export class V1_CronTrigger extends V1_Trigger implements Hashable {
  minutes!: string;
  hours!: string;
  dayOfMonth!: string;
  month!: string;
  dayOfWeek!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.CRON_TRIGGER,
      this.minutes,
      this.hours,
      this.dayOfMonth,
      this.month,
      this.dayOfWeek,
    ]);
  }
}

/**********
 * persister
 **********/

export abstract class V1_Persister implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Persister';

  abstract get hashCode(): string;
}

export class V1_StreamingPersister extends V1_Persister implements Hashable {
  sink!: V1_Sink;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.STREAMING_PERSISTER,
      this.sink,
    ]);
  }
}

export class V1_BatchPersister extends V1_Persister implements Hashable {
  sink!: V1_Sink;
  ingestMode!: V1_IngestMode;
  targetShape!: V1_TargetShape;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_PERSISTER,
      this.sink,
      this.ingestMode,
      this.targetShape,
    ]);
  }
}

/**********
 * notifier
 **********/

export class V1_Notifier implements Hashable {
  notifyees: V1_Notifyee[] = [];

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NOTIFIER,
      hashArray(this.notifyees),
    ]);
  }
}

export abstract class V1_Notifyee implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Notifyee';

  abstract get hashCode(): string;
}

export class V1_EmailNotifyee extends V1_Notifyee implements Hashable {
  address!: string;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.EMAIL_NOTIFYEE, this.address]);
  }
}

export class V1_PagerDutyNotifyee extends V1_Notifyee implements Hashable {
  url!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PAGER_DUTY_NOTIFYEE,
      this.url,
    ]);
  }
}

/**********
 * sink
 **********/

export abstract class V1_Sink implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Sink';

  abstract get hashCode(): string;
}

export class V1_RelationalSink extends V1_Sink implements Hashable {
  connection?: V1_Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.RELATIONAL_SINK,
      this.connection ?? '',
    ]);
  }
}

export class V1_ObjectStorageSink extends V1_Sink implements Hashable {
  binding!: string;
  connection!: V1_Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OBJECT_STORAGE_SINK,
      this.binding,
      this.connection,
    ]);
  }
}

/**********
 * target shape
 **********/

export abstract class V1_TargetShape implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Trigger';

  abstract get hashCode(): string;
}

export class V1_FlatTarget extends V1_TargetShape implements Hashable {
  modelClass?: string;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: V1_DeduplicationStrategy;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FLAT_TARGET,
      this.modelClass ?? '',
      this.targetName,
      hashArray(this.partitionFields),
      this.deduplicationStrategy,
    ]);
  }
}

export class V1_MultiFlatTarget extends V1_TargetShape implements Hashable {
  modelClass!: string;
  transactionScope!: V1_TransactionScope;
  parts: V1_MultiFlatTargetPart[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET,
      this.modelClass,
      this.transactionScope,
      hashArray(this.parts),
    ]);
  }
}

export class V1_MultiFlatTargetPart implements Hashable {
  modelProperty!: string;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: V1_DeduplicationStrategy;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET_PART,
      this.modelProperty,
      this.targetName,
      hashArray(this.partitionFields),
      this.deduplicationStrategy,
    ]);
  }
}

export enum V1_TransactionScope {
  SINGLE_TARGET = 'SINGLE_TARGET',
  ALL_TARGETS = 'ALL_TARGETS',
}

/**********
 * deduplication strategy
 **********/

export abstract class V1_DeduplicationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_DeduplicationStrategy';

  abstract get hashCode(): string;
}

export class V1_NoDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DEDUPLICATION_STRATEGY]);
  }
}

export class V1_AnyVersionDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.ANY_VERSION_DEDUPLICATION_STRATEGY,
    ]);
  }
}

export class V1_MaxVersionDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  versionField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_DEDUPLICATION_STRATEGY,
      this.versionField,
    ]);
  }
}

export class V1_DuplicateCountDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  duplicateCountName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DUPLICATE_COUNT_DEDUPLICATION_STRATEGY,
      this.duplicateCountName,
    ]);
  }
}

/**********
 * ingest mode
 **********/

export abstract class V1_IngestMode implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_IngestMode';

  abstract get hashCode(): string;
}

/**********
 * ingest mode - snapshot
 **********/

export class V1_NontemporalSnapshot extends V1_IngestMode implements Hashable {
  auditing!: V1_Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_SNAPSHOT,
      this.auditing,
    ]);
  }
}

export class V1_UnitemporalSnapshot extends V1_IngestMode implements Hashable {
  transactionMilestoning!: V1_TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
    ]);
  }
}

export class V1_BitemporalSnapshot extends V1_IngestMode implements Hashable {
  transactionMilestoning!: V1_TransactionMilestoning;
  validityMilestoning!: V1_ValidityMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
      this.validityMilestoning,
    ]);
  }
}

/**********
 * ingest mode - delta
 **********/

export class V1_NontemporalDelta extends V1_IngestMode implements Hashable {
  mergeStrategy!: V1_MergeStrategy;
  auditing!: V1_Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_DELTA,
      this.mergeStrategy,
      this.auditing,
    ]);
  }
}

export class V1_UnitemporalDelta extends V1_IngestMode implements Hashable {
  mergeStrategy!: V1_MergeStrategy;
  transactionMilestoning!: V1_TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
    ]);
  }
}

export class V1_BitemporalDelta extends V1_IngestMode implements Hashable {
  mergeStrategy!: V1_MergeStrategy;
  transactionMilestoning!: V1_TransactionMilestoning;
  validityMilestoning!: V1_ValidityMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
      this.validityMilestoning,
    ]);
  }
}

// merge strategy

export abstract class V1_MergeStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_MergeStrategy';

  abstract get hashCode(): string;
}

export class V1_NoDeletesMergeStrategy
  extends V1_MergeStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DELETES_MERGE_STRATEGY]);
  }
}

export class V1_DeleteIndicatorMergeStrategy
  extends V1_MergeStrategy
  implements Hashable
{
  deleteField!: string;
  deleteValues: string[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_MERGE_STRATEGY,
      this.deleteField,
      hashArray(this.deleteValues),
    ]);
  }
}

/**********
 * ingest mode - append only
 **********/

export class V1_AppendOnly extends V1_IngestMode implements Hashable {
  auditing!: V1_Auditing;
  filterDuplicates!: boolean;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.APPEND_ONLY,
      this.auditing,
      this.filterDuplicates.toString(),
    ]);
  }
}

/**********
 * auditing
 **********/

export abstract class V1_Auditing implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Auditing';

  abstract get hashCode(): string;
}

export class V1_NoAuditing extends V1_Auditing implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_AUDITING]);
  }
}

export class V1_DateTimeAuditing extends V1_Auditing implements Hashable {
  dateTimeField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_AUDITING,
      this.dateTimeField,
    ]);
  }
}

/**********
 * transaction milestoning
 **********/

export abstract class V1_TransactionMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_TransactionMilestoning';

  abstract get hashCode(): string;
}

export class V1_BatchIdTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  batchIdInName!: string;
  batchIdOutName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_TRANSACTION_MILESTONING,
      this.batchIdInName,
      this.batchIdOutName,
    ]);
  }
}

export class V1_DateTimeTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  dateTimeInName!: string;
  dateTimeOutName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_TRANSACTION_MILESTONING,
      this.dateTimeInName,
      this.dateTimeOutName,
    ]);
  }
}

export class V1_BatchIdAndDateTimeTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  batchIdInName!: string;
  batchIdOutName!: string;
  dateTimeInName!: string;
  dateTimeOutName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING,
      this.batchIdInName,
      this.batchIdOutName,
      this.dateTimeInName,
      this.dateTimeOutName,
    ]);
  }
}

/**********
 * validity milestoning
 **********/

export abstract class V1_ValidityMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_ValidityMilestoning';

  abstract get hashCode(): string;
}

export class V1_DateTimeValidityMilestoning
  extends V1_ValidityMilestoning
  implements Hashable
{
  dateTimeFromName!: string;
  dateTimeThruName!: string;
  derivation!: V1_ValidityDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_VALIDITY_MILESTONING,
      this.dateTimeFromName,
      this.dateTimeThruName,
      this.derivation,
    ]);
  }
}

// validity derivation

export abstract class V1_ValidityDerivation implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_ValidityDerivation';

  abstract get hashCode(): string;
}

export class V1_SourceSpecifiesFromDateTime
  extends V1_ValidityDerivation
  implements Hashable
{
  sourceDateTimeFromField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_DATE_TIME,
      this.sourceDateTimeFromField,
    ]);
  }
}

export class V1_SourceSpecifiesFromAndThruDateTime
  extends V1_ValidityDerivation
  implements Hashable
{
  sourceDateTimeFromField!: string;
  sourceDateTimeThruField!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME,
      this.sourceDateTimeFromField,
      this.sourceDateTimeThruField,
    ]);
  }
}
