import { PERSISTENCE_HASH_STRUCTURE } from '../../../../../DSLPersistence_ModelUtils';
import {
  Binding,
  Class,
  Connection,
  PackageableElement,
  PackageableElementReference,
  PackageableElementVisitor,
  Service,
} from '@finos/legend-graph';
import { type Hashable, hashArray } from '@finos/legend-shared';

/**********
 * persistence
 **********/

export class Persistence extends PackageableElement implements Hashable {
  documentation!: string;
  trigger!: Trigger;
  service!: PackageableElementReference<Service>;
  persister!: Persister;
  notifier!: Notifier;

  protected override get _elementHashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.PERSISTENCE,
      this.documentation,
      this.trigger,
      this.service.hashValue,
      this.persister,
      this.notifier,
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}

/**********
 * trigger
 **********/

export abstract class Trigger implements Hashable {
  private readonly _$nominalTypeBrand!: 'Trigger';

  abstract get hashCode(): string;
}

export class ManualTrigger extends Trigger implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.MANUAL_TRIGGER]);
  }
}

export class CronTrigger extends Trigger implements Hashable {
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

export abstract class Persister implements Hashable {
  private readonly _$nominalTypeBrand!: 'Persister';

  abstract get hashCode(): string;
}

export class StreamingPersister extends Persister implements Hashable {
  sink!: Sink;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.STREAMING_PERSISTER,
      this.sink,
    ]);
  }
}

export class BatchPersister extends Persister implements Hashable {
  sink!: Sink;
  ingestMode!: IngestMode;
  targetShape!: TargetShape;

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

export class Notifier implements Hashable {
  notifyees: Notifyee[] = [];

  get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NOTIFIER,
      hashArray(this.notifyees),
    ]);
  }
}

export abstract class Notifyee implements Hashable {
  private readonly _$nominalTypeBrand!: 'Notifyee';

  abstract get hashCode(): string;
}

export class EmailNotifyee extends Notifyee implements Hashable {
  address!: string;

  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.EMAIL_NOTIFYEE, this.address]);
  }
}

export class PagerDutyNotifyee extends Notifyee implements Hashable {
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

export abstract class Sink implements Hashable {
  private readonly _$nominalTypeBrand!: 'Sink';

  abstract get hashCode(): string;
}

export class RelationalSink extends Sink implements Hashable {
  connection?: Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.RELATIONAL_SINK,
      this.connection ?? '',
    ]);
  }
}

export class ObjectStorageSink extends Sink implements Hashable {
  binding!: PackageableElementReference<Binding>;
  connection!: Connection;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.OBJECT_STORAGE_SINK,
      this.binding.hashValue,
      this.connection,
    ]);
  }
}

/**********
 * target shape
 **********/

export abstract class TargetShape implements Hashable {
  private readonly _$nominalTypeBrand!: 'TargetShape';

  abstract get hashCode(): string;
}

export class FlatTarget extends TargetShape implements Hashable {
  modelClass?: PackageableElementReference<Class>;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: DeduplicationStrategy;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.FLAT_TARGET,
      this.modelClass?.hashValue ?? '',
      this.targetName,
      hashArray(this.partitionFields),
      this.deduplicationStrategy,
    ]);
  }
}

export class MultiFlatTarget extends TargetShape implements Hashable {
  modelClass!: PackageableElementReference<Class>;
  transactionScope!: TransactionScope;
  parts: MultiFlatTargetPart[] = [];

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.MULTI_FLAT_TARGET,
      this.modelClass.hashValue,
      this.transactionScope,
      hashArray(this.parts),
    ]);
  }
}

export class MultiFlatTargetPart implements Hashable {
  modelProperty!: string;
  targetName!: string;
  partitionFields: string[] = [];
  deduplicationStrategy!: DeduplicationStrategy;

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

export enum TransactionScope {
  SINGLE_TARGET = 'SINGLE_TARGET',
  ALL_TARGETS = 'ALL_TARGETS',
}

/**********
 * deduplication strategy
 **********/

export abstract class DeduplicationStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'DeduplicationStrategy';

  abstract get hashCode(): string;
}

export class NoDeduplicationStrategy
  extends DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DEDUPLICATION_STRATEGY]);
  }
}

export class AnyVersionDeduplicationStrategy
  extends DeduplicationStrategy
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.ANY_VERSION_DEDUPLICATION_STRATEGY,
    ]);
  }
}

export class MaxVersionDeduplicationStrategy
  extends DeduplicationStrategy
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

/**********
 * ingest mode
 **********/

export abstract class IngestMode implements Hashable {
  private readonly _$nominalTypeBrand!: 'IngestMode';

  abstract get hashCode(): string;
}

/**********
 * ingest mode - snapshot
 **********/

export class NontemporalSnapshot extends IngestMode implements Hashable {
  auditing!: Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_SNAPSHOT,
      this.auditing,
    ]);
  }
}

export class UnitemporalSnapshot extends IngestMode implements Hashable {
  transactionMilestoning!: TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_SNAPSHOT,
      this.transactionMilestoning,
    ]);
  }
}

export class BitemporalSnapshot extends IngestMode implements Hashable {
  transactionMilestoning!: TransactionMilestoning;
  validityMilestoning!: ValidityMilestoning;

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

export class NontemporalDelta extends IngestMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  auditing!: Auditing;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.NONTEMPORAL_DELTA,
      this.mergeStrategy,
      this.auditing,
    ]);
  }
}

export class UnitemporalDelta extends IngestMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  transactionMilestoning!: TransactionMilestoning;

  override get hashCode(): string {
    return hashArray([
      PERSISTENCE_HASH_STRUCTURE.UNITEMPORAL_DELTA,
      this.mergeStrategy,
      this.transactionMilestoning,
    ]);
  }
}

export class BitemporalDelta extends IngestMode implements Hashable {
  mergeStrategy!: MergeStrategy;
  transactionMilestoning!: TransactionMilestoning;
  validityMilestoning!: ValidityMilestoning;

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

export abstract class MergeStrategy implements Hashable {
  private readonly _$nominalTypeBrand!: 'MergeStrategy';

  abstract get hashCode(): string;
}

export class NoDeletesMergeStrategy extends MergeStrategy implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_DELETES_MERGE_STRATEGY]);
  }
}

export class DeleteIndicatorMergeStrategy
  extends MergeStrategy
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

export class AppendOnly extends IngestMode implements Hashable {
  auditing!: Auditing;
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

export abstract class Auditing implements Hashable {
  private readonly _$nominalTypeBrand!: 'Auditing';

  abstract get hashCode(): string;
}

export class NoAuditing extends Auditing implements Hashable {
  override get hashCode(): string {
    return hashArray([PERSISTENCE_HASH_STRUCTURE.NO_AUDITING]);
  }
}

export class DateTimeAuditing extends Auditing implements Hashable {
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

export abstract class TransactionMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'TransactionMilestoning';

  abstract get hashCode(): string;
}

export class BatchIdTransactionMilestoning
  extends TransactionMilestoning
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

export class DateTimeTransactionMilestoning
  extends TransactionMilestoning
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

export class BatchIdAndDateTimeTransactionMilestoning
  extends TransactionMilestoning
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

export abstract class ValidityMilestoning implements Hashable {
  private readonly _$nominalTypeBrand!: 'ValidityMilestoning';

  abstract get hashCode(): string;
}

export class DateTimeValidityMilestoning
  extends ValidityMilestoning
  implements Hashable
{
  dateTimeFromName!: string;
  dateTimeThruName!: string;
  derivation!: ValidityDerivation;

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

export abstract class ValidityDerivation implements Hashable {
  private readonly _$nominalTypeBrand!: 'ValidityDerivation';

  abstract get hashCode(): string;
}

export class SourceSpecifiesFromDateTime
  extends ValidityDerivation
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

export class SourceSpecifiesFromAndThruDateTime
  extends ValidityDerivation
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
