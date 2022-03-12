import { type Hashable, hashArray } from '@finos/legend-shared';
import {
  V1_PackageableElement,
  type V1_PackageableElementVisitor,
} from '@finos/legend-graph';
import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../../DSLPersistence_ModelUtils';

/**********
 * persistence
 **********/

export class V1_Persistence extends V1_PackageableElement implements Hashable {
  documentation!: string;
  trigger!: V1_Trigger;
  reader!: V1_Reader;
  persister!: V1_Persister;
  notifier!: V1_Notifier;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE,
      this.documentation,
      this.trigger,
      this.reader,
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

export class V1_OpaqueTrigger extends V1_Trigger implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_TRIGGER]);
  }
}

/**********
 * reader
 **********/

export abstract class V1_Reader implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Reader';

  abstract get hashCode(): string;
}

export class V1_ServiceReader extends V1_Reader implements Hashable {
  service!: string;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.SERVICE_READER, this.service]);
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
  targetShape!: V1_TargetShape;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.STREAMING_PERSISTER,
      this.targetShape,
    ]);
  }
}

export class V1_BatchPersister extends V1_Persister implements Hashable {
  targetShape!: V1_TargetShape;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_PERSISTER,
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
  private readonly _$nominalTypeBrand!: 'Notifyee';

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
 * target shape
 **********/

export abstract class V1_TargetShape implements Hashable {
  private readonly _$nominalTypeBrand!: 'V1_Trigger';

  abstract get hashCode(): string;
}

export class V1_MultiFlatTarget extends V1_TargetShape implements Hashable {
  modelClass!: string;
  transactionScope!: V1_TransactionScope;
  parts: V1_PropertyAndFlatTarget[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET,
      this.modelClass,
      this.transactionScope,
      hashArray(this.parts),
    ]);
  }
}

export class V1_FlatTarget extends V1_TargetShape implements Hashable {
  modelClass!: string;
  targetName!: string;
  partitionProperties: string[] = [];
  deduplicationStrategy!: V1_DeduplicationStrategy;
  ingestMode!: V1_IngestMode;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FLAT_TARGET,
      this.modelClass,
      this.targetName,
      hashArray(this.partitionProperties),
      this.deduplicationStrategy,
      this.ingestMode,
    ]);
  }
}

export class V1_OpaqueTarget extends V1_TargetShape implements Hashable {
  targetName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OPAQUE_TARGET,
      this.targetName,
    ]);
  }
}

export class V1_PropertyAndFlatTarget implements Hashable {
  property!: string;
  flatTarget!: V1_FlatTarget;

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PROPERTY_AND_FLAT_TARGET,
      this.property,
      this.flatTarget,
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
  versionProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MAX_VERSION_DEDUPLICATION_STRATEGY,
      this.versionProperty,
    ]);
  }
}

export class V1_OpaqueDeduplicationStrategy
  extends V1_DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OPAQUE_DEDUPLICATION_STRATEGY,
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
  deleteProperty!: string;
  deleteValues: string[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DELETE_INDICATOR_MERGE_STRATEGY,
      this.deleteProperty,
      hashArray(this.deleteValues),
    ]);
  }
}

export class V1_OpaqueMergeStrategy
  extends V1_MergeStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_MERGE_STRATEGY]);
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
  dateTimeProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_AUDITING,
      this.dateTimeProperty,
    ]);
  }
}

export class V1_OpaqueAuditing extends V1_Auditing implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_AUDITING]);
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
  batchIdInFieldName!: string;
  batchIdOutFieldName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_TRANSACTION_MILESTONING,
      this.batchIdInFieldName,
      this.batchIdOutFieldName,
    ]);
  }
}

export class V1_DateTimeTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  dateTimeInFieldName!: string;
  dateTimeOutFieldName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_TRANSACTION_MILESTONING,
      this.dateTimeInFieldName,
      this.dateTimeOutFieldName,
    ]);
  }
}

export class V1_BatchIdAndDateTimeTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  batchIdInFieldName!: string;
  batchIdOutFieldName!: string;
  dateTimeInFieldName!: string;
  dateTimeOutFieldName!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.BATCH_ID_AND_DATE_TIME_TRANSACTION_MILESTONING,
      this.batchIdInFieldName,
      this.batchIdOutFieldName,
      this.dateTimeInFieldName,
      this.dateTimeOutFieldName,
    ]);
  }
}

export class V1_OpaqueTransactionMilestoning
  extends V1_TransactionMilestoning
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OPAQUE_TRANSACTION_MILESTONING,
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
  dateTimeFromFieldName!: string;
  dateTimeThruFieldName!: string;
  derivation!: V1_ValidityDerivation;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.DATE_TIME_VALIDITY_MILESTONING,
      this.dateTimeFromFieldName,
      this.dateTimeThruFieldName,
      this.derivation,
    ]);
  }
}

export class V1_OpaqueValidityMilestoning
  extends V1_ValidityMilestoning
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.OPAQUE_VALIDITY_MILESTONING]);
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
  sourceDateTimeFromProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_DATE_TIME,
      this.sourceDateTimeFromProperty,
    ]);
  }
}

export class V1_SourceSpecifiesFromAndThruDateTime
  extends V1_ValidityDerivation
  implements Hashable
{
  sourceDateTimeFromProperty!: string;
  sourceDateTimeThruProperty!: string;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.SOURCE_SPECIFIES_FROM_AND_THRU_DATE_TIME,
      this.sourceDateTimeFromProperty,
      this.sourceDateTimeThruProperty,
    ]);
  }
}
